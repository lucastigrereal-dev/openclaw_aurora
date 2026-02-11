#!/usr/bin/env python3
"""
Akasha Content Extractor + Niche Classifier
Multi-format: PDF, Video, Audio, Text, Image (OCR)
Classification: GPT-4o-mini (cheap model)
"""

import os
import json
import base64
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

from supabase import create_client, Client
from openai import OpenAI

# Supabase
SUPABASE_URL = os.getenv("AKASHA_SUPABASE_URL")
SUPABASE_KEY = os.getenv("AKASHA_SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ContentExtractor:
    """Multi-format content extraction + niche classification"""

    def __init__(self):
        self.temp_dir = Path.home() / ".openclaw/hubs/akasha/temp"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def get_pending_files(self, limit: int = 10, file_type: str = "all") -> List[Dict]:
        """Get files pending extraction, ordered by priority"""
        query = supabase.table("files") \
            .select("*") \
            .eq("status", "cataloged")

        if file_type != "all":
            query = query.eq("file_type", file_type)

        response = query.order("modified_date", desc=True).limit(limit).execute()
        return response.data

    def extract_pdf(self, file_path: Path) -> Tuple[str, Dict]:
        """Extract text from PDF using PyPDF2 (FREE)"""
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            raise RuntimeError("PyPDF2 not installed: pip install PyPDF2")

        reader = PdfReader(str(file_path))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"

        metadata = {
            "extraction_method": "PyPDF2",
            "page_count": len(reader.pages),
            "cost_usd": 0.0
        }

        return text.strip(), metadata

    def extract_text(self, file_path: Path) -> Tuple[str, Dict]:
        """Extract text from plain text files (FREE)"""
        encodings = ['utf-8', 'latin-1', 'cp1252']

        for encoding in encodings:
            try:
                text = file_path.read_text(encoding=encoding)
                return text, {"extraction_method": "direct_read", "encoding": encoding}
            except UnicodeDecodeError:
                continue

        raise RuntimeError(f"Could not decode {file_path}")

    def extract_video_audio(self, file_path: Path, file_type: str,
                           speed_mode: str = "balanced") -> Tuple[str, Dict, float]:
        """Extract audio transcription using Whisper API with cost optimization"""
        speed_map = {
            "conservative": 1.2,
            "balanced": 1.5,
            "aggressive": 2.0
        }
        speed = speed_map.get(speed_mode, 1.5)

        # If video, extract audio first
        audio_path = file_path
        if file_type == "video":
            audio_path = self.temp_dir / f"{file_path.stem}_audio.mp3"
            subprocess.run([
                "ffmpeg", "-i", str(file_path), "-vn", "-acodec", "libmp3lame",
                "-q:a", "4", str(audio_path), "-y"
            ], capture_output=True)

        # Speed up audio for cost reduction
        if speed > 1.0:
            fast_path = self.temp_dir / f"{file_path.stem}_fast.mp3"
            subprocess.run([
                "ffmpeg", "-i", str(audio_path),
                "-filter:a", f"atempo={speed}",
                str(fast_path), "-y"
            ], capture_output=True)
            transcribe_path = fast_path
        else:
            transcribe_path = audio_path

        # Transcribe with Whisper
        with open(transcribe_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="pt"
            )

        text = transcript.text

        # Calculate cost
        file_size_mb = transcribe_path.stat().st_size / (1024 * 1024)
        duration_minutes = file_size_mb / 1.0
        cost = duration_minutes * 0.006

        metadata = {
            "extraction_method": "whisper-1",
            "speed_mode": speed_mode,
            "speed_factor": speed,
            "original_type": file_type,
            "cost_usd": round(cost, 4)
        }

        # Cleanup temp files
        for temp_file in self.temp_dir.glob(f"{file_path.stem}_*"):
            try:
                temp_file.unlink()
            except OSError:
                pass

        return text, metadata, cost

    def extract_image_ocr(self, file_path: Path) -> Tuple[str, Dict]:
        """Extract text from image using GPT-4o Vision OCR"""
        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extraia TODO o texto desta imagem (OCR). Se houver pouco texto, descreva o conteudo visual relevante."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                ]
            }],
            max_tokens=1000
        )

        text = response.choices[0].message.content
        metadata = {"extraction_method": "gpt-4-vision-ocr", "model": "gpt-4o-mini"}
        return text, metadata

    def classify_niche(self, text: str, filename: str) -> Dict:
        """Classify content into monetization niches (GPT-4o-mini = cheap)"""
        sample = text[:2000]

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """Voce e um classificador de conteudo para monetizacao.
Analise o texto e retorne JSON com:
{
  "primary_niche": "um dos: estetica, marketing_digital, youtube, infoproduto, automacao, vendas, saude, financeiro, tecnologia, outro",
  "monetization_potential": "alto | medio | baixo",
  "keywords": ["3-5 palavras-chave"],
  "summary": "resumo em 1 frase"
}"""
                },
                {"role": "user", "content": f"Arquivo: {filename}\n\nConteudo:\n{sample}"}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        try:
            return json.loads(response.choices[0].message.content)
        except (json.JSONDecodeError, AttributeError):
            return {"primary_niche": "outro", "monetization_potential": "baixo", "keywords": [], "summary": "Classificacao falhou"}

    def download_drive_file(self, drive_file_id: str, mime_type: str = None) -> Optional[Path]:
        """Download file from Google Drive"""
        try:
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaIoBaseDownload
            import pickle

            token_path = Path.home() / '.openclaw/google_drive_token.pickle'
            with open(token_path, 'rb') as f:
                creds = pickle.load(f)

            service = build('drive', 'v3', credentials=creds)

            request = service.files().get_media(fileId=drive_file_id)
            local_path = self.temp_dir / f"download_{drive_file_id}"

            with open(local_path, 'wb') as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()

            return local_path
        except Exception as e:
            print(f"   ❌ Download failed: {e}")
            return None

    def process_file(self, file_record: Dict, speed_mode: str = "balanced") -> Dict:
        """Process single file: extract + classify + save"""
        file_id = file_record["id"]
        filename = file_record["filename"]
        file_type = file_record["file_type"]
        drive_file_id = file_record.get("drive_file_id")

        print(f"\n🔄 Processing: {filename}")
        print(f"   Type: {file_type} | Status: {file_record.get('status')}")

        report = {"file_id": file_id, "filename": filename, "status": "failed", "cost_usd": 0.0, "error": None}

        try:
            supabase.table("files").update({"status": "processing"}).eq("id", file_id).execute()

            # Download if from Drive
            if drive_file_id:
                local_path = self.download_drive_file(drive_file_id, file_record.get("mime_type"))
                if not local_path:
                    raise RuntimeError("Download failed")
            else:
                local_path = Path(file_record["file_path"])

            # Extract based on type
            extracted_text = ""
            metadata = {}
            cost = 0.0

            if file_type == "pdf":
                extracted_text, metadata = self.extract_pdf(local_path)
            elif file_type in ["video", "audio"]:
                extracted_text, metadata, cost = self.extract_video_audio(local_path, file_type, speed_mode)
            elif file_type == "text":
                extracted_text, metadata = self.extract_text(local_path)
            elif file_type == "image":
                extracted_text, metadata = self.extract_image_ocr(local_path)
            else:
                raise RuntimeError(f"Unsupported file type: {file_type}")

            # Classify niche
            classification = self.classify_niche(extracted_text, filename)

            # Save to file_content
            content_data = {
                "file_id": file_id,
                "content_text": extracted_text,
                "content_summary": classification.get("summary"),
                "metadata": {**metadata, "classification": classification, "processing_date": datetime.now().isoformat()}
            }
            supabase.table("file_content").insert(content_data).execute()

            # Update file status
            supabase.table("files").update({"status": "extracted", "updated_at": datetime.now().isoformat()}).eq("id", file_id).execute()

            report["status"] = "success"
            report["cost_usd"] = cost
            report["niche"] = classification.get("primary_niche")
            report["monetization_potential"] = classification.get("monetization_potential")

            print(f"   ✅ Extracted ({len(extracted_text)} chars)")
            print(f"   💰 Cost: ${cost:.4f}")
            print(f"   🎯 Niche: {classification.get('primary_niche')}")

        except Exception as e:
            print(f"   ❌ Error: {e}")
            supabase.table("files").update({"status": "error"}).eq("id", file_id).execute()
            report["error"] = str(e)

        return report

    def process_batch(self, limit: int = 10, file_type: str = "all", speed_mode: str = "balanced") -> Dict:
        """Process batch of pending files"""
        files = self.get_pending_files(limit, file_type)

        if not files:
            print("✨ No pending files to process")
            return {"processed": 0, "total_cost": 0.0}

        print(f"📦 Processing {len(files)} files...")

        reports = []
        total_cost = 0.0

        for file in files:
            report = self.process_file(file, speed_mode)
            reports.append(report)
            total_cost += report.get("cost_usd", 0.0)

        success_count = sum(1 for r in reports if r["status"] == "success")

        print(f"\n📊 BATCH SUMMARY")
        print(f"   Success: {success_count}/{len(files)}")
        print(f"   Total cost: ${total_cost:.4f}")

        return {"processed": len(files), "success": success_count, "failed": len(files) - success_count, "total_cost_usd": round(total_cost, 4)}


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Content Extractor")
    parser.add_argument("--limit", type=int, default=10, help="Max files to process")
    parser.add_argument("--file-type", default="all", choices=["all", "pdf", "video", "audio", "text", "image"])
    parser.add_argument("--speed-mode", default="balanced", choices=["conservative", "balanced", "aggressive"])
    parser.add_argument("--dry-run", action="store_true", help="Preview only")

    args = parser.parse_args()
    extractor = ContentExtractor()

    if args.dry_run:
        files = extractor.get_pending_files(args.limit, args.file_type)
        print(f"\n🔍 DRY RUN: Would process {len(files)} files\n")
        for i, f in enumerate(files, 1):
            print(f"{i}. {f['filename']} ({f['file_type']}, {f.get('file_size', 0)/1024/1024:.1f}MB)")
        return

    extractor.process_batch(args.limit, args.file_type, args.speed_mode)


if __name__ == "__main__":
    main()
