#!/usr/bin/env python3
"""
Akasha Whisper Optimizer
Pre-processa audio para reduzir custo do Whisper API.
Tecnicas: mono, 16kHz, compressao, speed-up, silence removal.
"""
import os
import subprocess
from pathlib import Path


class WhisperOptimizer:
    """Otimiza audio antes de enviar pro Whisper."""

    SPEED_PROFILES = {
        "conservative": {"speed": 1.0, "silence_threshold": "-40dB", "min_duration": "0.5"},
        "balanced":     {"speed": 1.25, "silence_threshold": "-35dB", "min_duration": "0.3"},
        "aggressive":   {"speed": 1.5, "silence_threshold": "-30dB", "min_duration": "0.2"},
    }

    def __init__(self, temp_dir=None):
        self.temp_dir = temp_dir or os.path.expanduser("~/.openclaw/hubs/akasha/temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        self._check_ffmpeg()

    def _check_ffmpeg(self):
        """Verifica se ffmpeg esta instalado."""
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError("ffmpeg nao encontrado. Instale: apt install ffmpeg / brew install ffmpeg")

    def get_duration(self, filepath: str) -> float:
        """Retorna duracao em segundos."""
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", filepath],
            capture_output=True, text=True
        )
        return float(result.stdout.strip()) if result.stdout.strip() else 0.0

    def optimize(self, input_path: str, speed_mode: str = "balanced") -> dict:
        """
        Pipeline completo de otimizacao:
        1. Extrair audio (se video)
        2. Converter para mono 16kHz
        3. Remover silencio
        4. Aplicar speed-up
        5. Comprimir para mp3
        """
        profile = self.SPEED_PROFILES.get(speed_mode, self.SPEED_PROFILES["balanced"])
        original_duration = self.get_duration(input_path)

        if original_duration == 0:
            return {"error": "Could not read duration", "optimized_path": input_path}

        output_path = os.path.join(self.temp_dir, f"optimized_{os.getpid()}.mp3")

        # Build ffmpeg filter
        filters = []

        # 1. Remove silence
        silence_thresh = profile["silence_threshold"]
        min_dur = profile["min_duration"]
        filters.append(
            f"silenceremove=start_periods=1:start_threshold={silence_thresh}"
            f":start_duration={min_dur}:stop_periods=-1"
            f":stop_threshold={silence_thresh}:stop_duration={min_dur}"
        )

        # 2. Speed up (atempo accepts 0.5-2.0)
        speed = profile["speed"]
        if speed != 1.0:
            filters.append(f"atempo={speed}")

        filter_chain = ",".join(filters)

        # 3. Execute ffmpeg: mono, 16kHz, filters, mp3 128kbps
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-af", filter_chain,
            "-b:a", "128k",
            "-f", "mp3",
            output_path
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True, timeout=300)
        except subprocess.TimeoutExpired:
            return {"error": "FFmpeg timeout (>5min)", "optimized_path": input_path}
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode()[:200] if e.stderr else 'unknown'
            print(f"⚠️ FFmpeg error: {stderr}")
            return {"error": "FFmpeg failed", "optimized_path": input_path}

        optimized_duration = self.get_duration(output_path)
        savings = ((original_duration - optimized_duration) / original_duration * 100) if original_duration > 0 else 0

        return {
            "optimized_path": output_path,
            "original_duration": round(original_duration, 1),
            "optimized_duration": round(optimized_duration, 1),
            "savings_percent": round(savings, 1),
            "original_cost_usd": round(original_duration / 60 * 0.006, 4),
            "optimized_cost_usd": round(optimized_duration / 60 * 0.006, 4),
        }

    def estimate_batch_savings(self, file_list: list, speed_mode: str = "balanced") -> dict:
        """Estima economia para um batch sem processar."""
        profile = self.SPEED_PROFILES[speed_mode]
        total_duration = 0

        for f in file_list:
            dur = self.get_duration(f) if os.path.exists(f) else 0
            total_duration += dur

        estimated_after = total_duration / profile["speed"] * 0.85

        return {
            "total_files": len(file_list),
            "original_hours": round(total_duration / 3600, 2),
            "estimated_hours": round(estimated_after / 3600, 2),
            "original_cost_usd": round(total_duration / 60 * 0.006, 2),
            "estimated_cost_usd": round(estimated_after / 60 * 0.006, 2),
            "estimated_savings_usd": round((total_duration - estimated_after) / 60 * 0.006, 2),
        }

    def cleanup(self):
        """Remove arquivos temporarios."""
        import glob
        for f in glob.glob(os.path.join(self.temp_dir, "optimized_*")):
            os.remove(f)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python whisper_optimize.py <audio_file> [speed_mode]")
        print("Speed modes: conservative, balanced, aggressive")
        sys.exit(1)

    optimizer = WhisperOptimizer()
    result = optimizer.optimize(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "balanced")

    if "error" in result:
        print(f"❌ {result['error']}")
    else:
        print(f"✅ Otimizado!")
        print(f"   Original:  {result['original_duration']}s (${result['original_cost_usd']})")
        print(f"   Otimizado: {result['optimized_duration']}s (${result['optimized_cost_usd']})")
        print(f"   Economia:  {result['savings_percent']}%")
        print(f"   Arquivo:   {result['optimized_path']}")
