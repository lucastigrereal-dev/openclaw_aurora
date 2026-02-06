/**
 * S-02: Social Hub Publer Skill
 *
 * Agenda posts no Instagram via Publer API
 * Wraps: hub_agendar_publer.py (enhanced com API real)
 *
 * @category COMM
 * @version 1.0.0
 * @critical HIGH
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import FormData from 'form-data';

export interface PublerInput extends SkillInput {
  publisherApiKey: string;     // Publer API key
  post: {
    pagina: string;            // @username
    data: string;              // YYYY-MM-DD
    hora: string;              // HH:MM
    videoPath: string;         // Caminho do vídeo
    legenda: string;           // Caption
    hashtags: string[];        // Hashtags
    primeiroComentario?: string;
  };
  dryRun?: boolean;            // Não agenda, apenas valida
}

export interface PublerOutput extends SkillOutput {
  data?: {
    publerJobId: string;
    scheduledAt: string;
    status: 'scheduled' | 'pending' | 'failed';
    mediaId?: string;
    preview?: string;
  };
}

export class SocialHubPubler extends Skill {
  private readonly PUBLER_API_BASE = 'https://api.publer.io/v1';

  constructor() {
    super(
      {
        name: 'social-hub-publer',
        description: 'Schedule Instagram posts via Publer API with video upload',
        version: '1.0.0',
        category: 'COMM',
        author: 'OpenClaw Aurora',
        tags: ['instagram', 'publer', 'scheduling', 'api'],
      },
      {
        timeout: 300000, // 5 minutos (upload pode ser lento)
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as PublerInput;

    if (!typed.publisherApiKey) {
      console.error('[SocialHubPubler] Missing publisherApiKey');
      return false;
    }

    if (!typed.post?.videoPath) {
      console.error('[SocialHubPubler] Missing post.videoPath');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<PublerOutput> {
    const typed = input as PublerInput;
    const { post } = typed;

    try {
      // 1. Validar arquivo existe
      try {
        await fs.access(post.videoPath);
      } catch {
        return {
          success: false,
          error: `Video file not found: ${post.videoPath}`,
        };
      }

      if (typed.dryRun) {
        console.log('[SocialHubPubler] DRY RUN - Validação OK');
        return {
          success: true,
          data: {
            publerJobId: 'DRY-RUN-' + Date.now(),
            scheduledAt: `${post.data}T${post.hora}:00-03:00`,
            status: 'pending',
          },
        };
      }

      // 2. Upload do vídeo para Publer
      console.log('[SocialHubPubler] Uploading video to Publer...');
      const mediaId = await this.uploadVideo(typed.publisherApiKey, post.videoPath);

      // 3. Criar post agendado
      console.log('[SocialHubPubler] Creating scheduled post...');
      const scheduledAt = `${post.data}T${post.hora}:00-03:00`;

      const caption = `${post.legenda}\n\n${post.hashtags.join(' ')}`;

      const payload = {
        platforms: ['instagram'],
        text: caption,
        media: [mediaId],
        scheduled_at: scheduledAt,
        instagram_type: 'reel',
        first_comment: post.primeiroComentario || '',
      };

      const response = await axios.post(
        `${this.PUBLER_API_BASE}/posts`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${typed.publisherApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const jobId = response.data.id;

      console.log(`[SocialHubPubler] Scheduled successfully: ${jobId}`);

      return {
        success: true,
        data: {
          publerJobId: jobId,
          scheduledAt,
          status: 'scheduled',
          mediaId,
          preview: response.data.preview_url,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Extrair erro da API se disponível
      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data?.error || error.response.statusText;
        return {
          success: false,
          error: `Publer API error: ${apiError}`,
        };
      }

      return {
        success: false,
        error: `Scheduling failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Upload vídeo para Publer storage
   */
  private async uploadVideo(apiKey: string, videoPath: string): Promise<string> {
    const formData = new FormData();
    const fileStream = require('fs').createReadStream(videoPath);

    formData.append('file', fileStream, {
      filename: path.basename(videoPath),
      contentType: 'video/mp4',
    });

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
      }
    );

    return response.data.id;
  }
}
