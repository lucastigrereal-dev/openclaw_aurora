#!/usr/bin/env python3
"""
Akasha Oracle — RAG Q&A Engine
Responde perguntas usando a base de conhecimento como contexto.
Anti-alucinacao: so responde com base nos documentos encontrados.
"""
import os
import json
from datetime import datetime

from dotenv import load_dotenv
# Load .env from project root (3 levels up)
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from openai import OpenAI

# Import do query engine (mesmo diretorio)
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from query import AkashaQuery


class AkashaOracle:
    """RAG Q&A com anti-alucinacao."""

    MODELS = {
        "fast": "gpt-4o-mini",
        "balanced": "claude-3-5-haiku-20241022",
        "deep": "gpt-4o",
    }

    SYSTEM_PROMPT = """Voce e o Akasha Oracle, assistente de conhecimento do Instituto Rodovanski.

REGRAS CRITICAS:
1. Responda APENAS com base nos documentos fornecidos no contexto
2. Se a resposta nao estiver nos documentos, diga "Nao encontrei essa informacao na base de conhecimento"
3. NUNCA invente informacoes — cite o documento fonte
4. Quando citar, use [Fonte: nome_do_arquivo]
5. Se houver informacoes conflitantes entre documentos, mencione ambas
6. Responda em portugues brasileiro, tom profissional mas acessivel
7. Se a pergunta for vaga, peca esclarecimento

FORMATO DA RESPOSTA:
- Resposta direta e objetiva
- Citacoes das fontes usadas
- Nivel de confianca: ALTO (multiplas fontes), MEDIO (uma fonte), BAIXO (inferencia parcial)
"""

    def __init__(self, default_model: str = "fast"):
        self.query_engine = AkashaQuery()
        self.openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.default_model = default_model
        self.conversation_history = []

    def _select_model(self, complexity: str = None) -> str:
        """Seleciona modelo baseado na complexidade."""
        if complexity and complexity in self.MODELS:
            return self.MODELS[complexity]
        return self.MODELS[self.default_model]

    def _build_context(self, search_results: list, max_chars: int = 16000) -> str:
        """Constroi contexto dos documentos encontrados."""
        if not search_results:
            return "NENHUM DOCUMENTO RELEVANTE ENCONTRADO."

        context_parts = []
        total_chars = 0

        for i, result in enumerate(search_results):
            filename = result.get("filename", "unknown")
            file_type = result.get("file_type", "unknown")
            snippet = result.get("snippet", "")
            score = result.get("rrf_score") or result.get("score", 0)

            header = f"--- DOCUMENTO {i+1}: {filename} ({file_type}) [Relevancia: {score:.3f}] ---"

            remaining = max_chars - total_chars - len(header) - 50
            if remaining <= 0:
                break

            content = snippet[:remaining] if snippet else "(sem conteudo extraido)"

            block = f"{header}\n{content}\n"
            context_parts.append(block)
            total_chars += len(block)

        return "\n".join(context_parts)

    def ask(self, question: str, complexity: str = None,
            search_limit: int = 5, search_mode: str = "hybrid") -> dict:
        """
        Faz uma pergunta ao Oracle.
        """
        start_time = datetime.now()

        # 1. Buscar documentos relevantes
        search_results = self.query_engine.search(question, mode=search_mode, limit=search_limit)

        if not search_results:
            return {
                "answer": "Nao encontrei documentos relevantes para essa pergunta na base Akasha.",
                "sources": [],
                "confidence": "NENHUMA",
                "model_used": "none",
                "search_results_count": 0,
                "cost_estimate": 0.0001,
            }

        # 2. Construir contexto
        context = self._build_context(search_results)

        # 3. Auto-detect complexity
        if not complexity:
            if len(question) > 200 or "analise" in question.lower() or "compare" in question.lower():
                complexity = "balanced"
            else:
                complexity = "fast"

        model = self._select_model(complexity)

        # 4. Montar mensagens
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": f"""CONTEXTO DOS DOCUMENTOS:
{context}

PERGUNTA DO USUARIO:
{question}

Responda baseado APENAS nos documentos acima. Cite as fontes."""}
        ]

        # Adicionar historico se houver (multi-turn)
        if self.conversation_history:
            history_msgs = self.conversation_history[-6:]
            messages = [messages[0]] + history_msgs + [messages[1]]

        # 5. Chamar LLM
        try:
            response = self.openai.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=1500,
            )

            answer = response.choices[0].message.content

            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens

            cost_rates = {
                "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
                "gpt-4o": {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
            }

            rates = cost_rates.get(model, cost_rates["gpt-4o-mini"])
            cost = input_tokens * rates["input"] + output_tokens * rates["output"]
            cost += 0.0001

        except Exception as e:
            return {
                "answer": f"Erro ao consultar LLM: {str(e)}",
                "sources": [],
                "confidence": "ERRO",
                "model_used": model,
                "search_results_count": len(search_results),
                "cost_estimate": 0.0001,
            }

        # 6. Extrair fontes citadas
        sources = []
        for r in search_results:
            fn = r.get("filename", "")
            if fn and fn.lower() in answer.lower():
                sources.append(fn)

        if not sources:
            sources = [r.get("filename", "unknown") for r in search_results[:3]]

        # 7. Determinar confianca
        if len(search_results) >= 3 and any(
            (r.get("rrf_score") or r.get("score", 0)) > 0.01 for r in search_results
        ):
            confidence = "ALTO"
        elif len(search_results) >= 1:
            confidence = "MEDIO"
        else:
            confidence = "BAIXO"

        # 8. Salvar no historico
        self.conversation_history.append({"role": "user", "content": question})
        self.conversation_history.append({"role": "assistant", "content": answer})

        elapsed = (datetime.now() - start_time).total_seconds()

        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence,
            "model_used": model,
            "search_results_count": len(search_results),
            "cost_estimate": round(cost, 6),
            "elapsed_seconds": round(elapsed, 2),
        }

    def format_answer(self, result: dict) -> str:
        """Formata resposta para exibicao."""
        lines = [
            "AKASHA ORACLE",
            "=" * 50,
            "",
            result["answer"],
            "",
            "-" * 50,
            f"Confianca: {result['confidence']}",
            f"Fontes: {', '.join(result['sources'][:5])}",
            f"Modelo: {result['model_used']}",
            f"Custo: ${result['cost_estimate']:.4f}",
            f"Tempo: {result.get('elapsed_seconds', '?')}s",
        ]
        return "\n".join(lines)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Oracle — RAG Q&A")
    parser.add_argument("question", nargs="?", help="Your question")
    parser.add_argument("--complexity", choices=["fast", "balanced", "deep"], default=None)
    parser.add_argument("--limit", type=int, default=5, help="Search result limit")
    parser.add_argument("--mode", default="hybrid", choices=["keyword", "semantic", "hybrid"])
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()
    oracle = AkashaOracle()

    if args.question:
        result = oracle.ask(args.question, args.complexity, args.limit, args.mode)

        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(oracle.format_answer(result))
    else:
        print("Usage: python oracle.py 'sua pergunta' [--complexity fast] [--json]")


if __name__ == "__main__":
    main()
