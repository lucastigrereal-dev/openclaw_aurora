from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=Path, required=True)
    parser.add_argument("--min-imported", type=int, default=1)
    args = parser.parse_args()
    if not args.path.exists():
        raise FileNotFoundError(f"Evidência não encontrada: {args.path}")
    data = json.loads(args.path.read_text(encoding="utf-8"))
    if data.get("status") != "PASS":
        raise RuntimeError("Evidência externa não está aprovada")
    if int(data.get("imported", 0)) < args.min_imported:
        raise RuntimeError("Quantidade importada abaixo do mínimo")
    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    main()
