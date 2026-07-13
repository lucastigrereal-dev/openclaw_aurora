from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--records", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    records = json.loads(args.records.read_text(encoding="utf-8"))
    if args.limit > 0:
        records = records[: args.limit]
    payload = json.dumps(records, ensure_ascii=False)
    sql = f'''with payload as (
  select value as item
  from jsonb_array_elements($payload${payload}$payload$::jsonb)
)
insert into public.crm_records (id, team_id, kind, data)
select item->>'id', (item->>'team_id')::uuid, item->>'kind', item->'data'
from payload
on conflict (id) do update
set kind = excluded.kind, data = excluded.data, updated_at = now()
returning id, data->>'name' as name,
          data->>'contactVerification' as verification;
'''
    args.output.write_text(sql, encoding="utf-8")
    print(json.dumps({"records": len(records), "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
