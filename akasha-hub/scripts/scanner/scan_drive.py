#!/usr/bin/env python3
"""
Akasha Scanner - Google Drive cataloger
Batch processing: 50 files/request (validated)
Checkpoint system: never reprocess files
Deduplication: md5Checksum
"""

import os
import json
import pickle
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from supabase import create_client, Client

# Config
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
TOKEN_PATH = Path.home() / '.openclaw/google_drive_token.pickle'
CREDENTIALS_PATH = Path(os.getenv('GOOGLE_DRIVE_CREDENTIALS',
                        str(Path.home() / '.openclaw/google_drive_credentials.json')))
CHECKPOINT_PATH = Path.home() / '.openclaw/hubs/akasha/checkpoints/scan_checkpoint.json'

# Supabase
SUPABASE_URL = os.getenv("AKASHA_SUPABASE_URL")
SUPABASE_KEY = os.getenv("AKASHA_SUPABASE_KEY")

# MIME type mapping
MIME_MAP = {
    'application/pdf': 'pdf',
    'video/mp4': 'video', 'video/quicktime': 'video', 'video/x-msvideo': 'video',
    'video/x-matroska': 'video', 'video/webm': 'video',
    'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/x-m4a': 'audio',
    'audio/ogg': 'audio', 'audio/flac': 'audio',
    'text/plain': 'text', 'text/markdown': 'text', 'text/csv': 'text',
    'application/json': 'text',
    'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image',
    'image/webp': 'image',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
    'application/vnd.google-apps.document': 'document',
    'application/vnd.google-apps.spreadsheet': 'spreadsheet',
}


class DriveScanner:
    def __init__(self):
        self.service = self._authenticate()
        self.checkpoint = self._load_checkpoint()
        self.stats = {"scanned": 0, "new": 0, "duplicates": 0, "errors": 0}
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def _authenticate(self):
        """OAuth2 authentication with token caching"""
        creds = None
        if TOKEN_PATH.exists():
            with open(TOKEN_PATH, 'rb') as f:
                creds = pickle.load(f)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
                creds = flow.run_local_server(port=0)

            TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(TOKEN_PATH, 'wb') as f:
                pickle.dump(creds, f)

        return build('drive', 'v3', credentials=creds)

    def _load_checkpoint(self) -> Dict:
        """Load scan checkpoint (never reprocess)"""
        if CHECKPOINT_PATH.exists():
            with open(CHECKPOINT_PATH) as f:
                return json.load(f)
        return {"scanned_ids": [], "last_scan": None}

    def _save_checkpoint(self):
        """Save scan checkpoint"""
        CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.checkpoint["last_scan"] = datetime.now().isoformat()
        with open(CHECKPOINT_PATH, 'w') as f:
            json.dump(self.checkpoint, f, indent=2)

    def _classify_mime(self, mime_type: str) -> str:
        """Map MIME type to file_type"""
        return MIME_MAP.get(mime_type, 'other')

    def scan_folder(self, folder_id: str = "root", recursive: bool = True,
                    batch_size: int = 50, dry_run: bool = False) -> Dict:
        """
        Scan Google Drive folder and catalog to Supabase
        """
        print(f"\n📂 Scanning folder: {folder_id}")
        print(f"   Recursive: {recursive} | Batch: {batch_size} | Dry run: {dry_run}\n")

        all_files = []
        page_token = None

        while True:
            query = f"'{folder_id}' in parents and trashed = false"

            response = self.service.files().list(
                q=query,
                pageSize=batch_size,
                pageToken=page_token,
                fields="nextPageToken, files(id, name, mimeType, size, md5Checksum, modifiedTime, parents)"
            ).execute()

            files = response.get('files', [])

            for file in files:
                self.stats["scanned"] += 1

                # Skip already scanned
                if file['id'] in self.checkpoint.get("scanned_ids", []):
                    self.stats["duplicates"] += 1
                    continue

                # Recurse into folders
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    if recursive:
                        sub_result = self.scan_folder(file['id'], recursive, batch_size, dry_run)
                        all_files.extend(sub_result.get("files", []))
                    continue

                file_type = self._classify_mime(file['mimeType'])

                file_record = {
                    "filename": file['name'],
                    "file_path": f"gdrive://{file['id']}/{file['name']}",
                    "file_size": int(file.get('size', 0)),
                    "file_type": file_type,
                    "file_hash": file.get('md5Checksum'),
                    "modified_date": file.get('modifiedTime'),
                    "drive_file_id": file['id'],
                    "drive_parent_id": folder_id,
                    "status": "cataloged"
                }

                all_files.append(file_record)
                self.stats["new"] += 1

                # Update checkpoint
                self.checkpoint.setdefault("scanned_ids", []).append(file['id'])

                print(f"   📄 {file['name']} ({file_type}, {int(file.get('size', 0))/1024/1024:.1f}MB)")

            page_token = response.get('nextPageToken')
            if not page_token:
                break

        # Batch insert to Supabase
        if all_files and not dry_run:
            for i in range(0, len(all_files), 100):
                batch = all_files[i:i+100]
                try:
                    self.supabase.table("files").upsert(
                        batch,
                        on_conflict="file_path"
                    ).execute()
                except Exception as e:
                    print(f"   ❌ Batch insert error: {e}")
                    self.stats["errors"] += 1

        self._save_checkpoint()

        # Summary
        print(f"\n📊 SCAN SUMMARY")
        print(f"   Scanned: {self.stats['scanned']}")
        print(f"   New: {self.stats['new']}")
        print(f"   Duplicates: {self.stats['duplicates']}")
        print(f"   Errors: {self.stats['errors']}")

        return {
            "files": all_files,
            "stats": self.stats
        }

    def show_stats(self):
        """Show catalog statistics from Supabase"""
        print("\n📊 CATALOG STATS")
        for status in ['cataloged', 'processing', 'extracted', 'error']:
            count = self.supabase.table("files").select("id", count="exact").eq("status", status).execute()
            print(f"   {status}: {count.count}")

        print("\n📁 Por tipo:")
        for ftype in ['pdf', 'video', 'audio', 'text', 'image', 'document', 'other']:
            count = self.supabase.table("files").select("id", count="exact").eq("file_type", ftype).execute()
            if count.count > 0:
                print(f"   {ftype}: {count.count}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Drive Scanner")
    parser.add_argument("--folder-id", default="root", help="Google Drive folder ID")
    parser.add_argument("--batch-size", type=int, default=50, help="Files per request")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--stats", action="store_true", help="Show catalog stats")
    parser.add_argument("--no-recursive", action="store_true", help="Don't scan subfolders")

    args = parser.parse_args()

    scanner = DriveScanner()

    if args.stats:
        scanner.show_stats()
        return

    scanner.scan_folder(
        folder_id=args.folder_id,
        recursive=not args.no_recursive,
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    main()
