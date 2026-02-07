/**
 * Hub Enterprise - PERFORMANCE Persona (S-09)
 * Performance Engineer: Load testing, optimization, capacity planning, SLO monitoring
 * Usa Claude AI para análise e otimização de performance
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  PerformanceAnalysis,
  Bottleneck,
  PerformanceMetrics,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterprisePerformanceSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('performance');

  constructor() {
    super(
      {
        name: 'hub-enterprise-performance',
        description: 'Performance Engineer persona - Optimization and load testing',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'performance', 'optimization', 'load-testing'],
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
      'performance_audit',
      'load_testing',
      'capacity_planning',
      'slo_monitoring',
      'optimize_queries',
      'caching_strategy',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Performance subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'performance_audit':
          result = await this.performanceAudit(appName, params);
          break;
        case 'load_testing':
          result = await this.loadTesting(appName, params);
          break;
        case 'capacity_planning':
          result = await this.capacityPlanning(appName, params);
          break;
        case 'slo_monitoring':
          result = await this.sloMonitoring(appName, params);
          break;
        case 'optimize_queries':
          result = await this.optimizeQueries(appName, params);
          break;
        case 'caching_strategy':
          result = await this.cachingStrategy(appName, params);
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
   * S09-1: Performance Audit
   * Identify performance bottlenecks
   */
  private async performanceAudit(
    appName: string,
    params: any
  ): Promise<PerformanceAnalysis> {
    const url = params.url || 'https://example.com';
    const environment = params.environment || 'production';

    const prompt = `
Perform performance audit for "${appName}":

URL: ${url}
Environment: ${environment}
Current metrics:
- Avg response time: ${params.avgResponseTime || 450}ms
- P95 response time: ${params.p95 || 850}ms
- Throughput: ${params.throughput || 50} req/s
- Error rate: ${params.errorRate || 1.2}%

Analyze:
1. Frontend performance (bundle size, render time)
2. Backend response times
3. Database query performance
4. Network latency
5. Resource utilization
6. Third-party API calls
7. Caching effectiveness

Return JSON:
{
  "loadTest": {
    "totalRequests": 10000,
    "failedRequests": 120,
    "avgResponseTime": 450,
    "p50": 320,
    "p95": 850,
    "p99": 1450,
    "throughput": 50,
    "errorRate": 1.2
  },
  "bottlenecks": [
    {
      "location": "Database query in /api/users endpoint",
      "issue": "N+1 query loading user posts",
      "impact": "high",
      "suggestion": "Add eager loading or denormalize data"
    },
    {
      "location": "Frontend bundle size",
      "issue": "Main bundle is 2.5MB uncompressed",
      "impact": "high",
      "suggestion": "Code split by route and lazy load components"
    },
    {
      "location": "External API call to payment processor",
      "issue": "No timeout configured, blocking requests",
      "impact": "medium",
      "suggestion": "Add 5s timeout and implement retry logic"
    }
  ],
  "recommendations": [
    "Implement Redis caching for frequently accessed data",
    "Add database indexes on email and created_at columns",
    "Enable gzip compression for API responses",
    "Use CDN for static assets",
    "Implement connection pooling for database"
  ],
  "caching": {
    "strategy": "Redis for sessions and API responses",
    "expectedImprovement": "60% reduction in response time"
  },
  "scaling": {
    "currentCapacity": "50 req/s with 2 instances",
    "recommendedInstances": 4,
    "estimatedCost": "$200/month additional"
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a performance engineer identifying bottlenecks.
Provide detailed analysis with quantifiable improvements. Output valid JSON only.`,
        maxTokens: 3000,
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
        loadTest: parsed.loadTest,
        bottlenecks: parsed.bottlenecks || [],
        recommendations: parsed.recommendations || [],
        caching: parsed.caching,
        scaling: parsed.scaling,
      };
    } catch (error) {
      this.logger.error('Failed to parse performance audit', { error });
      throw error;
    }
  }

  /**
   * S09-2: Load Testing
   * k6/Locust load tests
   */
  private async loadTesting(
    appName: string,
    params: any
  ): Promise<{ loadTest: PerformanceMetrics; scenarios: any[] }> {
    const target = params.target || 'https://api.example.com';
    const virtualUsers = params.virtualUsers || 100;
    const duration = params.duration || '5m';

    const prompt = `
Run load test for "${appName}":

Target: ${target}
Virtual Users: ${virtualUsers}
Duration: ${duration}
Ramp-up: ${params.rampUp || '1m'}

Test scenarios:
1. Baseline - Normal traffic pattern
2. Spike - Sudden 5x increase
3. Stress - Find breaking point
4. Soak - Sustained load for memory leaks

Return JSON:
{
  "loadTest": {
    "totalRequests": 50000,
    "failedRequests": 350,
    "avgResponseTime": 285,
    "p50": 210,
    "p95": 520,
    "p99": 950,
    "throughput": 165,
    "errorRate": 0.7
  },
  "scenarios": [
    {
      "name": "Baseline",
      "virtualUsers": 50,
      "duration": "5m",
      "avgResponseTime": 195,
      "throughput": 85,
      "errorRate": 0.1,
      "result": "pass"
    },
    {
      "name": "Spike Test",
      "virtualUsers": 250,
      "duration": "2m",
      "avgResponseTime": 680,
      "throughput": 120,
      "errorRate": 2.5,
      "result": "degraded",
      "notes": "Response time degrades beyond 200 users"
    },
    {
      "name": "Stress Test",
      "virtualUsers": 500,
      "duration": "3m",
      "avgResponseTime": 1850,
      "throughput": 85,
      "errorRate": 15,
      "result": "fail",
      "notes": "System breaks at 450 concurrent users - database connections exhausted"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a performance engineer running load tests.
Provide realistic test results with actionable insights. Output valid JSON only.`,
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
        loadTest: parsed.loadTest,
        scenarios: parsed.scenarios || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse load testing results', { error });
      throw error;
    }
  }

  /**
   * S09-3: Capacity Planning
   * Resource forecasting
   */
  private async capacityPlanning(
    appName: string,
    params: any
  ): Promise<{ currentCapacity: any; forecast: any[]; recommendations: string[] }> {
    const currentLoad = params.currentLoad || '100 req/s';
    const growthRate = params.growthRate || '50% per quarter';

    const prompt = `
Create capacity plan for "${appName}":

Current Load: ${currentLoad}
Current Resources: ${params.currentResources || '2 instances, 4GB RAM each'}
Growth Rate: ${growthRate}
Forecast Period: ${params.forecastPeriod || '12 months'}

Plan for:
1. Current capacity and utilization
2. Growth projections (3, 6, 12 months)
3. Resource requirements
4. Cost estimates
5. Scaling triggers
6. Performance SLOs

Return JSON:
{
  "currentCapacity": {
    "maxThroughput": "150 req/s",
    "avgUtilization": "67%",
    "peakUtilization": "92%",
    "headroom": "8%",
    "status": "warning - needs scaling soon"
  },
  "forecast": [
    {
      "period": "3 months",
      "expectedLoad": "150 req/s",
      "requiredInstances": 3,
      "estimatedCost": "$300/month",
      "action": "Scale horizontally to 3 instances"
    },
    {
      "period": "6 months",
      "expectedLoad": "225 req/s",
      "requiredInstances": 5,
      "estimatedCost": "$500/month",
      "action": "Add read replicas for database"
    },
    {
      "period": "12 months",
      "expectedLoad": "450 req/s",
      "requiredInstances": 8,
      "estimatedCost": "$800/month",
      "action": "Consider microservices architecture"
    }
  ],
  "recommendations": [
    "Implement auto-scaling with CPU threshold at 70%",
    "Add caching layer to reduce database load by 40%",
    "Set up database read replicas before 6-month mark",
    "Monitor memory usage - current trend shows leak in session management"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a capacity planning specialist.
Create realistic forecasts with cost-effective scaling strategies. Output valid JSON only.`,
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
        currentCapacity: parsed.currentCapacity,
        forecast: parsed.forecast || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse capacity planning', { error });
      throw error;
    }
  }

  /**
   * S09-4: SLO Monitoring
   * SLO/SLA tracking and alerting
   */
  private async sloMonitoring(
    appName: string,
    params: any
  ): Promise<{ slos: any[]; currentStatus: string; violations: any[] }> {
    const sloTargets = params.sloTargets || {
      availability: '99.9%',
      latency: '200ms p95',
      errorRate: '< 0.5%',
    };

    const prompt = `
Setup SLO monitoring for "${appName}":

SLO Targets:
- Availability: ${sloTargets.availability}
- Latency: ${sloTargets.latency}
- Error Rate: ${sloTargets.errorRate}

Configure:
1. SLO definitions and error budgets
2. Measurement methodology
3. Alerting thresholds
4. Burn rate alerts
5. SLO dashboard

Return JSON:
{
  "slos": [
    {
      "name": "Availability SLO",
      "target": 99.9,
      "current": 99.94,
      "errorBudget": 0.1,
      "errorBudgetRemaining": 0.04,
      "status": "healthy",
      "measurement": "Uptime / Total time over 30-day window"
    },
    {
      "name": "Latency SLO (p95)",
      "target": 200,
      "current": 185,
      "errorBudget": 20,
      "errorBudgetRemaining": 15,
      "status": "healthy",
      "measurement": "95th percentile response time"
    },
    {
      "name": "Error Rate SLO",
      "target": 0.5,
      "current": 0.8,
      "errorBudget": 0.5,
      "errorBudgetRemaining": -0.3,
      "status": "breached",
      "measurement": "Failed requests / Total requests"
    }
  ],
  "currentStatus": "warning",
  "violations": [
    {
      "slo": "Error Rate SLO",
      "violatedAt": ${Date.now()},
      "severity": "high",
      "errorBudgetConsumed": 160,
      "action": "Investigate recent deployment v1.2.3"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE implementing SLO monitoring.
Design realistic SLOs with proper error budgets and alerting. Output valid JSON only.`,
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
        slos: parsed.slos || [],
        currentStatus: parsed.currentStatus,
        violations: parsed.violations || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse SLO monitoring', { error });
      throw error;
    }
  }

  /**
   * S09-5: Optimize Queries
   * Database query optimization
   */
  private async optimizeQueries(
    appName: string,
    params: any
  ): Promise<{ optimizations: any[]; expectedGains: string }> {
    const slowQueries = params.slowQueries || [];
    const database = params.database || 'PostgreSQL';

    const prompt = `
Optimize database queries for "${appName}":

Database: ${database}
Slow queries: ${slowQueries.length || 5} identified
Target: Sub-100ms query time

Optimize:
1. Missing indexes
2. Full table scans
3. Inefficient joins
4. N+1 queries
5. Unoptimized subqueries
6. Missing query hints

Return JSON:
{
  "optimizations": [
    {
      "query": "SELECT * FROM users WHERE email = $1",
      "currentTime": "450ms",
      "issue": "Full table scan on 500k rows",
      "solution": "Add B-tree index on email column",
      "sql": "CREATE INDEX CONCURRENTLY idx_users_email ON users(email)",
      "expectedTime": "8ms",
      "improvement": "56x faster"
    },
    {
      "query": "SELECT u.*, (SELECT COUNT(*) FROM posts WHERE user_id = u.id) FROM users u",
      "currentTime": "2800ms",
      "issue": "Subquery executed for each user (N+1)",
      "solution": "Use LEFT JOIN with GROUP BY",
      "sql": "SELECT u.*, COUNT(p.id) FROM users u LEFT JOIN posts p ON p.user_id = u.id GROUP BY u.id",
      "expectedTime": "180ms",
      "improvement": "15x faster"
    },
    {
      "query": "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days'",
      "currentTime": "650ms",
      "issue": "No index on created_at, scanning 2M rows",
      "solution": "Add index on created_at with partial index",
      "sql": "CREATE INDEX idx_orders_recent ON orders(created_at) WHERE created_at > NOW() - INTERVAL '90 days'",
      "expectedTime": "25ms",
      "improvement": "26x faster"
    }
  ],
  "expectedGains": "Average query time reduced from 1.3s to 71ms (18x improvement)"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a database performance expert.
Provide specific, actionable query optimizations with SQL. Output valid JSON only.`,
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
        optimizations: parsed.optimizations || [],
        expectedGains: parsed.expectedGains,
      };
    } catch (error) {
      this.logger.error('Failed to parse query optimizations', { error });
      throw error;
    }
  }

  /**
   * S09-6: Caching Strategy
   * Redis/CDN caching implementation
   */
  private async cachingStrategy(
    appName: string,
    params: any
  ): Promise<{ strategy: any; layers: any[]; expectedImprovement: string }> {
    const dataTypes = params.dataTypes || [
      'user sessions',
      'API responses',
      'static assets',
    ];

    const prompt = `
Design caching strategy for "${appName}":

Data types: ${dataTypes.join(', ')}
Current cache hit rate: ${params.cacheHitRate || 0}%
Target cache hit rate: ${params.targetHitRate || 80}%

Strategy should include:
1. Cache layers (CDN, application, database)
2. Cache keys and TTLs
3. Invalidation strategy
4. Cache warming
5. Monitoring and metrics

Return JSON:
{
  "strategy": {
    "approach": "Multi-layer caching with Redis and CDN",
    "hitRateTarget": 80,
    "estimatedCostSavings": "$400/month in database costs"
  },
  "layers": [
    {
      "layer": "CDN (CloudFront)",
      "purpose": "Static assets and public pages",
      "ttl": "1 day",
      "invalidation": "On deployment",
      "expectedHitRate": 95,
      "items": ["images", "CSS", "JS", "fonts", "landing pages"]
    },
    {
      "layer": "Application Cache (Redis)",
      "purpose": "Session data and API responses",
      "ttl": "5-60 minutes",
      "invalidation": "On data update",
      "expectedHitRate": 75,
      "items": ["user sessions", "user profiles", "product catalog"]
    },
    {
      "layer": "Database Query Cache",
      "purpose": "Frequent queries",
      "ttl": "5 minutes",
      "invalidation": "Time-based",
      "expectedHitRate": 60,
      "items": ["dashboard stats", "leaderboards", "popular posts"]
    }
  ],
  "expectedImprovement": "75% reduction in database load, 60% faster average response time"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a caching specialist designing strategies.
Create practical, effective caching architectures. Output valid JSON only.`,
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
        strategy: parsed.strategy,
        layers: parsed.layers || [],
        expectedImprovement: parsed.expectedImprovement,
      };
    } catch (error) {
      this.logger.error('Failed to parse caching strategy', { error });
      throw error;
    }
  }
}

export function createHubEnterprisePerformanceSkill(): HubEnterprisePerformanceSkill {
  return new HubEnterprisePerformanceSkill();
}
