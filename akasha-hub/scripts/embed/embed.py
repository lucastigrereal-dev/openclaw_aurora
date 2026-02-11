#!/usr/bin/env python3
"""
Akasha Embedding Generator
Chunks extracted content and generates embeddings using text-embedding-3-small.
Stores in file_embeddings table (pgvector).

Schema:
  file_content: id, file_id, content_type, content, word_count, ...
  file_embeddings: id, file_id, chunk_index, chunk_text, embedding, model, created_at
"""
import os
import json
import time
from typing import List, Dict

from dotenv import load_dotenv
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from openai import OpenAI
from supabase import create_client

# Config
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
CHUNK_SIZE = 500       # words per chunk
CHUNK_OVERLAP = 50     # word overlap between chunks
MAX_CHUNKS_PER_FILE = 50
BATCH_SIZE = 20        # embeddings per API call (OpenAI supports up to 2048)

# Supabase
SUPABASE_URL = os.getenv("AKASHA_SUPABASE_URL")
SUPABASE_KEY = os.getenv("AKASHA_SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping word-based chunks."""
    if not text or not text.strip():
        return []

    words = text.split()
    if len(words) <= chunk_size:
        return [text.strip()]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)

        if end >= len(words):
            break
        start += chunk_size - overlap

        if len(chunks) >= MAX_CHUNKS_PER_FILE:
            break

    return chunks


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Get embeddings for a batch of texts."""
    if not texts:
        return []

    # Clean texts - remove empty, truncate very long
    clean = [t[:8000] for t in texts if t.strip()]
    if not clean:
        return []

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=clean,
    )

    return [item.embedding for item in response.data]


def get_files_needing_embeddings(limit: int = 50) -> List[Dict]:
    """Get extracted files that don't have embeddings yet."""
    # Get extracted files
    files_resp = supabase.table("files").select(
        "id, file_name"
    ).eq("status", "extracted").limit(limit * 2).execute()

    if not files_resp.data:
        return []

    # Check which ones already have embeddings
    result = []
    for f in files_resp.data:
        existing = supabase.table("file_embeddings").select(
            "id"
        ).eq("file_id", f["id"]).limit(1).execute()

        if not existing.data:
            result.append(f)
            if len(result) >= limit:
                break

    return result


def embed_file(file_id: str, file_name: str) -> Dict:
    """Generate embeddings for a single file."""
    # Get content
    content_resp = supabase.table("file_content").select(
        "content, word_count"
    ).eq("file_id", file_id).limit(1).execute()

    if not content_resp.data or not content_resp.data[0].get("content"):
        return {"file_id": file_id, "status": "skip", "reason": "no content", "chunks": 0}

    content = content_resp.data[0]["content"]

    # Skip very short content
    if len(content.strip()) < 100:
        return {"file_id": file_id, "status": "skip", "reason": "too short", "chunks": 0}

    # Chunk
    chunks = chunk_text(content)
    if not chunks:
        return {"file_id": file_id, "status": "skip", "reason": "no chunks", "chunks": 0}

    print(f"  {file_name}: {len(chunks)} chunks")

    # Generate embeddings in batches
    all_embeddings = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        embeddings = get_embeddings_batch(batch)
        all_embeddings.extend(embeddings)
        if i + BATCH_SIZE < len(chunks):
            time.sleep(0.1)  # rate limit safety

    # Store in file_embeddings
    rows = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, all_embeddings)):
        rows.append({
            "file_id": file_id,
            "chunk_index": idx,
            "chunk_text": chunk[:5000],  # limit chunk text storage
            "embedding": embedding,
            "model": EMBEDDING_MODEL,
        })

    # Insert in batches of 10 (Supabase row limit)
    for i in range(0, len(rows), 10):
        batch = rows[i:i + 10]
        supabase.table("file_embeddings").insert(batch).execute()

    # Cost: ~$0.00002 per 1K tokens, ~750 words = ~1K tokens
    cost = len(chunks) * 0.00002

    return {
        "file_id": file_id,
        "status": "success",
        "chunks": len(chunks),
        "cost_usd": round(cost, 6),
    }


def embed_batch(limit: int = 50) -> Dict:
    """Process a batch of files for embedding."""
    files = get_files_needing_embeddings(limit)

    if not files:
        print("No files needing embeddings.")
        return {"processed": 0, "total_chunks": 0, "total_cost": 0}

    print(f"Embedding {len(files)} files...\n")

    total_chunks = 0
    total_cost = 0.0
    success = 0
    skipped = 0

    for f in files:
        try:
            result = embed_file(f["id"], f["file_name"])
            if result["status"] == "success":
                success += 1
                total_chunks += result["chunks"]
                total_cost += result.get("cost_usd", 0)
            else:
                skipped += 1
                print(f"  SKIP {f['file_name']}: {result.get('reason')}")
        except Exception as e:
            print(f"  ERROR {f['file_name']}: {e}")
            skipped += 1

    print(f"\nEMBEDDING SUMMARY")
    print(f"  Success: {success}/{len(files)}")
    print(f"  Skipped: {skipped}")
    print(f"  Total chunks: {total_chunks}")
    print(f"  Total cost: ${total_cost:.4f}")

    return {
        "processed": success,
        "skipped": skipped,
        "total_chunks": total_chunks,
        "total_cost_usd": round(total_cost, 6),
    }


def stats():
    """Show embedding statistics."""
    # Total embeddings
    emb_count = supabase.table("file_embeddings").select(
        "id", count="exact"
    ).execute()

    # Unique files with embeddings
    files_with = supabase.rpc("count_embedded_files", {}).execute() if False else None

    # Files extracted but no embeddings
    extracted = supabase.table("files").select(
        "id", count="exact"
    ).eq("status", "extracted").execute()

    print(f"\nEmbedding Stats")
    print(f"  Total embeddings: {emb_count.count or 0}")
    print(f"  Files extracted: {extracted.count or 0}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Akasha Embedding Generator")
    parser.add_argument("--limit", type=int, default=50, help="Files to process")
    parser.add_argument("--stats", action="store_true", help="Show stats")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args()

    if args.stats:
        stats()
        return

    result = embed_batch(args.limit)

    if args.json:
        print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
