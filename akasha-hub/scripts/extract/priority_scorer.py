#!/usr/bin/env python3
"""
Akasha Priority Scorer
Calcula score multi-fator para priorizar conteudo mais valioso.
Roda 100% local — sem custo de API.

Schema real:
  files: id, file_name, file_ext, mime_type, file_size_bytes, niche, sub_niche,
         money_score, utility_score, status, file_modified_at, created_at, ...
  file_content: id, file_id, content_type, content, word_count, extraction_method, ...
"""
import os
import json
from datetime import datetime

from dotenv import load_dotenv
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from supabase import create_client


class PriorityScorer:
    """Score multi-fator para priorizar conteudo."""

    WEIGHTS = {
        "monetization": 0.30,
        "niche_relevance": 0.25,
        "recency": 0.15,
        "content_richness": 0.15,
        "format_value": 0.15,
    }

    PRIORITY_NICHES = {
        "marketing_digital": 1.0,
        "vendas": 0.95,
        "automacao": 0.90,
        "infoproduto": 0.85,
        "estetica": 0.80,
        "youtube": 0.75,
        "saude": 0.60,
        "financeiro": 0.55,
        "tecnologia": 0.50,
        "outro": 0.20,
    }

    FORMAT_VALUES = {
        "video": 1.0,
        "audio": 0.85,
        "pdf": 0.75,
        "document": 0.60,
        "spreadsheet": 0.50,
        "image": 0.30,
        "text": 0.40,
        "other": 0.20,
    }

    MONETIZATION_MAP = {
        "alto": 1.0,
        "medio": 0.6,
        "baixo": 0.25,
    }

    MIME_TO_FORMAT = {
        'application/pdf': 'pdf',
        'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video',
        'audio/mpeg': 'audio', 'audio/wav': 'audio',
        'text/plain': 'text', 'text/markdown': 'text', 'text/csv': 'text',
        'application/json': 'text',
        'image/jpeg': 'image', 'image/png': 'image',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
    }

    def __init__(self):
        url = os.environ.get("AKASHA_SUPABASE_URL")
        key = os.environ.get("AKASHA_SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Set AKASHA_SUPABASE_URL and AKASHA_SUPABASE_KEY")
        self.supabase = create_client(url, key)

    def _get_format(self, mime_type: str) -> str:
        """Get format category from MIME type."""
        if not mime_type:
            return 'other'
        return self.MIME_TO_FORMAT.get(mime_type, 'other')

    def score_file(self, file_record: dict, content_record: dict = None) -> dict:
        """Calcula score para um arquivo."""
        scores = {}

        # 1. Monetization potential (from money_score on files table, 1-10)
        money_score = file_record.get("money_score") or 1
        scores["monetization"] = min(money_score / 10.0, 1.0)

        # 2. Niche relevance (from niche on files table)
        niche = file_record.get("niche", "outro") or "outro"
        scores["niche_relevance"] = self.PRIORITY_NICHES.get(niche, 0.20)

        # 3. Recency
        modified = file_record.get("file_modified_at") or file_record.get("created_at")
        if modified:
            if isinstance(modified, str):
                try:
                    modified = datetime.fromisoformat(modified.replace("Z", "+00:00"))
                except ValueError:
                    modified = None
            if modified:
                days_old = (datetime.now(modified.tzinfo) - modified).days
                if days_old <= 180:
                    scores["recency"] = 1.0
                elif days_old <= 1095:
                    scores["recency"] = max(0.1, 1.0 - (days_old - 180) / 915)
                else:
                    scores["recency"] = 0.1
            else:
                scores["recency"] = 0.3
        else:
            scores["recency"] = 0.3

        # 4. Content richness (from word_count in file_content, or content length)
        if content_record:
            word_count = content_record.get("word_count") or 0
            content = content_record.get("content", "") or ""
            content_len = len(content) if not word_count else word_count * 5  # estimate
            if word_count > 10000 or content_len > 50000:
                scores["content_richness"] = 1.0
            elif word_count > 2000 or content_len > 10000:
                scores["content_richness"] = 0.8
            elif word_count > 400 or content_len > 2000:
                scores["content_richness"] = 0.6
            elif word_count > 100 or content_len > 500:
                scores["content_richness"] = 0.4
            else:
                scores["content_richness"] = 0.2
        else:
            scores["content_richness"] = 0.1

        # 5. Format value (from mime_type)
        mime_type = file_record.get("mime_type", "") or ""
        fmt = self._get_format(mime_type)
        scores["format_value"] = self.FORMAT_VALUES.get(fmt, 0.20)

        # Final weighted score
        final_score = sum(
            scores[factor] * weight
            for factor, weight in self.WEIGHTS.items()
        )

        return {
            "final_score": round(final_score, 4),
            "factors": {k: round(v, 3) for k, v in scores.items()},
            "tier": self._get_tier(final_score),
        }

    def _get_tier(self, score: float) -> str:
        if score >= 0.80: return "S-TIER"
        if score >= 0.65: return "A-TIER"
        if score >= 0.50: return "B-TIER"
        if score >= 0.35: return "C-TIER"
        return "D-TIER"

    def score_all_extracted(self, limit: int = 1000) -> dict:
        """Calcula scores para todos os arquivos extraidos."""
        files_resp = self.supabase.table("files").select(
            "id, file_name, mime_type, file_size_bytes, niche, money_score, utility_score, file_modified_at, created_at, status"
        ).eq("status", "extracted").limit(limit).execute()

        if not files_resp.data:
            print("Nenhum arquivo extraido encontrado.")
            return {"scored": 0}

        scored = 0
        tier_counts = {"S-TIER": 0, "A-TIER": 0, "B-TIER": 0, "C-TIER": 0, "D-TIER": 0}

        for file_rec in files_resp.data:
            # Get content record
            content_resp = self.supabase.table("file_content").select(
                "content, word_count"
            ).eq("file_id", file_rec["id"]).limit(1).execute()

            content_rec = content_resp.data[0] if content_resp.data else None
            result = self.score_file(file_rec, content_rec)

            # Store priority score on files table using utility_score field
            # (money_score = monetization from GPT, utility_score = our priority score * 10)
            priority_val = int(round(result["final_score"] * 10))
            self.supabase.table("files").update({
                "utility_score": priority_val,
                "description": (file_rec.get("description") or "") + f" [Tier: {result['tier']}]"
                    if result["tier"] in ("S-TIER", "A-TIER") else file_rec.get("description"),
            }).eq("id", file_rec["id"]).execute()

            tier_counts[result["tier"]] = tier_counts.get(result["tier"], 0) + 1
            scored += 1

        print(f"\nScoring Complete: {scored} files")
        print("-" * 40)
        for tier, count in sorted(tier_counts.items()):
            if count > 0:
                bar = "#" * min(count, 50)
                print(f"  {tier}: {count} {bar}")

        return {"scored": scored, "tiers": tier_counts}

    def get_top_content(self, limit: int = 20, niche: str = None) -> list:
        """Retorna top conteudos por score (utility_score)."""
        query = self.supabase.table("files").select(
            "id, file_name, niche, money_score, utility_score, mime_type"
        ).eq("status", "extracted").order("utility_score", desc=True).limit(limit)

        if niche:
            query = query.eq("niche", niche)

        results = query.execute()

        if not results.data:
            return []

        return [{
            "file_id": r["id"],
            "file_name": r.get("file_name", "?"),
            "score": (r.get("utility_score") or 0) / 10.0,
            "tier": self._get_tier((r.get("utility_score") or 0) / 10.0),
            "niche": r.get("niche", "outro"),
            "money_score": r.get("money_score", 0),
        } for r in results.data]


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Priority Scorer")
    parser.add_argument("--score-all", action="store_true", help="Score all extracted files")
    parser.add_argument("--top", type=int, default=20, help="Show top N content")
    parser.add_argument("--niche", default=None, help="Filter by niche")
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()
    scorer = PriorityScorer()

    if args.score_all:
        result = scorer.score_all_extracted(args.limit)
        if args.json:
            print(json.dumps(result, indent=2, default=str))
    else:
        top = scorer.get_top_content(args.top, args.niche)
        if args.json:
            print(json.dumps(top, indent=2, default=str))
        elif top:
            print(f"\nTop {len(top)} Content" + (f" (niche: {args.niche})" if args.niche else ""))
            print("-" * 60)
            for i, item in enumerate(top, 1):
                print(f"{i:2}. {item['tier']} [{item['score']:.3f}] {item['file_name']}")
                print(f"    {item['niche']} | money: {item['money_score']}")
        else:
            print("Nenhum conteudo encontrado. Execute --score-all primeiro.")


if __name__ == "__main__":
    main()
