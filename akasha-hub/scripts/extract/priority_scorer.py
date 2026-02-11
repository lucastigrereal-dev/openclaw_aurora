#!/usr/bin/env python3
"""
Akasha Priority Scorer
Calcula score multi-fator para priorizar conteudo mais valioso.
Roda 100% local — sem custo de API.
"""
import os
import json
from datetime import datetime
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

    def __init__(self):
        url = os.environ.get("AKASHA_SUPABASE_URL")
        key = os.environ.get("AKASHA_SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Set AKASHA_SUPABASE_URL and AKASHA_SUPABASE_KEY")
        self.supabase = create_client(url, key)

    def score_file(self, file_record: dict, content_record: dict = None) -> dict:
        """Calcula score para um arquivo."""
        scores = {}

        # 1. Monetization potential
        if content_record and content_record.get("metadata"):
            meta = content_record["metadata"]
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except (json.JSONDecodeError, TypeError):
                    meta = {}
            monetization = meta.get("monetization_potential", "baixo")
            scores["monetization"] = self.MONETIZATION_MAP.get(monetization, 0.25)
        else:
            scores["monetization"] = 0.25

        # 2. Niche relevance
        if content_record and content_record.get("metadata"):
            meta = content_record["metadata"] if isinstance(content_record["metadata"], dict) else {}
            niche = meta.get("primary_niche", "outro")
            scores["niche_relevance"] = self.PRIORITY_NICHES.get(niche, 0.20)
        else:
            scores["niche_relevance"] = 0.20

        # 3. Recency
        modified = file_record.get("modified_at") or file_record.get("created_at")
        if modified:
            if isinstance(modified, str):
                modified = datetime.fromisoformat(modified.replace("Z", "+00:00"))
            days_old = (datetime.now(modified.tzinfo) - modified).days
            if days_old <= 180:
                scores["recency"] = 1.0
            elif days_old <= 1095:
                scores["recency"] = max(0.1, 1.0 - (days_old - 180) / 915)
            else:
                scores["recency"] = 0.1
        else:
            scores["recency"] = 0.3

        # 4. Content richness
        if content_record and content_record.get("content_text"):
            content_len = len(content_record["content_text"])
            if content_len > 50000:
                scores["content_richness"] = 1.0
            elif content_len > 10000:
                scores["content_richness"] = 0.8
            elif content_len > 2000:
                scores["content_richness"] = 0.6
            elif content_len > 500:
                scores["content_richness"] = 0.4
            else:
                scores["content_richness"] = 0.2
        else:
            scores["content_richness"] = 0.1

        # 5. Format value
        file_type = file_record.get("file_type", "other")
        scores["format_value"] = self.FORMAT_VALUES.get(file_type, 0.20)

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
            "id, filename, file_type, file_size, modified_date, created_at, status"
        ).eq("status", "extracted").limit(limit).execute()

        if not files_resp.data:
            print("Nenhum arquivo extraido encontrado.")
            return {"scored": 0}

        scored = 0
        tier_counts = {"S-TIER": 0, "A-TIER": 0, "B-TIER": 0, "C-TIER": 0, "D-TIER": 0}

        for file_rec in files_resp.data:
            content_resp = self.supabase.table("file_content").select(
                "content_text, metadata"
            ).eq("file_id", file_rec["id"]).limit(1).execute()

            content_rec = content_resp.data[0] if content_resp.data else None
            result = self.score_file(file_rec, content_rec)

            if content_rec:
                meta = content_rec.get("metadata", {}) or {}
                if isinstance(meta, str):
                    try:
                        meta = json.loads(meta)
                    except (json.JSONDecodeError, TypeError):
                        meta = {}

                meta["priority_score"] = result["final_score"]
                meta["priority_tier"] = result["tier"]
                meta["priority_factors"] = result["factors"]
                meta["scored_at"] = datetime.now().isoformat()

                self.supabase.table("file_content").update(
                    {"metadata": meta}
                ).eq("file_id", file_rec["id"]).execute()

            tier_counts[result["tier"]] = tier_counts.get(result["tier"], 0) + 1
            scored += 1

        print(f"\n📊 Scoring Complete: {scored} files")
        print("-" * 40)
        for tier, count in sorted(tier_counts.items(), key=lambda x: -x[1]):
            if count > 0:
                bar = "#" * count
                print(f"  {tier}: {count} {bar}")

        return {"scored": scored, "tiers": tier_counts}

    def get_top_content(self, limit: int = 20, niche: str = None) -> list:
        """Retorna top conteudos por score."""
        query = self.supabase.table("file_content").select(
            "file_id, metadata"
        ).not_.is_("metadata", "null").limit(500)

        results = query.execute()

        if not results.data:
            return []

        scored = []
        for r in results.data:
            meta = r.get("metadata", {})
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except (json.JSONDecodeError, TypeError):
                    continue

            score = meta.get("priority_score", 0)
            primary_niche = meta.get("primary_niche", "outro")

            if niche and primary_niche != niche:
                continue

            scored.append({
                "file_id": r["file_id"],
                "score": score,
                "tier": meta.get("priority_tier", "?"),
                "niche": primary_niche,
                "monetization": meta.get("monetization_potential", "?"),
            })

        scored.sort(key=lambda x: -x["score"])
        return scored[:limit]


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Priority Scorer")
    parser.add_argument("--score-all", action="store_true", help="Score all extracted files")
    parser.add_argument("--top", type=int, default=20, help="Show top N content")
    parser.add_argument("--niche", default=None, help="Filter by niche")
    parser.add_argument("--limit", type=int, default=1000)

    args = parser.parse_args()
    scorer = PriorityScorer()

    if args.score_all:
        scorer.score_all_extracted(args.limit)
    else:
        top = scorer.get_top_content(args.top, args.niche)
        if top:
            print(f"\nTop {len(top)} Content" + (f" (niche: {args.niche})" if args.niche else ""))
            print("-" * 60)
            for i, item in enumerate(top, 1):
                print(f"{i:2}. {item['tier']} [{item['score']:.3f}] {item['file_id']}")
                print(f"    {item['niche']} | monetization: {item['monetization']}")
        else:
            print("Nenhum conteudo encontrado. Execute --score-all primeiro.")


if __name__ == "__main__":
    main()
