/**
 * S-43: Social Hub Database Manager
 *
 * PostgreSQL database management:
 * - Schema management (videos + posts tables)
 * - Prisma ORM integration
 * - Migration from CSV to PostgreSQL
 * - CRUD operations
 * - Query optimization
 *
 * @category UTIL
 * @version 1.0.0
 * @critical HIGH
 * @author Magnus (The Architect)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DatabaseManagerInput extends SkillInput {
  operation: 'init' | 'migrate' | 'insert' | 'query' | 'backup';
  connectionString?: string;      // PostgreSQL connection string
  socialHubPath?: string;         // For CSV migration
  data?: {
    table: 'videos' | 'posts' | 'analytics';
    records?: any[];
    query?: string;
    params?: any[];
  };
}

export interface DatabaseManagerOutput extends SkillOutput {
  data?: {
    operation: string;
    recordsAffected?: number;
    results?: any[];
    schema?: {
      tables: string[];
      indexes: string[];
    };
    migrationStatus?: {
      csvRowsProcessed: number;
      dbRowsInserted: number;
      errors: number;
    };
  };
}

/**
 * Schema definitions
 */
const SCHEMA_SQL = `
-- Videos table (inventário de vídeos)
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  resolution VARCHAR(20),
  tema VARCHAR(100),
  pilar VARCHAR(100),
  keywords TEXT[],
  viral_potential INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Posts table (posts agendados/publicados)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id),
  pagina VARCHAR(100) NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  published_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  legenda TEXT,
  hashtags TEXT[],
  primeiro_comentario TEXT,
  colaboradores TEXT[],
  publer_job_id VARCHAR(100) UNIQUE,
  grupo_conteudo VARCHAR(100),
  approval_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table (métricas de performance)
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  instagram_post_id VARCHAR(100),
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  viral_score INTEGER,
  metrics JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_tema ON videos(tema);
CREATE INDEX IF NOT EXISTS idx_videos_pilar ON videos(pilar);
CREATE INDEX IF NOT EXISTS idx_posts_pagina ON posts(pagina);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_grupo_conteudo ON posts(pagina, grupo_conteudo);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

export class SocialHubDatabaseManager extends Skill {
  private pg: any = null; // PostgreSQL client

  constructor() {
    super(
      {
        name: 'social-hub-database-manager',
        description: 'PostgreSQL database management with Prisma ORM',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Magnus (The Architect)',
        tags: ['database', 'postgresql', 'prisma', 'migration'],
      },
      {
        timeout: 120000,
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as DatabaseManagerInput;

    if (!typed.operation) {
      console.error('[DatabaseManager] Missing operation');
      return false;
    }

    if (typed.operation === 'migrate' && !typed.socialHubPath) {
      console.error('[DatabaseManager] Missing socialHubPath for migration');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<DatabaseManagerOutput> {
    const typed = input as DatabaseManagerInput;

    try {
      // Initialize PostgreSQL client if needed
      if (['init', 'migrate', 'insert', 'query'].includes(typed.operation)) {
        await this.initializeClient(typed.connectionString);
      }

      switch (typed.operation) {
        case 'init':
          return await this.initializeSchema();

        case 'migrate':
          return await this.migrateFromCSV(typed);

        case 'insert':
          return await this.insertRecords(typed);

        case 'query':
          return await this.executeQuery(typed);

        case 'backup':
          return await this.backupDatabase(typed);

        default:
          return {
            success: false,
            error: `Unknown operation: ${typed.operation}`,
          };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Database operation failed: ${errorMessage}`,
      };
    } finally {
      if (this.pg) {
        await this.pg.end();
      }
    }
  }

  /**
   * Inicializa cliente PostgreSQL
   */
  private async initializeClient(connectionString?: string): Promise<void> {
    const { Client } = require('pg');

    const connString =
      connectionString ||
      process.env.DATABASE_URL ||
      'postgresql://localhost:5432/social_hub';

    this.pg = new Client({ connectionString: connString });
    await this.pg.connect();

    console.log('[DatabaseManager] Connected to PostgreSQL');
  }

  /**
   * Inicializa schema do banco
   */
  private async initializeSchema(): Promise<DatabaseManagerOutput> {
    console.log('[DatabaseManager] Initializing database schema...');

    await this.pg.query(SCHEMA_SQL);

    // Verificar tabelas criadas
    const tablesResult = await this.pg.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map((r: any) => r.tablename);

    // Verificar índices
    const indexesResult = await this.pg.query(`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `);

    const indexes = indexesResult.rows.map((r: any) => r.indexname);

    console.log(`[DatabaseManager] ✓ Schema initialized: ${tables.length} tables, ${indexes.length} indexes`);

    return {
      success: true,
      data: {
        operation: 'init',
        schema: {
          tables,
          indexes,
        },
      },
    };
  }

  /**
   * Migra dados de CSV para PostgreSQL
   */
  private async migrateFromCSV(
    input: DatabaseManagerInput
  ): Promise<DatabaseManagerOutput> {
    if (!input.socialHubPath) {
      return {
        success: false,
        error: 'socialHubPath required for migration',
      };
    }

    console.log('[DatabaseManager] Starting CSV migration...');

    let csvRowsProcessed = 0;
    let dbRowsInserted = 0;
    let errors = 0;

    // 1. Migrar inventário de vídeos
    const videosCSV = path.join(input.socialHubPath, 'DATA', 'videos_inventory.csv');

    try {
      const videosContent = await fs.readFile(videosCSV, 'utf-8');
      const videoLines = videosContent.split('\n').filter(l => l.trim());

      console.log(`[DatabaseManager] Migrating ${videoLines.length - 1} videos...`);

      for (let i = 1; i < videoLines.length; i++) {
        try {
          const parts = videoLines[i].split(',');

          if (parts.length >= 5) {
            await this.pg.query(
              `INSERT INTO videos (filename, file_path, tema, pilar, viral_potential, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (filename) DO UPDATE
               SET tema = EXCLUDED.tema, pilar = EXCLUDED.pilar`,
              [
                parts[0].trim(),
                parts[1].trim(),
                parts[2].trim(),
                parts[3].trim(),
                parseInt(parts[4]) || 50,
                JSON.stringify({ migrated_at: new Date().toISOString() }),
              ]
            );

            csvRowsProcessed++;
            dbRowsInserted++;
          }
        } catch (err) {
          errors++;
          console.warn(`[DatabaseManager] Error migrating video row ${i}: ${err}`);
        }
      }
    } catch (err) {
      console.warn(`[DatabaseManager] Videos CSV not found, skipping: ${err}`);
    }

    // 2. Migrar histórico de posts
    const postsCSV = path.join(input.socialHubPath, 'DATA', 'posts_history.csv');

    try {
      const postsContent = await fs.readFile(postsCSV, 'utf-8');
      const postLines = postsContent.split('\n').filter(l => l.trim());

      console.log(`[DatabaseManager] Migrating ${postLines.length - 1} posts...`);

      for (let i = 1; i < postLines.length; i++) {
        try {
          const parts = postLines[i].split(',');

          if (parts.length >= 4) {
            // Parse scheduled datetime
            const date = parts[1].trim();
            const time = parts[5]?.trim() || '12:00';

            await this.pg.query(
              `INSERT INTO posts (pagina, scheduled_date, scheduled_time, grupo_conteudo, status, publer_job_id)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (publer_job_id) DO NOTHING`,
              [
                parts[0].trim(),
                date,
                time,
                parts[2].trim(),
                'published',
                parts[4]?.trim() || null,
              ]
            );

            csvRowsProcessed++;
            dbRowsInserted++;
          }
        } catch (err) {
          errors++;
          console.warn(`[DatabaseManager] Error migrating post row ${i}: ${err}`);
        }
      }
    } catch (err) {
      console.warn(`[DatabaseManager] Posts CSV not found, skipping: ${err}`);
    }

    console.log(
      `[DatabaseManager] ✓ Migration complete: ${csvRowsProcessed} rows processed, ${dbRowsInserted} inserted, ${errors} errors`
    );

    return {
      success: true,
      data: {
        operation: 'migrate',
        migrationStatus: {
          csvRowsProcessed,
          dbRowsInserted,
          errors,
        },
      },
    };
  }

  /**
   * Insere registros
   */
  private async insertRecords(
    input: DatabaseManagerInput
  ): Promise<DatabaseManagerOutput> {
    if (!input.data?.table || !input.data?.records) {
      return {
        success: false,
        error: 'Missing table or records',
      };
    }

    const { table, records } = input.data;
    let recordsAffected = 0;

    for (const record of records) {
      try {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        await this.pg.query(query, values);
        recordsAffected++;
      } catch (error) {
        console.warn(`[DatabaseManager] Error inserting record: ${error}`);
      }
    }

    console.log(`[DatabaseManager] ✓ Inserted ${recordsAffected} records into ${table}`);

    return {
      success: true,
      data: {
        operation: 'insert',
        recordsAffected,
      },
    };
  }

  /**
   * Executa query
   */
  private async executeQuery(
    input: DatabaseManagerInput
  ): Promise<DatabaseManagerOutput> {
    if (!input.data?.query) {
      return {
        success: false,
        error: 'Missing query',
      };
    }

    const { query, params } = input.data;

    const result = await this.pg.query(query, params || []);

    console.log(`[DatabaseManager] Query executed: ${result.rowCount} rows`);

    return {
      success: true,
      data: {
        operation: 'query',
        recordsAffected: result.rowCount,
        results: result.rows,
      },
    };
  }

  /**
   * Backup do banco
   */
  private async backupDatabase(
    input: DatabaseManagerInput
  ): Promise<DatabaseManagerOutput> {
    const { execSync } = require('child_process');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `/tmp/social_hub_backup_${timestamp}.sql`;

    try {
      execSync(
        `pg_dump ${input.connectionString || process.env.DATABASE_URL} > ${backupFile}`
      );

      console.log(`[DatabaseManager] ✓ Backup created: ${backupFile}`);

      return {
        success: true,
        data: {
          operation: 'backup',
          results: [{ backupFile }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Backup failed: ${error}`,
      };
    }
  }
}
