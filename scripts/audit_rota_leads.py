from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", type=Path, required=True)
    args = parser.parse_args()
    records = json.loads((args.dir / "crm_records.json").read_text(encoding="utf-8"))
    report = json.loads((args.dir / "quality_report.json").read_text(encoding="utf-8"))
    with (args.dir / "aguas_de_sao_pedro_lote_01.csv").open(encoding="utf-8-sig") as file:
        csv_rows = list(csv.DictReader(file))

    ids = [record["id"] for record in records]
    names = [record["data"]["name"] for record in records]
    errors: list[str] = []
    if len(ids) != len(set(ids)):
        errors.append("duplicate_record_ids")
    if any("lead expandido" in name.lower() for name in names):
        errors.append("synthetic_lead_found")
    if any(not (r["data"].get("phone") or r["data"].get("handle")) for r in records):
        errors.append("record_without_contact_identity")
    if len(records) != len(csv_rows):
        errors.append("csv_json_count_mismatch")
    if report["ready"] != len(records):
        errors.append("report_record_count_mismatch")
    if report["city_rows"] != (
        report["ready"] + report["pending_research"] + report["identity_conflicts"]
    ):
        errors.append("quality_totals_do_not_close")

    result = {
        "status": "PASS" if not errors else "FAIL",
        "records": len(records),
        "csv_rows": len(csv_rows),
        "unique_ids": len(set(ids)),
        "phone_confirmed": sum(
            r["data"].get("contactVerification") == "phone_confirmed_from_master"
            for r in records
        ),
        "instagram_needs_validation": sum(
            r["data"].get("contactVerification") == "instagram_accessible_needs_validation"
            for r in records
        ),
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
