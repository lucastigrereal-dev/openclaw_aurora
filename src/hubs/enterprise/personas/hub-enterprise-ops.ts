/**
 * Hub Enterprise - OPS Persona (S-05)
 * DevOps/SRE: Infrastructure, deployment, monitoring, incident response
 * Usa Claude AI para automação e troubleshooting
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  DeploymentOutput,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseOpsSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('ops');

  constructor() {
    super(
      {
        name: 'hub-enterprise-ops',
        description: 'DevOps/SRE persona - Infrastructure and operations',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'ops', 'devops', 'sre', 'infrastructure'],
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
      'provision_infrastructure',
      'setup_cicd',
      'deploy_production',
      'setup_monitoring',
      'setup_logging',
      'backup_restore',
      'incident_response',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Ops subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'provision_infrastructure':
          result = await this.provisionInfrastructure(appName, params);
          break;
        case 'setup_cicd':
          result = await this.setupCicd(appName, params);
          break;
        case 'deploy_production':
          result = await this.deployProduction(appName, params);
          break;
        case 'setup_monitoring':
          result = await this.setupMonitoring(appName, params);
          break;
        case 'setup_logging':
          result = await this.setupLogging(appName, params);
          break;
        case 'backup_restore':
          result = await this.backupRestore(appName, params);
          break;
        case 'incident_response':
          result = await this.incidentResponse(appName, params);
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
   * S05-1: Provision Infrastructure
   * Terraform/CloudFormation setup
   */
  private async provisionInfrastructure(
    appName: string,
    params: any
  ): Promise<{ infrastructure: any; terraformFiles: string[] }> {
    const provider = params.provider || 'aws';
    const region = params.region || 'us-east-1';

    const prompt = `
Provision infrastructure for "${appName}":

Provider: ${provider}
Region: ${region}
Environment: ${params.environment || 'production'}
Resources needed:
- Compute: ${params.compute || '2 instances'}
- Database: ${params.database || 'PostgreSQL RDS'}
- Storage: ${params.storage || 'S3'}
- Networking: ${params.networking || 'VPC, Load Balancer'}

Create Terraform configuration with:
1. VPC and subnets
2. Security groups
3. Load balancer
4. Auto-scaling group
5. RDS instance
6. S3 buckets
7. IAM roles and policies

Return JSON:
{
  "infrastructure": {
    "provider": "${provider}",
    "region": "${region}",
    "resources": {
      "vpc": "vpc-abc123",
      "subnets": ["subnet-1", "subnet-2"],
      "loadBalancer": "alb-xyz",
      "autoScaling": { "min": 2, "max": 10 },
      "database": "rds-postgres-primary",
      "storage": "s3-app-bucket"
    },
    "estimatedCost": "$450/month"
  },
  "terraformFiles": [
    "main.tf",
    "variables.tf",
    "outputs.tf",
    "vpc.tf",
    "compute.tf",
    "database.tf"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a DevOps engineer creating infrastructure as code.
Design secure, scalable infrastructure following cloud best practices. Output valid JSON only.`,
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
        infrastructure: parsed.infrastructure,
        terraformFiles: parsed.terraformFiles || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse infrastructure config', { error });
      throw error;
    }
  }

  /**
   * S05-2: Setup CI/CD
   * CI/CD pipeline automation
   */
  private async setupCicd(
    appName: string,
    params: any
  ): Promise<{ pipeline: any; stages: any[] }> {
    const tool = params.tool || 'GitHub Actions';

    const prompt = `
Setup CI/CD pipeline for "${appName}":

Tool: ${tool}
Environments: ${params.environments || 'staging, production'}
Deployment target: ${params.target || 'AWS ECS'}

Pipeline stages:
1. Code checkout
2. Dependency installation
3. Linting and formatting
4. Unit tests
5. Build
6. Integration tests
7. Security scan
8. Deploy to staging (auto)
9. Deploy to production (manual approval)
10. Post-deployment tests
11. Rollback on failure

Return JSON:
{
  "pipeline": {
    "tool": "${tool}",
    "configFile": ".github/workflows/deploy.yml",
    "triggers": ["push", "pull_request"],
    "branches": ["main", "develop"],
    "environments": ["staging", "production"]
  },
  "stages": [
    {
      "name": "test",
      "steps": ["install", "lint", "test"],
      "duration": "3m"
    },
    {
      "name": "build",
      "steps": ["build", "push-image"],
      "duration": "5m"
    },
    {
      "name": "deploy-staging",
      "steps": ["deploy", "smoke-test"],
      "duration": "2m"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a DevOps engineer configuring CI/CD pipelines.
Create robust, automated pipelines with proper gates. Output valid JSON only.`,
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
      };
    } catch (error) {
      this.logger.error('Failed to parse CI/CD config', { error });
      throw error;
    }
  }

  /**
   * S05-3: Deploy Production
   * Production deployment with rollback capability
   */
  private async deployProduction(
    appName: string,
    params: any
  ): Promise<DeploymentOutput> {
    const strategy = params.strategy || 'blue-green';
    const version = params.version || '1.0.0';

    const prompt = `
Deploy "${appName}" to production:

Strategy: ${strategy}
Version: ${version}
Previous version: ${params.previousVersion || '0.9.5'}

Deployment steps:
1. Pre-deployment checks
2. Database migrations
3. Deploy new version (${strategy})
4. Health checks
5. Traffic switching
6. Post-deployment validation
7. Rollback plan if needed

Return JSON:
{
  "deployment": {
    "strategy": "${strategy}",
    "status": "completed",
    "version": "${version}",
    "previousVersion": "0.9.5",
    "rollbackAvailable": true,
    "duration": 420
  },
  "infrastructure": {
    "provider": "aws",
    "region": "us-east-1",
    "instances": 4,
    "loadBalancer": "alb-production"
  },
  "urls": {
    "production": "https://app.example.com",
    "staging": "https://staging.app.example.com",
    "monitoring": "https://grafana.example.com"
  },
  "healthCheck": {
    "status": "healthy",
    "uptime": "99.98%",
    "responseTime": 145,
    "lastCheck": ${Date.now()}
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE deploying to production.
Ensure zero-downtime deployments with proper validation. Output valid JSON only.`,
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
        deployment: parsed.deployment,
        infrastructure: parsed.infrastructure,
        urls: parsed.urls,
        healthCheck: parsed.healthCheck,
      };
    } catch (error) {
      this.logger.error('Failed to parse deployment output', { error });
      throw error;
    }
  }

  /**
   * S05-4: Setup Monitoring
   * Prometheus/Grafana monitoring
   */
  private async setupMonitoring(
    appName: string,
    params: any
  ): Promise<{ monitoring: any; dashboards: any[]; alerts: any[] }> {
    const tools = params.tools || ['Prometheus', 'Grafana'];

    const prompt = `
Setup monitoring for "${appName}":

Tools: ${tools.join(', ')}
Metrics to track:
- Application metrics (request rate, latency, errors)
- Infrastructure metrics (CPU, memory, disk, network)
- Business metrics (signups, conversions, revenue)

Create:
1. Prometheus scrape configs
2. Grafana dashboards
3. Alert rules (critical, warning)
4. On-call rotation setup
5. Runbooks for common issues

Return JSON:
{
  "monitoring": {
    "prometheus": {
      "scrapeInterval": "15s",
      "retention": "30d",
      "targets": ["app:9090", "db:9100"]
    },
    "grafana": {
      "url": "https://grafana.example.com",
      "dashboards": 8
    }
  },
  "dashboards": [
    {
      "name": "Application Overview",
      "panels": 12,
      "metrics": ["request_rate", "latency_p95", "error_rate"]
    }
  ],
  "alerts": [
    {
      "name": "High Error Rate",
      "condition": "error_rate > 5%",
      "severity": "critical",
      "channels": ["pagerduty", "slack"]
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE setting up observability.
Create comprehensive monitoring with actionable alerts. Output valid JSON only.`,
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
        monitoring: parsed.monitoring,
        dashboards: parsed.dashboards || [],
        alerts: parsed.alerts || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse monitoring config', { error });
      throw error;
    }
  }

  /**
   * S05-5: Setup Logging
   * Centralized logging with ELK/Loki
   */
  private async setupLogging(
    appName: string,
    params: any
  ): Promise<{ logging: any; retention: string }> {
    const stack = params.stack || 'ELK';

    const prompt = `
Setup centralized logging for "${appName}":

Stack: ${stack}
Log sources:
- Application logs
- Access logs
- Error logs
- Audit logs

Configure:
1. Log aggregation
2. Parsing and structuring
3. Indexing and search
4. Retention policies
5. Log-based alerts

Return JSON:
{
  "logging": {
    "stack": "${stack}",
    "components": {
      "shipper": "Filebeat",
      "processor": "Logstash",
      "storage": "Elasticsearch",
      "visualization": "Kibana"
    },
    "indexPattern": "${appName}-logs-*",
    "dashboardUrl": "https://kibana.example.com"
  },
  "retention": "90 days"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE configuring centralized logging.
Design efficient, searchable logging systems. Output valid JSON only.`,
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
        logging: parsed.logging,
        retention: parsed.retention || '90 days',
      };
    } catch (error) {
      this.logger.error('Failed to parse logging config', { error });
      throw error;
    }
  }

  /**
   * S05-6: Backup & Restore
   * Automated backup and disaster recovery
   */
  private async backupRestore(
    appName: string,
    params: any
  ): Promise<{ backupConfig: any; restoreSteps: string[] }> {
    const frequency = params.frequency || 'daily';

    const prompt = `
Setup backup and restore for "${appName}":

Backup frequency: ${frequency}
Data to backup:
- Database (PostgreSQL)
- User uploads (S3)
- Configuration files
- Application state

Configure:
1. Automated backup schedule
2. Backup verification
3. Offsite storage
4. Retention policy
5. Restore procedures
6. DR runbook

Return JSON:
{
  "backupConfig": {
    "frequency": "${frequency}",
    "retention": "30 days",
    "destinations": ["s3://backups", "glacier"],
    "encryption": "AES-256",
    "verification": "automatic"
  },
  "restoreSteps": [
    "1. Stop application",
    "2. Download backup from S3",
    "3. Restore database",
    "4. Restore files",
    "5. Verify data integrity",
    "6. Start application"
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE implementing disaster recovery.
Design reliable backup systems with tested restore procedures. Output valid JSON only.`,
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
        backupConfig: parsed.backupConfig,
        restoreSteps: parsed.restoreSteps || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse backup config', { error });
      throw error;
    }
  }

  /**
   * S05-7: Incident Response
   * Execute incident response runbooks
   */
  private async incidentResponse(
    appName: string,
    params: any
  ): Promise<{ incident: any; actions: string[]; resolution: string }> {
    const incidentType = params.incidentType || 'service-down';
    const severity = params.severity || 'critical';

    const prompt = `
Respond to incident for "${appName}":

Incident Type: ${incidentType}
Severity: ${severity}
Symptoms: ${params.symptoms || 'Service unavailable, 503 errors'}

Execute incident response:
1. Assess impact
2. Gather metrics and logs
3. Identify root cause
4. Implement fix or workaround
5. Verify resolution
6. Post-incident review

Return JSON:
{
  "incident": {
    "id": "INC-${Date.now()}",
    "type": "${incidentType}",
    "severity": "${severity}",
    "startTime": ${Date.now()},
    "duration": "12 minutes",
    "impact": "50% of users affected"
  },
  "actions": [
    "Checked service health endpoints - all returning 503",
    "Reviewed recent deployments - v1.2.3 deployed 15min ago",
    "Checked database connections - connection pool exhausted",
    "Rolled back to v1.2.2",
    "Increased database connection pool size",
    "Service recovered"
  ],
  "resolution": "Rollback to previous version and increased DB connection pool from 10 to 50"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an SRE responding to production incidents.
Follow systematic troubleshooting and document actions taken. Output valid JSON only.`,
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
        incident: parsed.incident,
        actions: parsed.actions || [],
        resolution: parsed.resolution,
      };
    } catch (error) {
      this.logger.error('Failed to parse incident response', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseOpsSkill(): HubEnterpriseOpsSkill {
  return new HubEnterpriseOpsSkill();
}
