/**
 * S-19: Social Hub Publer V2 - Production Ready
 *
 * Real Publer API integration with:
 * - Video upload with multipart/form-data
 * - Post scheduling with collaborators
 * - Exponential backoff retry logic
 * - Comprehensive error handling
 *
 * @category COMM
 * @version 2.0.0
 * @critical HIGH
 * @author Magnus (The Architect)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import axios, { AxiosError } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import FormData from 'form-data';

export interface PublerV2Input extends SkillInput {
  publisherApiKey: string;
  post: {
    pagina: string;            // @username
    data: string;              // YYYY-MM-DD
    hora: string;              // HH:MM
    videoPath: string;         // Caminho do vídeo
    legenda: string;           // Caption
    hashtags: string[];        // Hashtags
    primeiroComentario?: string;
    colaboradores?: string[];  // @usernames to tag
    formato?: 'reel' | 'story' | 'feed'; // Default: reel
  };
  dryRun?: boolean;
  retryConfig?: {
    maxRetries?: number;       // Default: 3
    baseDelayMs?: number;      // Default: 1000
    maxDelayMs?: number;       // Default: 30000
  };
}

export interface PublerV2Output extends SkillOutput {
  data?: {
    publerJobId: string;
    scheduledAt: string;
    status: 'scheduled' | 'pending' | 'failed';
    mediaId?: string;
    preview?: string;
    uploadDuration?: number;
    retries?: number;
  };
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class SocialHubPublerV2 extends Skill {
  private readonly PUBLER_API_BASE = 'https://api.publer.io/v1';

  constructor() {
    super(
      {
        name: 'social-hub-publer-v2',
        description: 'Production-ready Publer API integration with retry logic and video upload',
        version: '2.0.0',
        category: 'COMM',
        author: 'Magnus (The Architect)',
        tags: ['instagram', 'publer', 'api', 'production', 'retry'],
      },
      {
        timeout: 600000, // 10 minutos para uploads grandes
        retries: 0, // Handled internally
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as PublerV2Input;

    if (!typed.publisherApiKey) {
      console.error('[PublerV2] Missing publisherApiKey');
      return false;
    }

    if (!typed.post?.videoPath) {
      console.error('[PublerV2] Missing post.videoPath');
      return false;
    }

    if (!typed.post?.data || !typed.post?.hora) {
      console.error('[PublerV2] Missing post.data or post.hora');
      return false;
    }

    // Validar formato de data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(typed.post.data)) {
      console.error('[PublerV2] Invalid date format. Expected YYYY-MM-DD');
      return false;
    }

    // Validar formato de hora
    if (!/^\d{2}:\d{2}$/.test(typed.post.hora)) {
      console.error('[PublerV2] Invalid time format. Expected HH:MM');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<PublerV2Output> {
    const typed = input as PublerV2Input;
    const { post, retryConfig } = typed;

    const maxRetries = retryConfig?.maxRetries ?? 3;
    const baseDelayMs = retryConfig?.baseDelayMs ?? 1000;
    const maxDelayMs = retryConfig?.maxDelayMs ?? 30000;

    let lastError: Error | null = null;
    let attemptCount = 0;

    try {
      // 1. Validar arquivo existe
      try {
        const stats = await fs.stat(post.videoPath);
        console.log(`[PublerV2] Video file found: ${post.videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      } catch {
        return {
          success: false,
          error: `Video file not found: ${post.videoPath}`,
        };
      }

      // 2. Dry run check
      if (typed.dryRun) {
        console.log('[PublerV2] DRY RUN - Validation passed');
        return {
          success: true,
          data: {
            publerJobId: 'DRY-RUN-' + Date.now(),
            scheduledAt: `${post.data}T${post.hora}:00-03:00`,
            status: 'pending',
            retries: 0,
          },
        };
      }

      // 3. Upload com retry
      let mediaId: string | null = null;
      let uploadDuration = 0;

      for (let retry = 0; retry <= maxRetries; retry++) {
        attemptCount = retry + 1;

        try {
          console.log(`[PublerV2] Upload attempt ${attemptCount}/${maxRetries + 1}...`);

          const uploadStart = Date.now();
          mediaId = await this.uploadVideoWithProgress(typed.publisherApiKey, post.videoPath);
          uploadDuration = Date.now() - uploadStart;

          console.log(`[PublerV2] Upload successful in ${(uploadDuration / 1000).toFixed(2)}s`);
          break; // Success!

        } catch (error) {
          lastError = error as Error;

          if (retry < maxRetries) {
            const delay = Math.min(baseDelayMs * Math.pow(2, retry), maxDelayMs);
            console.warn(`[PublerV2] Upload failed, retrying in ${delay}ms... (${error})`);
            await this.sleep(delay);
          } else {
            throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${lastError.message}`);
          }
        }
      }

      if (!mediaId) {
        throw new Error('Upload failed: no media ID returned');
      }

      // 4. Criar post agendado
      console.log('[PublerV2] Creating scheduled post...');
      const scheduledAt = `${post.data}T${post.hora}:00-03:00`;

      const caption = this.buildCaption(post);

      const payload: any = {
        platforms: ['instagram'],
        text: caption,
        media: [mediaId],
        scheduled_at: scheduledAt,
        instagram_type: post.formato || 'reel',
      };

      // Adicionar primeiro comentário se fornecido
      if (post.primeiroComentario) {
        payload.first_comment = post.primeiroComentario;
      }

      // Adicionar colaboradores se fornecidos
      if (post.colaboradores && post.colaboradores.length > 0) {
        payload.collaborators = post.colaboradores;
      }

      // Scheduling com retry
      let jobId: string | null = null;
      let previewUrl: string | undefined;

      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          const response = await axios.post(
            `${this.PUBLER_API_BASE}/posts`,
            payload,
            {
              headers: {
                'Authorization': `Bearer ${typed.publisherApiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );

          jobId = response.data.id;
          previewUrl = response.data.preview_url;
          break;

        } catch (error) {
          lastError = error as Error;

          if (retry < maxRetries) {
            const delay = Math.min(baseDelayMs * Math.pow(2, retry), maxDelayMs);
            console.warn(`[PublerV2] Scheduling failed, retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            throw error;
          }
        }
      }

      if (!jobId) {
        throw new Error('Post creation failed: no job ID returned');
      }

      console.log(`[PublerV2] ✓ Scheduled successfully: ${jobId}`);

      return {
        success: true,
        data: {
          publerJobId: jobId,
          scheduledAt,
          status: 'scheduled',
          mediaId,
          preview: previewUrl,
          uploadDuration,
          retries: attemptCount - 1,
        },
      };

    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Upload vídeo com progress tracking
   */
  private async uploadVideoWithProgress(
    apiKey: string,
    videoPath: string
  ): Promise<string> {
    const formData = new FormData();
    const fileStream = require('fs').createReadStream(videoPath);
    const fileStats = await fs.stat(videoPath);

    formData.append('file', fileStream, {
      filename: path.basename(videoPath),
      contentType: 'video/mp4',
      knownLength: fileStats.size,
    });

    let lastProgress = 0;

    const response = await axios.post(
      `${this.PUBLER_API_BASE}/media`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 300000, // 5 minutos
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);

            // Log a cada 10%
            if (progress >= lastProgress + 10) {
              console.log(`[PublerV2] Upload progress: ${progress}%`);
              lastProgress = progress;
            }
          }
        },
      }
    );

    if (!response.data?.id) {
      throw new Error('Upload response missing media ID');
    }

    return response.data.id;
  }

  /**
   * Constrói caption completa
   */
  private buildCaption(post: PublerV2Input['post']): string {
    let caption = post.legenda;

    // Adicionar hashtags com espaçamento adequado
    if (post.hashtags && post.hashtags.length > 0) {
      caption += '\n\n' + post.hashtags.join(' ');
    }

    return caption;
  }

  /**
   * Extrai mensagem de erro amigável
   */
  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const data = axiosError.response.data as any;
        const apiError = data?.error || data?.message || axiosError.response.statusText;
        return `Publer API error (${axiosError.response.status}): ${apiError}`;
      }

      if (axiosError.code === 'ECONNABORTED') {
        return 'Request timeout - video may be too large or connection too slow';
      }

      if (axiosError.code === 'ENOTFOUND') {
        return 'Network error - unable to reach Publer API';
      }

      return `Network error: ${axiosError.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
