/**
 * S-01: Social Hub Planner Skill
 *
 * Gerencia planejamento de 30 dias para 6 páginas Instagram
 * Wraps: hub_planejar_30d.py
 *
 * @category COMM
 * @version 1.0.0
 * @critical HIGH
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PlannerInput extends SkillInput {
  socialHubPath: string;      // Caminho do SOCIAL-HUB
  daysAhead?: number;          // Dias para planejar (default: 30)
  forceReplan?: boolean;       // Força replanejamento
  targetPages?: string[];      // Páginas específicas (default: todas)
}

export interface PlannerOutput extends SkillOutput {
  data?: {
    totalPosts: number;
    postsByPage: Record<string, number>;
    dateRange: { start: string; end: string };
    planFile: string;
    conflicts: string[];
    warnings: string[];
  };
}

export class SocialHubPlanner extends Skill {
  constructor() {
    super(
      {
        name: 'social-hub-planner',
        description: '30-day Instagram content planning across 6 pages with collaboration orchestration',
        version: '1.0.0',
        category: 'COMM',
        author: 'OpenClaw Aurora',
        tags: ['instagram', 'planning', 'social-media', 'scheduling'],
      },
      {
        timeout: 120000, // 2 minutos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as PlannerInput;

    if (!typed.socialHubPath) {
      console.error('[SocialHubPlanner] Missing socialHubPath');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<PlannerOutput> {
    const typed = input as PlannerInput;
    const daysAhead = typed.daysAhead || 30;

    try {
      // 1. Validar estrutura do projeto
      const scriptsPath = path.join(typed.socialHubPath, 'SCRIPTS');
      const plannerScript = path.join(scriptsPath, 'hub_planejar_30d.py');

      try {
        await fs.access(plannerScript);
      } catch {
        return {
          success: false,
          error: `Planner script not found: ${plannerScript}`,
        };
      }

      // 2. Construir comando
      let cmd = `cd "${typed.socialHubPath}" && python3 SCRIPTS/hub_planejar_30d.py --days ${daysAhead}`;

      if (typed.forceReplan) {
        cmd += ' --force';
      }

      if (typed.targetPages && typed.targetPages.length > 0) {
        cmd += ` --pages ${typed.targetPages.join(',')}`;
      }

      // 3. Executar planejamento
      console.log(`[SocialHubPlanner] Executing: ${cmd}`);
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: typed.socialHubPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // 4. Parsear resultados
      const planFile = path.join(typed.socialHubPath, 'RUN', 'plano_30d.json');

      let planData;
      try {
        const content = await fs.readFile(planFile, 'utf-8');
        planData = JSON.parse(content);
      } catch {
        return {
          success: false,
          error: 'Failed to read generated plan file',
        };
      }

      // 5. Calcular estatísticas
      const postsByPage: Record<string, number> = {};
      const conflicts: string[] = [];
      const warnings: string[] = [];

      for (const post of planData.posts || []) {
        const page = post.pagina;
        postsByPage[page] = (postsByPage[page] || 0) + 1;

        // Detectar conflitos
        if (post.status === 'conflito') {
          conflicts.push(`${post.data} ${post.hora}: ${post.pagina} - ${post.motivo || 'Unknown'}`);
        }

        // Detectar warnings
        if (post.colaboracao && post.colaboracao.length > 3) {
          warnings.push(`${post.data}: Muitas colaborações (${post.colaboracao.length})`);
        }
      }

      // 6. Range de datas
      const dates = planData.posts?.map((p: any) => p.data).sort() || [];
      const dateRange = {
        start: dates[0] || 'N/A',
        end: dates[dates.length - 1] || 'N/A',
      };

      return {
        success: true,
        data: {
          totalPosts: planData.posts?.length || 0,
          postsByPage,
          dateRange,
          planFile,
          conflicts,
          warnings,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Planner execution failed: ${errorMessage}`,
      };
    }
  }
}
