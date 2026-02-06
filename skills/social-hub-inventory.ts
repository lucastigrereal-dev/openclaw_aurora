/**
 * S-05: Social Hub Inventory Skill
 *
 * Gerencia inventário de vídeos com metadata extraction
 * Wraps: hub_inventario.py
 *
 * @category FILE
 * @version 1.0.0
 * @critical MEDIUM
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface InventoryInput extends SkillInput {
  socialHubPath: string;       // Caminho do SOCIAL-HUB
  videosPath?: string;         // Caminho específico (default: VIDEOS/RAW)
  forceRescan?: boolean;       // Força re-scan completo
  extractDuration?: boolean;   // Extrair duração com ffprobe
}

export interface InventoryOutput extends SkillOutput {
  data?: {
    totalVideos: number;
    newVideos: number;
    duplicates: number;
    totalSize: number;         // Bytes
    avgDuration?: number;      // Segundos
    inventoryFile: string;
    byTheme?: Record<string, number>;
  };
}

export class SocialHubInventory extends Skill {
  constructor() {
    super(
      {
        name: 'social-hub-inventory',
        description: 'Manage video inventory with deduplication and metadata extraction',
        version: '1.0.0',
        category: 'FILE',
        author: 'OpenClaw Aurora',
        tags: ['inventory', 'video', 'metadata', 'deduplication'],
      },
      {
        timeout: 300000, // 5 minutos (scan pode ser lento)
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as InventoryInput;

    if (!typed.socialHubPath) {
      console.error('[SocialHubInventory] Missing socialHubPath');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<InventoryOutput> {
    const typed = input as InventoryInput;
    const videosPath = typed.videosPath || path.join(typed.socialHubPath, 'VIDEOS', 'RAW');

    try {
      // 1. Validar diretório existe
      try {
        await fs.access(videosPath);
      } catch {
        return {
          success: false,
          error: `Videos directory not found: ${videosPath}`,
        };
      }

      // 2. Carregar inventário existente
      const inventoryFile = path.join(typed.socialHubPath, 'DATA', 'videos.json');
      let existingInventory: any = { videos: [] };

      if (!typed.forceRescan) {
        try {
          const content = await fs.readFile(inventoryFile, 'utf-8');
          existingInventory = JSON.parse(content);
        } catch {
          console.log('[SocialHubInventory] No existing inventory found, creating new');
        }
      }

      // 3. Scan diretório
      console.log('[SocialHubInventory] Scanning videos directory...');
      const videoFiles = await this.scanDirectory(videosPath);

      // 4. Processar cada vídeo
      const processedVideos: any[] = [];
      const hashes = new Set(existingInventory.videos.map((v: any) => v.md5));
      let newVideos = 0;
      let duplicates = 0;
      let totalSize = 0;
      let totalDuration = 0;

      for (const filePath of videoFiles) {
        // Calcular MD5
        const md5 = await this.calculateMD5(filePath);

        // Verificar duplicata
        if (hashes.has(md5)) {
          duplicates++;
          continue;
        }

        // Stats do arquivo
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        // Metadata básica
        const metadata: any = {
          file_path: path.relative(typed.socialHubPath, filePath),
          md5,
          size: stats.size,
          added_at: new Date().toISOString(),
        };

        // Extrair duração (opcional)
        if (typed.extractDuration) {
          try {
            const duration = await this.extractDuration(filePath);
            metadata.duration = duration;
            totalDuration += duration;
          } catch (error) {
            console.warn(`[SocialHubInventory] Failed to extract duration for ${filePath}`);
          }
        }

        processedVideos.push(metadata);
        hashes.add(md5);
        newVideos++;
      }

      // 5. Merge com inventário existente
      const finalInventory = {
        updated_at: new Date().toISOString(),
        total: existingInventory.videos.length + newVideos,
        videos: [...existingInventory.videos, ...processedVideos],
      };

      // 6. Salvar inventário
      await fs.writeFile(
        inventoryFile,
        JSON.stringify(finalInventory, null, 2),
        'utf-8'
      );

      // 7. Estatísticas por tema (se metadados disponíveis)
      const byTheme: Record<string, number> = {};
      for (const video of finalInventory.videos) {
        if (video.tema) {
          byTheme[video.tema] = (byTheme[video.tema] || 0) + 1;
        }
      }

      return {
        success: true,
        data: {
          totalVideos: finalInventory.total,
          newVideos,
          duplicates,
          totalSize,
          avgDuration: totalDuration > 0 ? totalDuration / newVideos : undefined,
          inventoryFile,
          byTheme: Object.keys(byTheme).length > 0 ? byTheme : undefined,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Inventory scan failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Scan recursivo de diretório
   */
  private async scanDirectory(dirPath: string): Promise<string[]> {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const files: string[] = [];

    const scan = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (videoExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    await scan(dirPath);
    return files;
  }

  /**
   * Calcula MD5 hash de um arquivo
   */
  private async calculateMD5(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('md5');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Extrai duração do vídeo usando ffprobe
   */
  private async extractDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      return parseFloat(stdout.trim());
    } catch {
      return 0;
    }
  }
}
