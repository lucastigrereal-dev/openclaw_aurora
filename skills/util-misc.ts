/**
 * Skills Utilitárias
 * util.sleep, util.datetime, util.uuid, util.hash
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import * as crypto from 'crypto';

// ============================================================================
// UTIL.SLEEP
// ============================================================================

export class UtilSleepSkill extends Skill {
  constructor() {
    super(
      {
        name: 'util.sleep',
        description: 'Aguarda um período de tempo',
        version: '1.0.0',
        category: 'UTIL',
        tags: ['sleep', 'wait', 'delay'],
      },
      { timeout: 600000 } // Permite sleep de até 10 minutos
    );
  }

  validate(input: SkillInput): boolean {
    const ms = input.ms || input.seconds * 1000;
    return typeof ms === 'number' && ms > 0 && ms <= 600000;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const ms = input.ms || (input.seconds || 1) * 1000;

    await new Promise(resolve => setTimeout(resolve, ms));

    return {
      success: true,
      data: { sleptMs: ms },
    };
  }
}

// ============================================================================
// UTIL.DATETIME
// ============================================================================

export class UtilDatetimeSkill extends Skill {
  constructor() {
    super(
      {
        name: 'util.datetime',
        description: 'Operações com data e hora',
        version: '1.0.0',
        category: 'UTIL',
        tags: ['date', 'time', 'datetime', 'timestamp'],
      },
      { timeout: 1000 }
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { operation = 'now', format, timezone = 'UTC' } = input;
    const now = new Date();

    let result: any = {};

    switch (operation) {
      case 'now':
        result = {
          iso: now.toISOString(),
          timestamp: now.getTime(),
          unix: Math.floor(now.getTime() / 1000),
          date: now.toDateString(),
          time: now.toTimeString(),
        };
        break;

      case 'parse':
        if (input.value) {
          const parsed = new Date(input.value);
          result = {
            iso: parsed.toISOString(),
            timestamp: parsed.getTime(),
            valid: !isNaN(parsed.getTime()),
          };
        }
        break;

      case 'add':
        const base = input.base ? new Date(input.base) : now;
        const added = new Date(base);
        if (input.days) added.setDate(added.getDate() + input.days);
        if (input.hours) added.setHours(added.getHours() + input.hours);
        if (input.minutes) added.setMinutes(added.getMinutes() + input.minutes);
        result = {
          iso: added.toISOString(),
          timestamp: added.getTime(),
        };
        break;

      case 'diff':
        if (input.from && input.to) {
          const from = new Date(input.from);
          const to = new Date(input.to);
          const diffMs = to.getTime() - from.getTime();
          result = {
            milliseconds: diffMs,
            seconds: diffMs / 1000,
            minutes: diffMs / 60000,
            hours: diffMs / 3600000,
            days: diffMs / 86400000,
          };
        }
        break;
    }

    return {
      success: true,
      data: result,
    };
  }
}

// ============================================================================
// UTIL.UUID
// ============================================================================

export class UtilUUIDSkill extends Skill {
  constructor() {
    super(
      {
        name: 'util.uuid',
        description: 'Gera UUIDs',
        version: '1.0.0',
        category: 'UTIL',
        tags: ['uuid', 'id', 'random'],
      },
      { timeout: 1000 }
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { count = 1, version = 4 } = input;

    const uuids: string[] = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      uuids.push(crypto.randomUUID());
    }

    return {
      success: true,
      data: {
        uuid: uuids[0],
        uuids: count > 1 ? uuids : undefined,
        count: uuids.length,
      },
    };
  }
}

// ============================================================================
// UTIL.HASH
// ============================================================================

export class UtilHashSkill extends Skill {
  constructor() {
    super(
      {
        name: 'util.hash',
        description: 'Calcula hashes de dados',
        version: '1.0.0',
        category: 'UTIL',
        tags: ['hash', 'md5', 'sha256', 'crypto'],
      },
      { timeout: 5000 }
    );
  }

  validate(input: SkillInput): boolean {
    return !!input.data;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { data, algorithm = 'sha256', encoding = 'hex' } = input;

    try {
      const hash = crypto
        .createHash(algorithm)
        .update(typeof data === 'string' ? data : JSON.stringify(data))
        .digest(encoding as crypto.BinaryToTextEncoding);

      return {
        success: true,
        data: {
          hash,
          algorithm,
          inputLength: typeof data === 'string' ? data.length : JSON.stringify(data).length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// UTIL.JSON
// ============================================================================

export class UtilJSONSkill extends Skill {
  constructor() {
    super(
      {
        name: 'util.json',
        description: 'Operações com JSON',
        version: '1.0.0',
        category: 'UTIL',
        tags: ['json', 'parse', 'stringify'],
      },
      { timeout: 5000 }
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { operation = 'parse', data, path } = input;

    try {
      let result: any;

      switch (operation) {
        case 'parse':
          result = typeof data === 'string' ? JSON.parse(data) : data;
          break;

        case 'stringify':
          result = JSON.stringify(data, null, 2);
          break;

        case 'get':
          // Acessa propriedade por path (ex: "user.name")
          if (path) {
            const obj = typeof data === 'string' ? JSON.parse(data) : data;
            result = path.split('.').reduce((o: any, k: string) => o?.[k], obj);
          }
          break;

        case 'validate':
          try {
            if (typeof data === 'string') JSON.parse(data);
            result = { valid: true };
          } catch {
            result = { valid: false };
          }
          break;
      }

      return {
        success: true,
        data: { result, operation },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
