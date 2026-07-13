from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path


def check_url(url: str) -> dict[str, object]:
    request = urllib.request.Request(url, headers={"User-Agent": "Cerberus-Go-Live/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"{url} retornou HTTP {response.status}")
        return {"url": url, "status": response.status}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", type=Path, required=True)
    args = parser.parse_args()
    quality = json.loads((args.evidence_dir / "quality_report.json").read_text(encoding="utf-8"))
    imported = json.loads((args.evidence_dir / "crm_import_evidence.json").read_text(encoding="utf-8"))
    if quality.get("ready") != 15 or imported.get("imported") != 15:
        raise RuntimeError("Lote ou importação não contém 15 registros")

    urls = [
        "https://rota-das-aguas.vercel.app/",
        "https://rota-das-aguas.vercel.app/api/health",
        "https://rota-das-aguas.vercel.app/cidades",
        "https://rota-das-aguas.vercel.app/onde-comer",
        "https://tigre-digital-dash.pages.dev/",
    ]
    result = {
        "status": "PASS",
        "urls": [check_url(url) for url in urls],
        "leads_ready": quality["ready"],
        "leads_imported": imported["imported"],
        "phone_confirmed": imported["phone_confirmed"],
        "instagram_needs_validation": imported["instagram_needs_validation"],
        "claudia_active": imported["claudia_active"],
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
