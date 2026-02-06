/**
 * Hub Enterprise - DADOS Persona (S-07)
 * Data Engineer: Analytics, dashboards, ETL, data quality
 * Usa Claude AI para análise e visualização de dados
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  AnalyticsDashboard,
  DashboardPanel,
  DashboardAlert,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseDadosSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('dados');

  constructor() {
    super(
      {
        name: 'hub-enterprise-dados',
        description: 'Data Engineer persona - Analytics and data pipelines',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'data', 'analytics', 'etl', 'dashboards'],
      },
      {
        timeout: 300000, // 5 minutes
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const subskill = input.params?.subskill;
    const appName = input.params?.appName;

    if (!subskill || !appName) {
      this.logger.error('Missing required parameters', {
        subskill,
        appName,
      });
      return false;
    }

    const validSubskills = [
      'create_dashboard',
      'setup_analytics',
      'data_pipeline',
      'query_optimization',
      'data_quality',
      'export_report',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Dados subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'create_dashboard':
          result = await this.createDashboard(appName, params);
          break;
        case 'setup_analytics':
          result = await this.setupAnalytics(appName, params);
          break;
        case 'data_pipeline':
          result = await this.dataPipeline(appName, params);
          break;
        case 'query_optimization':
          result = await this.queryOptimization(appName, params);
          break;
        case 'data_quality':
          result = await this.dataQuality(appName, params);
          break;
        case 'export_report':
          result = await this.exportReport(appName, params);
          break;
        default:
          return this.error(`Unknown subskill: ${subskill}`);
      }

      const duration = Date.now() - startTime;

      this.logger.info(`Subskill ${subskill} completed`, { duration });

      return this.success(result, { duration });
    } catch (error) {
      this.logger.error(`Subskill ${subskill} failed`, { error });
      return this.error(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * S07-1: Create Dashboard
   * Grafana/Metabase dashboard
   */
  private async createDashboard(
    appName: string,
    params: any
  ): Promise<AnalyticsDashboard> {
    const tool = params.tool || 'Grafana';
    const metricsToTrack = params.metrics || [
      'user_signups',
      'active_users',
      'revenue',
      'error_rate',
    ];

    const prompt = `
Create analytics dashboard for "${appName}":

Tool: ${tool}
Metrics: ${metricsToTrack.join(', ')}
Time Range: ${params.timeRange || 'Last 30 days'}

Dashboard should include:
1. Key performance indicators (KPIs)
2. Time series charts
3. Comparison metrics (vs previous period)
4. Geographic distribution
5. User behavior funnels
6. Real-time metrics
7. Alert thresholds

Return JSON:
{
  "dashboard": {
    "url": "https://grafana.example.com/d/${appName}-overview",
    "panels": [
      {
        "name": "Daily Active Users",
        "type": "timeseries",
        "query": "SELECT COUNT(DISTINCT user_id) FROM events WHERE timestamp > NOW() - INTERVAL '30 days' GROUP BY DATE(timestamp)",
        "unit": "users",
        "thresholds": { "warning": 500, "critical": 200 }
      },
      {
        "name": "Revenue (MRR)",
        "type": "stat",
        "query": "SELECT SUM(amount) FROM subscriptions WHERE status='active'",
        "unit": "currency"
      },
      {
        "name": "Error Rate",
        "type": "gauge",
        "query": "SELECT (errors / total_requests) * 100 FROM metrics",
        "unit": "percent",
        "thresholds": { "warning": 1, "critical": 5 }
      }
    ],
    "refreshInterval": "1m"
  },
  "metrics": {
    "daily_active_users": 1250,
    "monthly_revenue": 45000,
    "error_rate": 0.3,
    "avg_response_time": 185
  },
  "dataQuality": {
    "completeness": 98,
    "accuracy": 95,
    "timeliness": "< 1 minute"
  },
  "exportSchedule": "daily at 9am",
  "alerts": [
    {
      "name": "Low Daily Active Users",
      "condition": "daily_active_users < 500",
      "threshold": 500,
      "frequency": "hourly"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a data engineer creating analytics dashboards.
Design informative, actionable dashboards with proper metrics. Output valid JSON only.`,
        maxTokens: 2500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        dashboard: parsed.dashboard,
        metrics: parsed.metrics || {},
        dataQuality: parsed.dataQuality,
        exportSchedule: parsed.exportSchedule,
        alerts: parsed.alerts || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse dashboard creation', { error });
      throw error;
    }
  }

  /**
   * S07-2: Setup Analytics
   * Google Analytics / Mixpanel integration
   */
  private async setupAnalytics(
    appName: string,
    params: any
  ): Promise<{ analyticsConfig: any; events: any[]; funnels: any[] }> {
    const platform = params.platform || 'Google Analytics';
    const eventsToTrack = params.events || [
      'page_view',
      'signup',
      'purchase',
      'feature_usage',
    ];

    const prompt = `
Setup analytics for "${appName}":

Platform: ${platform}
Events: ${eventsToTrack.join(', ')}
Privacy: ${params.privacy || 'GDPR compliant'}

Configure:
1. Event tracking
2. User properties
3. Conversion funnels
4. Custom dimensions
5. Goal tracking
6. E-commerce tracking (if applicable)
7. Privacy controls

Return JSON:
{
  "analyticsConfig": {
    "platform": "${platform}",
    "trackingId": "G-XXXXXXXXXX",
    "dataRetention": "14 months",
    "anonymizeIp": true,
    "cookieConsent": true
  },
  "events": [
    {
      "name": "user_signup",
      "parameters": ["method", "source"],
      "triggers": ["form_submit", "oauth_success"]
    },
    {
      "name": "purchase_completed",
      "parameters": ["amount", "currency", "items"],
      "triggers": ["payment_success"]
    }
  ],
  "funnels": [
    {
      "name": "Signup Flow",
      "steps": ["landing_page", "signup_form", "email_verification", "complete"],
      "conversionRate": 0.45
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a data analyst setting up analytics tracking.
Design comprehensive event tracking with privacy in mind. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        analyticsConfig: parsed.analyticsConfig,
        events: parsed.events || [],
        funnels: parsed.funnels || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse analytics setup', { error });
      throw error;
    }
  }

  /**
   * S07-3: Data Pipeline
   * ETL/ELT pipeline setup
   */
  private async dataPipeline(
    appName: string,
    params: any
  ): Promise<{ pipeline: any; stages: any[]; schedule: string }> {
    const sources = params.sources || ['PostgreSQL', 'API logs', 'User events'];
    const destination = params.destination || 'Data Warehouse';

    const prompt = `
Setup data pipeline for "${appName}":

Sources: ${sources.join(', ')}
Destination: ${destination}
Volume: ${params.volume || '100k events/day'}
Latency: ${params.latency || 'Near real-time'}

Pipeline stages:
1. Extract: Pull data from sources
2. Transform: Clean, enrich, aggregate
3. Load: Write to warehouse
4. Validation: Data quality checks
5. Monitoring: Pipeline health

Return JSON:
{
  "pipeline": {
    "name": "${appName}-etl",
    "tool": "Apache Airflow",
    "sources": ${JSON.stringify(sources)},
    "destination": "${destination}",
    "latency": "< 5 minutes",
    "reliability": "99.9%"
  },
  "stages": [
    {
      "name": "extract",
      "source": "PostgreSQL",
      "method": "CDC (Change Data Capture)",
      "frequency": "continuous"
    },
    {
      "name": "transform",
      "operations": ["deduplicate", "enrich_geo", "aggregate_metrics"],
      "tool": "dbt"
    },
    {
      "name": "load",
      "destination": "BigQuery",
      "method": "streaming insert",
      "partitioning": "by date"
    }
  ],
  "schedule": "Continuous with 5min micro-batches"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a data engineer designing ETL pipelines.
Create reliable, scalable data pipelines. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        pipeline: parsed.pipeline,
        stages: parsed.stages || [],
        schedule: parsed.schedule,
      };
    } catch (error) {
      this.logger.error('Failed to parse data pipeline', { error });
      throw error;
    }
  }

  /**
   * S07-4: Query Optimization
   * Database performance tuning
   */
  private async queryOptimization(
    appName: string,
    params: any
  ): Promise<{ optimizations: any[]; expectedImprovement: string }> {
    const slowQueries = params.slowQueries || [];
    const database = params.database || 'PostgreSQL';

    const prompt = `
Optimize database queries for "${appName}":

Database: ${database}
Slow Queries: ${slowQueries.length || 5}
Target: ${params.target || 'Response time < 100ms'}

Analyze and optimize:
1. Missing indexes
2. N+1 query problems
3. Full table scans
4. Inefficient joins
5. Subquery optimization
6. Query plan analysis

Return JSON:
{
  "optimizations": [
    {
      "query": "SELECT * FROM users WHERE email = ?",
      "issue": "Full table scan",
      "recommendation": "Add index on email column",
      "expectedImprovement": "10x faster",
      "sql": "CREATE INDEX idx_users_email ON users(email)"
    },
    {
      "query": "SELECT u.*, COUNT(p.id) FROM users u LEFT JOIN posts p ON...",
      "issue": "N+1 query when loading user posts",
      "recommendation": "Use eager loading or join",
      "expectedImprovement": "50% reduction in queries"
    }
  ],
  "expectedImprovement": "Average query time from 450ms to 85ms"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a database performance specialist.
Identify bottlenecks and provide actionable optimizations. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        optimizations: parsed.optimizations || [],
        expectedImprovement: parsed.expectedImprovement,
      };
    } catch (error) {
      this.logger.error('Failed to parse query optimization', { error });
      throw error;
    }
  }

  /**
   * S07-5: Data Quality
   * Validation rules and monitoring
   */
  private async dataQuality(
    appName: string,
    params: any
  ): Promise<{ qualityChecks: any[]; issues: any[]; score: number }> {
    const datasets = params.datasets || ['users', 'orders', 'events'];

    const prompt = `
Implement data quality checks for "${appName}":

Datasets: ${datasets.join(', ')}
Dimensions: Completeness, Accuracy, Consistency, Timeliness

Quality checks:
1. Null value detection
2. Format validation
3. Range checks
4. Referential integrity
5. Duplicate detection
6. Schema validation
7. Freshness checks

Return JSON:
{
  "qualityChecks": [
    {
      "dataset": "users",
      "check": "email_format",
      "rule": "Valid email format",
      "passing": 9850,
      "failing": 15,
      "passRate": 99.85
    },
    {
      "dataset": "orders",
      "check": "amount_range",
      "rule": "amount > 0 AND amount < 100000",
      "passing": 12340,
      "failing": 2,
      "passRate": 99.98
    }
  ],
  "issues": [
    {
      "dataset": "users",
      "issue": "15 users with invalid email format",
      "severity": "medium",
      "recommendation": "Add validation on signup form"
    }
  ],
  "score": 97
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a data quality engineer.
Design comprehensive validation rules. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        qualityChecks: parsed.qualityChecks || [],
        issues: parsed.issues || [],
        score: parsed.score || 0,
      };
    } catch (error) {
      this.logger.error('Failed to parse data quality', { error });
      throw error;
    }
  }

  /**
   * S07-6: Export Report
   * Scheduled report generation
   */
  private async exportReport(
    appName: string,
    params: any
  ): Promise<{ report: any; schedule: string; recipients: string[] }> {
    const reportType = params.reportType || 'weekly-summary';
    const metrics = params.metrics || ['users', 'revenue', 'engagement'];

    const prompt = `
Setup automated report for "${appName}":

Report Type: ${reportType}
Metrics: ${metrics.join(', ')}
Format: ${params.format || 'PDF and CSV'}
Recipients: ${params.recipients || 'stakeholders@example.com'}

Report should include:
1. Executive summary
2. Key metrics and trends
3. Visualizations (charts, graphs)
4. Period comparisons
5. Insights and recommendations
6. Data tables

Return JSON:
{
  "report": {
    "name": "${reportType}",
    "sections": [
      {
        "title": "Executive Summary",
        "content": "Weekly performance overview"
      },
      {
        "title": "User Metrics",
        "metrics": ["new_users", "active_users", "churn_rate"],
        "visualization": "time_series_chart"
      },
      {
        "title": "Revenue Analysis",
        "metrics": ["mrr", "arr", "ltv"],
        "visualization": "bar_chart"
      }
    ],
    "format": ["pdf", "csv"],
    "delivery": "email"
  },
  "schedule": "Every Monday at 9am UTC",
  "recipients": [
    "ceo@example.com",
    "product@example.com",
    "analytics@example.com"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a data analyst creating automated reports.
Design informative, actionable reports for stakeholders. Output valid JSON only.`,
        maxTokens: 1500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        report: parsed.report,
        schedule: parsed.schedule,
        recipients: parsed.recipients || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse report export', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseDadosSkill(): HubEnterpriseDadosSkill {
  return new HubEnterpriseDadosSkill();
}
