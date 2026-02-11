#!/usr/bin/env python3
"""
Akasha Progress Lock — Anti-TDAH Task Manager
Forca foco em uma tarefa por vez. Nao deixa trocar ate completar.
"""
import os
import json
from datetime import datetime
from supabase import create_client


class ProgressLock:
    """Gerenciador de foco — uma tarefa por vez."""

    LOCK_TIMEOUT_HOURS = 4

    def __init__(self):
        url = os.environ.get("AKASHA_SUPABASE_URL")
        key = os.environ.get("AKASHA_SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Set AKASHA_SUPABASE_URL and AKASHA_SUPABASE_KEY")
        self.supabase = create_client(url, key)

    def lock(self, task_name: str, description: str = "",
             estimated_minutes: int = 60, context: dict = None) -> dict:
        """Trava em uma tarefa. Recusa se ja houver tarefa ativa."""
        active = self._get_active_lock()

        if active:
            elapsed = self._get_elapsed(active)
            remaining = active.get("estimated_minutes", 60) - elapsed

            return {
                "status": "blocked",
                "message": f"FOCO ATIVO! Complete primeiro: '{active['task_name']}'",
                "current_task": active["task_name"],
                "elapsed_minutes": round(elapsed),
                "remaining_minutes": max(0, round(remaining)),
                "tip": "Use --unlock para liberar ou --complete para marcar como feito",
            }

        lock_data = {
            "task_name": task_name,
            "reason": description or task_name,
            "locked_until": datetime.now().isoformat(),
        }

        result = self.supabase.table("progress_lock").insert(lock_data).execute()

        return {
            "status": "locked",
            "message": f"FOCO TRAVADO em: '{task_name}'",
            "task": task_name,
            "estimated_minutes": estimated_minutes,
            "lock_id": result.data[0]["id"] if result.data else None,
            "tip": f"Estimativa: {estimated_minutes}min. Foco total ate completar!",
        }

    def complete(self, notes: str = "") -> dict:
        """Marca tarefa atual como completada."""
        active = self._get_active_lock()

        if not active:
            return {
                "status": "no_lock",
                "message": "Nenhuma tarefa travada. Voce esta livre!",
            }

        elapsed = self._get_elapsed(active)

        self.supabase.table("progress_lock").update({
            "locked_until": datetime.now().isoformat(),
            "reason": f"COMPLETED: {notes}" if notes else "COMPLETED",
        }).eq("id", active["id"]).execute()

        return {
            "status": "completed",
            "message": f"COMPLETO: '{active['task_name']}' em {round(elapsed)}min!",
            "task": active["task_name"],
            "actual_minutes": round(elapsed),
        }

    def unlock(self, reason: str = "manual") -> dict:
        """Destravar sem completar (com registro do motivo)."""
        active = self._get_active_lock()

        if not active:
            return {"status": "no_lock", "message": "Nenhuma tarefa travada."}

        elapsed = self._get_elapsed(active)

        self.supabase.table("progress_lock").update({
            "locked_until": datetime.now().isoformat(),
            "reason": f"ABANDONED ({reason}) apos {round(elapsed)}min",
        }).eq("id", active["id"]).execute()

        return {
            "status": "unlocked",
            "message": f"Destravado: '{active['task_name']}' — registrado como abandonado",
            "reason": reason,
            "wasted_minutes": round(elapsed),
        }

    def status(self) -> dict:
        """Mostra status atual do lock."""
        active = self._get_active_lock()

        if not active:
            recent = self.supabase.table("progress_lock").select("*").order(
                "created_at", desc=True
            ).limit(5).execute()

            history = []
            for r in (recent.data or []):
                history.append({
                    "task": r["task_name"],
                    "reason": r.get("reason", ""),
                    "created": r.get("created_at", "")[:16],
                })

            return {
                "status": "free",
                "message": "Sem tarefa travada. Pronto para novo foco!",
                "recent_history": history,
            }

        elapsed = self._get_elapsed(active)

        return {
            "status": "active",
            "message": f"FOCO ATIVO: '{active['task_name']}'",
            "task": active["task_name"],
            "elapsed_minutes": round(elapsed),
            "created_at": active.get("created_at", "")[:16],
        }

    def _get_active_lock(self) -> dict:
        """Busca lock ativo (com auto-expire)."""
        result = self.supabase.table("progress_lock").select("*").gt(
            "locked_until", datetime.now().isoformat()
        ).order("created_at", desc=True).limit(1).execute()

        if not result.data:
            return None

        return result.data[0]

    def _get_elapsed(self, lock: dict) -> float:
        """Minutos desde o inicio do lock."""
        if not lock.get("created_at"):
            return 0
        start = datetime.fromisoformat(lock["created_at"].replace("Z", "+00:00"))
        now = datetime.now(start.tzinfo) if start.tzinfo else datetime.now()
        return (now - start).total_seconds() / 60


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Progress Lock — Anti-TDAH")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["lock", "complete", "unlock", "status"])
    parser.add_argument("--task", help="Task name (for lock)")
    parser.add_argument("--desc", default="", help="Task description")
    parser.add_argument("--minutes", type=int, default=60, help="Estimated minutes")
    parser.add_argument("--notes", default="", help="Completion notes")
    parser.add_argument("--reason", default="manual", help="Unlock reason")

    args = parser.parse_args()
    lock = ProgressLock()

    if args.command == "lock":
        if not args.task:
            print("Use: python lock_manager.py lock --task 'Nome da tarefa'")
            return
        result = lock.lock(args.task, args.desc, args.minutes)
    elif args.command == "complete":
        result = lock.complete(args.notes)
    elif args.command == "unlock":
        result = lock.unlock(args.reason)
    else:
        result = lock.status()

    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
