#!/usr/bin/env python3
"""
Akasha Local Scanner
Scans local directories and catalogs files to Supabase.
Handles: PDFs, videos, audio, docs, images, text, spreadsheets, zips, etc.

Schema:
  files: id, file_name, file_ext, mime_type, file_size_bytes, file_hash,
         file_path, status, file_modified_at, created_at, ...
  sources: id, name, source_type, base_path, config, last_scan_at, created_at
"""
import os
import json
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime
from typing import Dict, List

from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parents[3] / '.env'
if _env_path.exists():
    load_dotenv(_env_path)

from supabase import create_client, Client

# Supabase
SUPABASE_URL = os.getenv("AKASHA_SUPABASE_URL")
SUPABASE_KEY = os.getenv("AKASHA_SUPABASE_KEY")

# Checkpoint
CHECKPOINT_PATH = Path.home() / '.openclaw/hubs/akasha/checkpoints/scan_local_checkpoint.json'

# Skip patterns
SKIP_DIRS = {
    'node_modules', '.git', '.next', '__pycache__', '.cache', '.vscode',
    '.idea', 'dist', 'build', '.npm', '.yarn', '.pnpm-store', '.bun',
    'venv', '.venv', 'env', '.env', '.tox', '.mypy_cache', '.pytest_cache',
    '$RECYCLE.BIN', 'System Volume Information', 'AppData',
}

SKIP_EXTENSIONS = {
    '.exe', '.dll', '.sys', '.msi', '.cab', '.tmp', '.log',
    '.pyc', '.pyo', '.o', '.obj', '.class', '.jar',
    '.lock', '.map', '.min.js', '.min.css',
    '.lnk', '.url', '.ini', '.dat', '.blf', '.regtrans-ms',
}

# Valuable file types to prioritize
VALUABLE_EXTENSIONS = {
    # Documents
    '.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.md',
    # Spreadsheets
    '.xls', '.xlsx', '.csv', '.ods',
    # Presentations
    '.ppt', '.pptx', '.odp',
    # Media
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.webm', '.flv',
    '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma',
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff',
    # Archives (can contain valuable content)
    '.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz',
    # Data
    '.json', '.xml', '.yaml', '.yml', '.sql', '.db', '.sqlite',
    # Code (project files)
    '.py', '.js', '.ts', '.sh', '.ps1', '.bat',
}

# Better MIME detection
MIME_OVERRIDES = {
    '.md': 'text/markdown',
    '.ps1': 'application/x-powershell',
    '.ts': 'text/typescript',
    '.jsx': 'text/javascript',
    '.tsx': 'text/typescript',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.sql': 'application/sql',
    '.sh': 'application/x-shellscript',
    '.bat': 'application/x-bat',
    '.m4a': 'audio/x-m4a',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
}


def file_hash_md5(filepath: Path, chunk_size: int = 8192) -> str:
    """Calculate MD5 hash of a file."""
    h = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()
    except (PermissionError, OSError):
        return None


def get_mime_type(filepath: Path) -> str:
    """Get MIME type with overrides for common types."""
    ext = filepath.suffix.lower()
    if ext in MIME_OVERRIDES:
        return MIME_OVERRIDES[ext]
    mime, _ = mimetypes.guess_type(str(filepath))
    return mime or 'application/octet-stream'


class LocalScanner:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.checkpoint = self._load_checkpoint()
        self.stats = {
            "scanned": 0, "new": 0, "skipped": 0,
            "duplicates": 0, "errors": 0
        }

    def _load_checkpoint(self) -> Dict:
        if CHECKPOINT_PATH.exists():
            with open(CHECKPOINT_PATH) as f:
                return json.load(f)
        return {"scanned_paths": {}, "last_scan": None}

    def _save_checkpoint(self):
        CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.checkpoint["last_scan"] = datetime.now().isoformat()
        # Keep checkpoint manageable
        with open(CHECKPOINT_PATH, 'w') as f:
            json.dump(self.checkpoint, f, indent=2)

    def _should_skip_dir(self, dirpath: Path) -> bool:
        """Check if directory should be skipped."""
        name = dirpath.name
        if name.startswith('.'):
            return True
        if name in SKIP_DIRS:
            return True
        if name.startswith('__'):
            return True
        return False

    def _should_skip_file(self, filepath: Path) -> bool:
        """Check if file should be skipped."""
        ext = filepath.suffix.lower()
        if ext in SKIP_EXTENSIONS:
            return True
        if filepath.name.startswith('~$'):  # Office temp files
            return True
        if filepath.name.startswith('.'):
            return True
        return False

    def _is_valuable(self, filepath: Path) -> bool:
        """Check if file extension is valuable."""
        ext = filepath.suffix.lower()
        return ext in VALUABLE_EXTENSIONS

    def scan_directory(self, base_path: str, recursive: bool = True,
                       valuable_only: bool = True, dry_run: bool = False,
                       max_files: int = 0) -> Dict:
        """Scan local directory and catalog files."""
        base = Path(base_path).resolve()
        if not base.exists():
            print(f"Path not found: {base}")
            return {"error": "path not found"}

        print(f"\nScanning: {base}")
        print(f"  Recursive: {recursive} | Valuable only: {valuable_only} | Dry run: {dry_run}")

        # Get or create source
        source_id = self._get_or_create_source(str(base))

        files_to_insert = []

        if base.is_file():
            files_iter = [base]
        elif recursive:
            files_iter = self._walk_files(base, valuable_only)
        else:
            files_iter = [f for f in base.iterdir() if f.is_file()]

        for filepath in files_iter:
            if max_files and self.stats["new"] >= max_files:
                print(f"\n  Max files reached ({max_files})")
                break

            self.stats["scanned"] += 1

            if self._should_skip_file(filepath):
                self.stats["skipped"] += 1
                continue

            if valuable_only and not self._is_valuable(filepath):
                self.stats["skipped"] += 1
                continue

            # Check if already scanned (by path)
            str_path = str(filepath)
            if str_path in self.checkpoint.get("scanned_paths", {}):
                self.stats["duplicates"] += 1
                continue

            try:
                stat = filepath.stat()
                mime_type = get_mime_type(filepath)
                ext = filepath.suffix.lower().lstrip('.')
                fhash = file_hash_md5(filepath) if stat.st_size < 500_000_000 else None  # skip hash for >500MB

                file_record = {
                    "source_id": source_id,
                    "file_name": filepath.name,
                    "file_path": f"local://{str_path}",
                    "file_ext": ext,
                    "mime_type": mime_type,
                    "file_size_bytes": stat.st_size,
                    "file_hash": fhash,
                    "file_modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "status": "cataloged",
                }

                files_to_insert.append(file_record)
                self.stats["new"] += 1

                # Track in checkpoint
                self.checkpoint.setdefault("scanned_paths", {})[str_path] = {
                    "size": stat.st_size,
                    "scanned_at": datetime.now().isoformat()
                }

                size_mb = stat.st_size / (1024 * 1024)
                print(f"  {filepath.name} ({mime_type}, {size_mb:.1f}MB)")

            except (PermissionError, OSError) as e:
                self.stats["errors"] += 1

        # Batch insert
        if files_to_insert and not dry_run:
            inserted = 0
            for i in range(0, len(files_to_insert), 50):
                batch = files_to_insert[i:i + 50]
                try:
                    self.supabase.table("files").insert(batch).execute()
                    inserted += len(batch)
                except Exception as e:
                    print(f"  Batch insert error: {e}")
                    # Try one by one
                    for record in batch:
                        try:
                            self.supabase.table("files").insert(record).execute()
                            inserted += 1
                        except Exception as e2:
                            self.stats["errors"] += 1

            print(f"  Inserted: {inserted}")

        self._save_checkpoint()

        print(f"\nSCAN SUMMARY")
        print(f"  Scanned: {self.stats['scanned']}")
        print(f"  New: {self.stats['new']}")
        print(f"  Skipped: {self.stats['skipped']}")
        print(f"  Duplicates: {self.stats['duplicates']}")
        print(f"  Errors: {self.stats['errors']}")

        return {"stats": self.stats, "files": len(files_to_insert)}

    def _walk_files(self, base: Path, valuable_only: bool):
        """Walk directory tree yielding files, skipping junk dirs."""
        try:
            for entry in sorted(base.iterdir()):
                if entry.is_dir():
                    if not self._should_skip_dir(entry):
                        yield from self._walk_files(entry, valuable_only)
                elif entry.is_file():
                    yield entry
        except (PermissionError, OSError):
            pass

    def _get_or_create_source(self, base_path: str) -> int:
        """Get or create a source record."""
        # Check if source exists by path
        existing = self.supabase.table("sources").select("id").eq(
            "base_path", base_path
        ).limit(1).execute()

        if existing.data:
            return existing.data[0]["id"]

        # Check by name
        name = Path(base_path).name
        existing = self.supabase.table("sources").select("id").eq(
            "name", name
        ).limit(1).execute()

        if existing.data:
            # Update base_path
            self.supabase.table("sources").update({
                "base_path": base_path
            }).eq("id", existing.data[0]["id"]).execute()
            return existing.data[0]["id"]

        # Create new source with unique name
        try:
            result = self.supabase.table("sources").insert({
                "name": f"local_{name}",
                "source_type": "local",
                "base_path": base_path,
            }).execute()
            return result.data[0]["id"]
        except Exception:
            # Fallback - just use existing
            existing = self.supabase.table("sources").select("id").limit(1).execute()
            return existing.data[0]["id"] if existing.data else None


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Local Scanner")
    parser.add_argument("path", help="Directory or file to scan")
    parser.add_argument("--no-recursive", action="store_true", help="Don't scan subfolders")
    parser.add_argument("--all-files", action="store_true", help="Include all files, not just valuable ones")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--max-files", type=int, default=0, help="Max files to catalog (0=unlimited)")

    args = parser.parse_args()

    scanner = LocalScanner()
    scanner.scan_directory(
        args.path,
        recursive=not args.no_recursive,
        valuable_only=not args.all_files,
        dry_run=args.dry_run,
        max_files=args.max_files,
    )


if __name__ == "__main__":
    main()
