#!/usr/bin/env python3
"""
Akasha Query Engine
Busca hibrida: keyword (ILIKE) + semantica (pgvector) + fusao RRF.

Schema real:
  files: id, file_name, file_ext, mime_type, file_size_bytes, niche, ...
  file_content: id, file_id, content_type, content, word_count, extraction_method, ...
  file_embeddings: id, file_id, chunk_index, chunk_text, embedding, model, ...
"""
import os
import json

from dotenv import load_dotenv
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from openai import OpenAI
from supabase import create_client


class AkashaQuery:
    """Motor de busca hibrida para a base Akasha."""

    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS = 1536

    def __init__(self):
        url = os.environ.get("AKASHA_SUPABASE_URL")
        key = os.environ.get("AKASHA_SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Set AKASHA_SUPABASE_URL and AKASHA_SUPABASE_KEY")

        self.supabase = create_client(url, key)
        self.openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    def _get_embedding(self, text: str) -> list:
        """Gera embedding para a query."""
        response = self.openai.embeddings.create(
            model=self.EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding

    def search_keyword(self, query: str, limit: int = 20) -> list:
        """Busca por keyword usando ILIKE no file_content.content."""
        content_results = self.supabase.table("file_content").select(
            "file_id, content, content_type"
        ).ilike("content", f"%{query}%").limit(limit).execute()

        results = []
        for r in (content_results.data or []):
            # Get file info
            file_info = self.supabase.table("files").select(
                "file_name, mime_type, file_size_bytes, niche"
            ).eq("id", r["file_id"]).limit(1).execute()

            fname = file_info.data[0] if file_info.data else {}

            results.append({
                "file_id": r["file_id"],
                "filename": fname.get("file_name", "unknown"),
                "file_type": fname.get("mime_type", "unknown"),
                "niche": fname.get("niche", ""),
                "snippet": self._extract_snippet(r.get("content", ""), query),
                "score": 0.5,
                "match_type": "keyword",
            })

        return results

    def search_semantic(self, query: str, limit: int = 20, threshold: float = 0.3) -> list:
        """Busca semantica via pgvector (file_embeddings)."""
        query_embedding = self._get_embedding(query)

        results = self.supabase.rpc("search_embeddings", {
            "query_embedding": query_embedding,
            "match_threshold": threshold,
            "match_count": limit,
        }).execute()

        if not results.data:
            return []

        return [{
            "file_id": r.get("file_id"),
            "filename": r.get("file_name", "unknown"),
            "file_type": r.get("mime_type", "unknown"),
            "snippet": (r.get("chunk_text", "") or "")[:2000],
            "score": round(r.get("similarity", 0), 4),
            "match_type": "semantic",
        } for r in results.data]

    def search_hybrid(self, query: str, limit: int = 10,
                       keyword_weight: float = 0.4, semantic_weight: float = 0.6) -> list:
        """Busca hibrida com Reciprocal Rank Fusion (RRF)."""
        keyword_results = self.search_keyword(query, limit=limit * 2)
        semantic_results = self.search_semantic(query, limit=limit * 2)

        k = 60  # RRF constant
        rrf_scores = {}

        for rank, result in enumerate(keyword_results):
            file_id = result.get("file_id", "")
            if file_id:
                if file_id not in rrf_scores:
                    rrf_scores[file_id] = {"data": result, "rrf": 0}
                rrf_scores[file_id]["rrf"] += keyword_weight * (1 / (k + rank))
                rrf_scores[file_id]["data"]["match_types"] = ["keyword"]

        for rank, result in enumerate(semantic_results):
            file_id = result.get("file_id", "")
            if file_id:
                if file_id not in rrf_scores:
                    rrf_scores[file_id] = {"data": result, "rrf": 0}
                rrf_scores[file_id]["rrf"] += semantic_weight * (1 / (k + rank))

                match_types = rrf_scores[file_id]["data"].get("match_types", [])
                if "semantic" not in match_types:
                    match_types.append("semantic")
                rrf_scores[file_id]["data"]["match_types"] = match_types

        sorted_results = sorted(rrf_scores.values(), key=lambda x: -x["rrf"])

        final = []
        for item in sorted_results[:limit]:
            data = item["data"]
            data["rrf_score"] = round(item["rrf"], 6)
            data["match_type"] = "+".join(data.get("match_types", ["unknown"]))
            final.append(data)

        return final

    def _extract_snippet(self, content: str, query: str, context: int = 500) -> str:
        """Extrai snippet ao redor da primeira ocorrencia da query."""
        if not content:
            return ""

        lower_content = content.lower()
        lower_query = query.lower()
        pos = lower_content.find(lower_query)

        if pos == -1:
            return content[:300]

        start = max(0, pos - context)
        end = min(len(content), pos + len(query) + context)
        snippet = content[start:end]

        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."

        return snippet

    def search(self, query: str, mode: str = "hybrid", limit: int = 10, **kwargs) -> list:
        """Interface unificada de busca."""
        if mode == "keyword":
            return self.search_keyword(query, limit)
        elif mode == "semantic":
            return self.search_semantic(query, limit, kwargs.get("threshold", 0.3))
        elif mode == "hybrid":
            return self.search_hybrid(query, limit)
        else:
            raise ValueError(f"Mode invalido: {mode}. Use: keyword, semantic, hybrid")

    def format_results(self, results: list, verbose: bool = False) -> str:
        """Formata resultados para exibicao."""
        if not results:
            return "Nenhum resultado encontrado."

        lines = [f"{len(results)} resultados encontrados\n{'─' * 50}"]

        for i, r in enumerate(results, 1):
            score = r.get("rrf_score") or r.get("score", 0)
            match_type = r.get("match_type", "?")
            filename = r.get("filename", "unknown")
            file_type = r.get("file_type", "?")

            lines.append(f"\n{i}. {filename} [{file_type}]")
            lines.append(f"   Score: {score:.4f} | Match: {match_type}")

            if verbose and r.get("snippet"):
                snippet = r["snippet"][:200].replace("\n", " ")
                lines.append(f"   Preview: {snippet}")

            if r.get("niche"):
                lines.append(f"   Niche: {r['niche']}")

        return "\n".join(lines)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Query Engine")
    parser.add_argument("query", nargs="?", help="Search query")
    parser.add_argument("--mode", default="hybrid", choices=["keyword", "semantic", "hybrid"])
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if not args.query:
        print("Usage: python query.py 'sua busca aqui' [--mode hybrid] [--limit 10]")
        return

    engine = AkashaQuery()
    results = engine.search(args.query, mode=args.mode, limit=args.limit)

    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        print(engine.format_results(results, verbose=args.verbose))


if __name__ == "__main__":
    main()
