#!/usr/bin/env python3
"""
SOCIAL HUB - VIDEO COMPILER
Escaneia pasta de vídeos e gera videos.csv automaticamente

Uso:
    python compile_videos.py /path/to/videos/folder --output videos.csv
"""

import os
import sys
import csv
import hashlib
import json
from pathlib import Path
from datetime import datetime
import subprocess
import argparse
from typing import Dict, List, Optional

class VideoCompiler:
    """Compila vídeos em videos.csv"""

    # Extensões suportadas
    VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm'}

    def __init__(self, videos_dir: str, output_csv: str = "videos.csv"):
        self.videos_dir = Path(videos_dir)
        self.output_csv = Path(output_csv)
        self.videos = []

        if not self.videos_dir.exists():
            print(f"❌ Pasta não existe: {self.videos_dir}")
            sys.exit(1)

    def get_md5_hash(self, filepath: Path) -> str:
        """Calcula MD5 hash do arquivo"""
        try:
            md5 = hashlib.md5()
            with open(filepath, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    md5.update(chunk)
            return md5.hexdigest()
        except Exception as e:
            print(f"⚠️  Erro ao calcular hash de {filepath}: {e}")
            return ""

    def get_duration(self, filepath: Path) -> int:
        """Extrai duração do vídeo em segundos usando ffprobe"""
        try:
            cmd = [
                'ffprobe', '-v', 'error', '-show_entries',
                'format=duration', '-of',
                'default=noprint_wrappers=1:nokey=1:noescapes=1',
                str(filepath)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.stdout:
                return int(float(result.stdout.strip()))
            return 0
        except Exception as e:
            print(f"⚠️  ffprobe não disponível ou erro: {e}")
            return 0

    def guess_metadata(self, filename: str) -> Dict:
        """Tenta inferir tema/pilar/tipo do nome do arquivo"""
        filename_lower = filename.lower()

        # Tipos
        video_type = "infantil_viral"
        if any(x in filename_lower for x in ['lucas', 'autoridade', 'original']):
            video_type = "original_lucas"
        elif any(x in filename_lower for x in ['saude', 'cuidado', 'mulher']):
            video_type = "cuidados_mulher"

        # Temas
        tema = ""
        if any(x in filename_lower for x in ['mãe', 'mae', 'maternidade', 'crianca', 'infantil']):
            tema = "maternidade"
        elif any(x in filename_lower for x in ['comida', 'receita', 'gastronomia', 'food']):
            tema = "gastronomia"
        elif any(x in filename_lower for x in ['saude', 'medico', 'doctor']):
            tema = "saude_mulher"
        elif any(x in filename_lower for x in ['risos', 'riso', 'humor', 'engraçado']):
            tema = "humor"
        elif any(x in filename_lower for x in ['familia', 'familia', 'rotina']):
            tema = "rotina_familiar"
        elif any(x in filename_lower for x in ['viagem', 'trip', 'travel']):
            tema = "viagem"
        elif any(x in filename_lower for x in ['dica', 'tip', 'hack']):
            tema = "dicas"
        else:
            tema = "genérico"

        # Pilar
        pilar = "entretenimento"
        if any(x in filename_lower for x in ['educacao', 'aprender', 'learn']):
            pilar = "educacao"
        elif any(x in filename_lower for x in ['autoridade', 'expert']):
            pilar = "autoridade"

        # Energy level (baseado em tipo)
        energy_level = "mid"
        if video_type == "infantil_viral":
            energy_level = "high"
        elif video_type == "original_lucas":
            energy_level = "mid"
        else:
            energy_level = "low"

        return {
            'tema': tema,
            'pilar': pilar,
            'video_type': video_type,
            'energy_level': energy_level
        }

    def scan_videos(self) -> List[Dict]:
        """Escaneia pasta e coleta metadados de vídeos"""
        print(f"\n📹 Escaneando: {self.videos_dir}\n")

        videos = []
        video_id = 1

        # Varrer recursivamente
        for video_file in sorted(self.videos_dir.rglob('*')):
            if not video_file.is_file():
                continue

            if video_file.suffix.lower() not in self.VIDEO_EXTENSIONS:
                continue

            print(f"  ▶️  {video_file.name}...", end=' ', flush=True)

            # Metadados básicos
            file_size = video_file.stat().st_size
            file_size_mb = file_size / (1024 * 1024)

            # Hash
            md5_hash = self.get_md5_hash(video_file)

            # Duração
            duration_sec = self.get_duration(video_file)

            # Inferir metadados do nome
            inferred = self.guess_metadata(video_file.name)

            # Gerar ID
            vid_id = f"VID-{video_id:05d}"
            content_group = f"GRP-{video_id:05d}"

            video_data = {
                'id': vid_id,
                'content_group_id': content_group,
                'hash_arquivo': md5_hash,
                'file_local': str(video_file),
                'file_drive': '',
                'duracao_seg': duration_sec,
                'tema': inferred['tema'],
                'pilar': inferred['pilar'],
                'formato': 'vertical',  # Assumir vertical por default
                'paginas_sugeridas': '@lucasrsmotta|@mamae.de.dois',  # Default
                'gancho': f'{video_file.stem}',  # Nome do arquivo como gancho temp
                'legenda_base': '',
                'cta': '',
                'hashtags': '',
                'status': 'ready',
                'score_prioridade': 60,
                'usage_count': 0,
                'last_used_at': '',
                'energy_level': inferred['energy_level'],
                'video_type': inferred['video_type'],
                'visual_quality_score': 0,  # Você ajusta depois
                'recycled_count': 0,
                'last_recycled_at': '',
                'observacoes': f'Size: {file_size_mb:.1f}MB'
            }

            videos.append(video_data)
            video_id += 1

            print(f"✅ ({duration_sec}s, {file_size_mb:.1f}MB, {inferred['video_type']})")

        self.videos = videos
        return videos

    def save_csv(self) -> bool:
        """Salva vídeos em CSV"""
        if not self.videos:
            print("❌ Nenhum vídeo encontrado!")
            return False

        try:
            print(f"\n💾 Salvando em: {self.output_csv}\n")

            fieldnames = [
                'id', 'content_group_id', 'hash_arquivo', 'file_local', 'file_drive',
                'duracao_seg', 'tema', 'pilar', 'formato', 'paginas_sugeridas',
                'gancho', 'legenda_base', 'cta', 'hashtags', 'status',
                'score_prioridade', 'usage_count', 'last_used_at',
                'energy_level', 'video_type', 'visual_quality_score',
                'recycled_count', 'last_recycled_at', 'observacoes'
            ]

            with open(self.output_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.videos)

            print(f"✅ {len(self.videos)} vídeos salvos em {self.output_csv}")
            return True

        except Exception as e:
            print(f"❌ Erro ao salvar CSV: {e}")
            return False

    def print_summary(self):
        """Mostra resumo dos vídeos"""
        if not self.videos:
            return

        print("\n" + "="*80)
        print("📊 RESUMO DOS VÍDEOS COMPILADOS")
        print("="*80)

        # Por tipo
        types = {}
        for v in self.videos:
            t = v['video_type']
            types[t] = types.get(t, 0) + 1

        print("\n📁 Por Tipo:")
        for tipo, count in sorted(types.items()):
            print(f"  • {tipo}: {count}")

        # Por tema
        themes = {}
        for v in self.videos:
            t = v['tema']
            themes[t] = themes.get(t, 0) + 1

        print("\n🎨 Por Tema:")
        for tema, count in sorted(themes.items()):
            print(f"  • {tema}: {count}")

        # Por energia
        energies = {}
        for v in self.videos:
            e = v['energy_level']
            energies[e] = energies.get(e, 0) + 1

        print("\n⚡ Por Energia:")
        for energy, count in sorted(energies.items()):
            print(f"  • {energy}: {count}")

        # Duração total
        total_duration = sum(v['duracao_sec'] for v in self.videos)
        total_size = sum(
            os.path.getsize(v['file_local'])
            for v in self.videos
            if os.path.exists(v['file_local'])
        ) / (1024 * 1024)

        print("\n📏 Estatísticas:")
        print(f"  • Total: {len(self.videos)} vídeos")
        print(f"  • Duração: {total_duration // 60} minutos")
        print(f"  • Tamanho: {total_size:.1f} MB")

        print("\n✅ PRÓXIMOS PASSOS:")
        print(f"1. Verifique {self.output_csv}")
        print("2. Ajuste 'gancho', 'legenda_base', 'cta', 'paginas_sugeridas'")
        print("3. Ajuste 'visual_quality_score' (0-100)")
        print("4. Execute o Planner com este CSV")

        print("\n" + "="*80)

def main():
    parser = argparse.ArgumentParser(
        description='Compila vídeos em videos.csv automaticamente'
    )
    parser.add_argument(
        'videos_dir',
        help='Caminho da pasta com vídeos'
    )
    parser.add_argument(
        '--output', '-o',
        default='videos.csv',
        help='Arquivo de saída (default: videos.csv)'
    )
    parser.add_argument(
        '--no-summary',
        action='store_true',
        help='Não mostrar resumo'
    )

    args = parser.parse_args()

    compiler = VideoCompiler(args.videos_dir, args.output)
    compiler.scan_videos()

    if compiler.save_csv():
        if not args.no_summary:
            compiler.print_summary()
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
