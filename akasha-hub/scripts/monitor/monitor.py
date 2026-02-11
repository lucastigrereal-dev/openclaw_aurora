#!/usr/bin/env python3
"""
Akasha Monitor — Painel de Controle em Tempo Real
Monitora todo o sistema OpenClaw Aurora: scan, extracoes, DB, processos.
Permite comandos remotos via Telegram.

Schema real:
  files: id, source_id, file_path, file_name, file_ext, mime_type, file_size_bytes,
         file_hash, title, description, language, niche, sub_niche, tags,
         money_score, utility_score, status, error_message, gdrive_id,
         gdrive_parent_id, gdrive_web_link, file_modified_at, processed_at, created_at, updated_at
  file_content: id, file_id, content_type, content, word_count, extraction_method, extraction_cost, created_at
  file_embeddings: id, file_id, chunk_index, chunk_text, embedding, model, created_at
  scan_jobs: id, source_id, status, total_files, processed_files, skipped_files, error_files,
             total_cost_usd, cost_limit_usd, last_checkpoint, started_at, finished_at, error_log
  processing_queue: id, file_id, priority, job_type, status, attempts, max_attempts,
                    error_message, created_at, started_at, finished_at
  sources: id, name, source_type, base_path, config, last_scan_at, created_at
"""
import os
import json
import platform
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from supabase import create_client


class AkashaMonitor:
    """Painel de controle geral do sistema."""

    def __init__(self):
        url = os.environ.get("AKASHA_SUPABASE_URL")
        key = os.environ.get("AKASHA_SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Set AKASHA_SUPABASE_URL and AKASHA_SUPABASE_KEY")
        self.supabase = create_client(url, key)
        self.checkpoint_path = Path.home() / '.openclaw/hubs/akasha/checkpoints/scan_checkpoint.json'

    # ============================================
    # STATUS GERAL DO SISTEMA
    # ============================================
    def system_status(self) -> dict:
        """Status completo: DB, scan, disco, sistema."""
        return {
            "timestamp": datetime.now().isoformat(),
            "system": self._system_info(),
            "database": self._db_stats(),
            "scan": self._scan_status(),
            "extraction": self._extraction_stats(),
            "embeddings": self._embedding_stats(),
            "queue": self._queue_stats(),
        }

    def format_status(self, status: dict) -> str:
        """Formata status para Telegram/terminal."""
        db = status["database"]
        scan = status["scan"]
        ext = status["extraction"]
        emb = status["embeddings"]
        queue = status["queue"]
        sys_info = status["system"]

        lines = [
            "OPENCLAW AURORA - PAINEL DE CONTROLE",
            "=" * 42,
            "",
            "SISTEMA",
            f"  OS: {sys_info['os']}",
            f"  Disco: {sys_info['disk_free_gb']:.1f}GB livre de {sys_info['disk_total_gb']:.1f}GB",
            f"  CPU: {sys_info.get('cpu_count', '?')} cores",
            "",
            "BANCO DE DADOS (Supabase)",
            f"  Total arquivos: {db['total_files']:,}",
        ]

        for s_name, s_count in db.get("by_status", {}).items():
            if s_count > 0:
                lines.append(f"    {s_name}: {s_count:,}")

        if db.get("total_size_gb", 0) > 0:
            lines.append(f"  Tamanho total: {db['total_size_gb']:.2f}GB")

        lines.append("")
        lines.append("TIPOS DE ARQUIVO (top)")
        for ext_name, count in sorted(db.get("by_ext", {}).items(), key=lambda x: -x[1])[:15]:
            if count > 0:
                lines.append(f"  .{ext_name}: {count:,}")

        lines.extend([
            "",
            "NICHES",
        ])
        for niche, count in sorted(db.get("by_niche", {}).items(), key=lambda x: -x[1]):
            if count > 0:
                lines.append(f"  {niche}: {count:,}")

        lines.extend([
            "",
            "SCAN (Google Drive)",
            f"  Ultimo scan: {scan.get('last_scan', 'nunca')}",
            f"  IDs no checkpoint: {scan.get('scanned_count', 0):,}",
        ])

        if scan.get("scan_jobs"):
            for job in scan["scan_jobs"][:3]:
                lines.append(f"  Job {job['id']}: {job['status']} ({job.get('processed_files', 0)}/{job.get('total_files', '?')} files)")

        lines.extend([
            "",
            "EXTRACAO (file_content)",
            f"  Conteudos extraidos: {ext.get('content_count', 0):,}",
            f"  Custo total: ${ext.get('total_cost', 0):.4f}",
            f"  Palavras totais: {ext.get('total_words', 0):,}",
            "",
            "EMBEDDINGS",
            f"  Chunks indexados: {emb.get('chunk_count', 0):,}",
            "",
            "FILA DE PROCESSAMENTO",
            f"  Pendentes: {queue.get('pending', 0):,}",
            f"  Processando: {queue.get('processing', 0):,}",
            f"  Completos: {queue.get('completed', 0):,}",
            f"  Erros: {queue.get('failed', 0):,}",
            "",
            f"Atualizado: {status['timestamp'][:19]}",
        ])

        return "\n".join(lines)

    # ============================================
    # RELATORIOS DETALHADOS
    # ============================================
    def report_files(self, limit: int = 20, status_filter: str = None,
                     mime_filter: str = None, sort: str = "created_at") -> dict:
        """Relatorio de arquivos com filtros."""
        query = self.supabase.table("files").select(
            "id, file_name, mime_type, file_size_bytes, status, created_at, file_ext, niche, money_score"
        )

        if status_filter:
            query = query.eq("status", status_filter)
        if mime_filter:
            query = query.ilike("mime_type", f"%{mime_filter}%")

        query = query.order(sort, desc=True).limit(limit)
        result = query.execute()

        files = []
        total_size = 0
        for f in (result.data or []):
            size = f.get("file_size_bytes", 0) or 0
            total_size += size
            files.append({
                "id": f.get("id"),
                "name": f.get("file_name", "?"),
                "type": f.get("mime_type", "?"),
                "ext": f.get("file_ext", "?"),
                "size_mb": round(size / 1024 / 1024, 2),
                "status": f.get("status", "?"),
                "niche": f.get("niche", ""),
                "money_score": f.get("money_score"),
                "created": (f.get("created_at", "") or "")[:16],
            })

        return {
            "count": len(files),
            "total_size_mb": round(total_size / 1024 / 1024, 1),
            "files": files,
        }

    def report_top_content(self, limit: int = 10, niche: str = None) -> dict:
        """Top conteudos por money_score."""
        query = self.supabase.table("files").select(
            "id, file_name, niche, money_score, utility_score, mime_type, file_size_bytes"
        ).not_.is_("money_score", "null")

        if niche:
            query = query.eq("niche", niche)

        result = query.order("money_score", desc=True).limit(limit).execute()

        items = []
        for f in (result.data or []):
            items.append({
                "id": f["id"],
                "name": f.get("file_name", "?"),
                "niche": f.get("niche", "?"),
                "money_score": f.get("money_score", 0),
                "utility_score": f.get("utility_score", 0),
                "type": f.get("mime_type", "?"),
                "size_mb": round((f.get("file_size_bytes", 0) or 0) / 1024 / 1024, 2),
            })

        return {"count": len(items), "items": items}

    def report_errors(self, limit: int = 20) -> dict:
        """Relatorio de arquivos com erro."""
        result = self.supabase.table("files").select(
            "id, file_name, mime_type, error_message, updated_at"
        ).eq("status", "error").order("updated_at", desc=True).limit(limit).execute()

        errors = []
        for f in (result.data or []):
            errors.append({
                "id": f.get("id"),
                "name": f.get("file_name", "?"),
                "type": f.get("mime_type", "?"),
                "error": f.get("error_message", "sem detalhes"),
                "when": (f.get("updated_at", "") or "")[:16],
            })

        return {"count": len(errors), "errors": errors}

    def report_recent(self, hours: int = 24) -> dict:
        """Atividade das ultimas N horas."""
        since = (datetime.now() - timedelta(hours=hours)).isoformat()

        new_files = self.supabase.table("files").select(
            "id", count="exact"
        ).gt("created_at", since).execute()

        extracted = self.supabase.table("file_content").select(
            "id", count="exact"
        ).gt("created_at", since).execute()

        errors = self.supabase.table("files").select(
            "id", count="exact"
        ).eq("status", "error").gt("updated_at", since).execute()

        new_embeddings = self.supabase.table("file_embeddings").select(
            "id", count="exact"
        ).gt("created_at", since).execute()

        return {
            "period_hours": hours,
            "since": since[:16],
            "new_files_added": new_files.count or 0,
            "contents_extracted": extracted.count or 0,
            "new_embeddings": new_embeddings.count or 0,
            "errors": errors.count or 0,
        }

    # ============================================
    # COMANDOS DE ACAO
    # ============================================
    def retry_errors(self, limit: int = 50) -> dict:
        """Reseta arquivos com erro para reprocessamento."""
        result = self.supabase.table("files").select("id").eq(
            "status", "error"
        ).limit(limit).execute()

        if not result.data:
            return {"reset": 0, "message": "Nenhum arquivo com erro encontrado."}

        ids = [r["id"] for r in result.data]
        self.supabase.table("files").update({
            "status": "cataloged",
            "error_message": None,
        }).in_("id", ids).execute()

        return {
            "reset": len(ids),
            "message": f"{len(ids)} arquivos resetados para reprocessamento.",
        }

    def clear_checkpoint(self) -> dict:
        """Limpa checkpoint do scanner (permite rescan completo)."""
        if self.checkpoint_path.exists():
            backup = self.checkpoint_path.with_suffix('.json.bak')
            shutil.copy2(self.checkpoint_path, backup)
            self.checkpoint_path.unlink()
            return {"cleared": True, "backup": str(backup)}
        return {"cleared": False, "message": "Nenhum checkpoint encontrado."}

    def niche_summary(self) -> dict:
        """Resume distribuicao por nicho (from files table)."""
        niches = {}
        for niche_name in ["estetica", "marketing_digital", "youtube", "infoproduto",
                           "automacao", "vendas", "saude", "financeiro", "tecnologia"]:
            resp = self.supabase.table("files").select(
                "id", count="exact"
            ).eq("niche", niche_name).execute()
            if resp.count and resp.count > 0:
                niches[niche_name] = resp.count

        # Count null/empty niches
        resp = self.supabase.table("files").select(
            "id", count="exact"
        ).is_("niche", "null").execute()
        if resp.count:
            niches["sem_nicho"] = resp.count

        return {"niches": dict(sorted(niches.items(), key=lambda x: -x[1]))}

    def scan_jobs(self, limit: int = 5) -> dict:
        """Lista scan jobs recentes."""
        result = self.supabase.table("scan_jobs").select("*").order(
            "started_at", desc=True
        ).limit(limit).execute()

        jobs = []
        for j in (result.data or []):
            jobs.append({
                "id": j.get("id"),
                "status": j.get("status"),
                "total_files": j.get("total_files"),
                "processed": j.get("processed_files"),
                "skipped": j.get("skipped_files"),
                "errors": j.get("error_files"),
                "cost_usd": j.get("total_cost_usd"),
                "started": (j.get("started_at", "") or "")[:16],
                "finished": (j.get("finished_at", "") or "")[:16],
            })

        return {"count": len(jobs), "jobs": jobs}

    def queue_status(self) -> dict:
        """Status detalhado da fila de processamento."""
        statuses = {}
        for s in ["pending", "processing", "completed", "failed"]:
            resp = self.supabase.table("processing_queue").select(
                "id", count="exact"
            ).eq("status", s).execute()
            statuses[s] = resp.count or 0

        # Recent queue items
        recent = self.supabase.table("processing_queue").select(
            "id, file_id, priority, job_type, status, attempts, error_message"
        ).order("created_at", desc=True).limit(10).execute()

        return {
            "statuses": statuses,
            "recent": recent.data or [],
        }

    # ============================================
    # HELPERS INTERNOS
    # ============================================
    def _system_info(self) -> dict:
        info = {
            "os": f"{platform.system()} {platform.release()}",
            "cpu_count": os.cpu_count(),
        }
        try:
            usage = shutil.disk_usage(Path.home())
            info["disk_total_gb"] = usage.total / (1024**3)
            info["disk_free_gb"] = usage.free / (1024**3)
            info["disk_used_pct"] = round(usage.used / usage.total * 100, 1)
        except Exception:
            info["disk_total_gb"] = 0
            info["disk_free_gb"] = 0
        return info

    def _db_stats(self) -> dict:
        stats = {"total_files": 0, "by_status": {}, "by_ext": {}, "by_niche": {}, "total_size_gb": 0}

        # By status
        for s in ["cataloged", "processing", "extracted", "error"]:
            resp = self.supabase.table("files").select("id", count="exact").eq("status", s).execute()
            count = resp.count or 0
            stats["by_status"][s] = count
            stats["total_files"] += count

        # Top extensions
        top_exts = self.supabase.table("files").select(
            "file_ext"
        ).limit(1000).execute()

        ext_counts = {}
        for r in (top_exts.data or []):
            ext = r.get("file_ext", "?") or "?"
            ext_counts[ext] = ext_counts.get(ext, 0) + 1
        stats["by_ext"] = dict(sorted(ext_counts.items(), key=lambda x: -x[1])[:15])

        # By niche (non-null only)
        for niche_name in ["estetica", "marketing_digital", "youtube", "vendas", "tecnologia"]:
            resp = self.supabase.table("files").select("id", count="exact").eq("niche", niche_name).execute()
            if resp.count and resp.count > 0:
                stats["by_niche"][niche_name] = resp.count

        return stats

    def _scan_status(self) -> dict:
        result = {"last_scan": "nunca", "scanned_count": 0, "scan_jobs": []}

        if self.checkpoint_path.exists():
            with open(self.checkpoint_path) as f:
                cp = json.load(f)
            result["last_scan"] = cp.get("last_scan", "?")
            result["scanned_count"] = len(cp.get("scanned_ids", []))

        # Recent scan jobs
        jobs = self.supabase.table("scan_jobs").select(
            "id, status, total_files, processed_files, started_at"
        ).order("started_at", desc=True).limit(3).execute()
        result["scan_jobs"] = jobs.data or []

        return result

    def _extraction_stats(self) -> dict:
        count_resp = self.supabase.table("file_content").select("id", count="exact").execute()

        # Sum extraction costs
        cost_resp = self.supabase.table("file_content").select(
            "extraction_cost, word_count"
        ).limit(1000).execute()

        total_cost = 0
        total_words = 0
        for r in (cost_resp.data or []):
            total_cost += (r.get("extraction_cost") or 0)
            total_words += (r.get("word_count") or 0)

        return {
            "content_count": count_resp.count or 0,
            "total_cost": round(total_cost, 4),
            "total_words": total_words,
        }

    def _embedding_stats(self) -> dict:
        resp = self.supabase.table("file_embeddings").select("id", count="exact").execute()
        return {"chunk_count": resp.count or 0}

    def _queue_stats(self) -> dict:
        stats = {}
        for s in ["pending", "processing", "completed", "failed"]:
            resp = self.supabase.table("processing_queue").select(
                "id", count="exact"
            ).eq("status", s).execute()
            stats[s] = resp.count or 0
        return stats


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Monitor - Painel de Controle")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["status", "report", "top", "errors", "recent",
                                "niches", "jobs", "queue",
                                "retry-errors", "clear-checkpoint"])
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--status-filter", default=None)
    parser.add_argument("--mime-filter", default=None)
    parser.add_argument("--niche", default=None)
    parser.add_argument("--hours", type=int, default=24)
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()
    monitor = AkashaMonitor()

    if args.command == "status":
        result = monitor.system_status()
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(monitor.format_status(result))

    elif args.command == "report":
        result = monitor.report_files(args.limit, args.status_filter, args.mime_filter)
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(f"\nRELATORIO DE ARQUIVOS ({result['count']} items, {result['total_size_mb']}MB)")
            print("-" * 70)
            for f in result["files"]:
                print(f"  {f['name'][:40]:40s} .{f['ext']:5s} {f['size_mb']:8.1f}MB  {f['status']}")

    elif args.command == "top":
        result = monitor.report_top_content(args.limit, args.niche)
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(f"\nTOP CONTEUDO ({result['count']} items)")
            print("-" * 60)
            for i, item in enumerate(result["items"], 1):
                print(f"{i:2}. Money:{item['money_score']} Util:{item['utility_score']} | {item['niche'] or '?'}")
                print(f"    {item['name'][:55]}")

    elif args.command == "errors":
        result = monitor.report_errors(args.limit)
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(f"\nERROS ({result['count']})")
            print("-" * 60)
            for e in result["errors"]:
                print(f"  {e['name'][:35]:35s} {(e['error'] or '')[:40]}")

    elif args.command == "recent":
        result = monitor.report_recent(args.hours)
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(f"\nATIVIDADE ULTIMAS {result['period_hours']}h (desde {result['since']})")
            print(f"  Novos arquivos:     {result['new_files_added']:,}")
            print(f"  Conteudos extraidos:{result['contents_extracted']:,}")
            print(f"  Novos embeddings:   {result['new_embeddings']:,}")
            print(f"  Erros:              {result['errors']:,}")

    elif args.command == "niches":
        result = monitor.niche_summary()
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print("\nDISTRIBUICAO POR NICHO")
            print("-" * 40)
            for niche, count in result["niches"].items():
                bar = "#" * min(count // 10, 30) if count > 10 else "#"
                print(f"  {niche:20s} {count:6,} {bar}")

    elif args.command == "jobs":
        result = monitor.scan_jobs(args.limit)
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print(f"\nSCAN JOBS ({result['count']})")
            print("-" * 60)
            for j in result["jobs"]:
                print(f"  Job #{j['id']}: {j['status']} | {j.get('processed', 0)}/{j.get('total_files', '?')} files | ${j.get('cost_usd', 0):.4f}")
                print(f"    Started: {j['started']} | Finished: {j['finished'] or 'running'}")

    elif args.command == "queue":
        result = monitor.queue_status()
        if args.json:
            print(json.dumps(result, indent=2, default=str, ensure_ascii=False))
        else:
            print("\nFILA DE PROCESSAMENTO")
            print("-" * 40)
            for s, c in result["statuses"].items():
                print(f"  {s:12s}: {c:,}")
            if result["recent"]:
                print("\nRecentes:")
                for r in result["recent"][:5]:
                    print(f"  #{r['id']} file:{r['file_id']} {r['job_type']} [{r['status']}] attempts:{r['attempts']}")

    elif args.command == "retry-errors":
        result = monitor.retry_errors(args.limit)
        print(json.dumps(result, indent=2, default=str, ensure_ascii=False))

    elif args.command == "clear-checkpoint":
        result = monitor.clear_checkpoint()
        print(json.dumps(result, indent=2, default=str, ensure_ascii=False))


if __name__ == "__main__":
    main()
