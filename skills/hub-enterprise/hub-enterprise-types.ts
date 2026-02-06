/**
 * Hub Enterprise - TypeScript Types & Interfaces
 * Definições compartilhadas para todas as personas
 */

/**
 * Output padrão de qualquer persona
 */
export interface PersonaOutput {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: number;
}

/**
 * Entrada padrão para qualquer subskill
 */
export interface SubskillInput {
  skillId: string;
  subskill: string;
  appName?: string;
  params?: Record<string, any>;
}

/**
 * Scope de MVP
 */
export interface MVPScope {
  in: string[];
  out: string[];
}

/**
 * Feature definida
 */
export interface Feature {
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  description: string;
  estimatedHours?: number;
}

/**
 * Critério de aceite
 */
export interface AcceptanceCriteria {
  scenario: string;
  given: string;
  when: string;
  then: string;
}

/**
 * Risco identificado
 */
export interface Risk {
  risk: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

/**
 * MVP Definition Output (Produto persona)
 */
export interface MVPDefinition {
  mvp: {
    scope: MVPScope;
    features: Feature[];
    acceptanceCriteria: AcceptanceCriteria[];
    risks: Risk[];
  };
  estimatedDuration: string;
  recommendedStack: string[];
  constraints?: {
    budget?: number;
    timeline?: string;
    team?: number;
  };
}

/**
 * Architecture Definition Output (Arquitetura persona)
 */
export interface ArchitectureDefinition {
  architecture: {
    pattern: 'monolith' | 'microservices' | 'serverless' | 'hybrid';
    components: ArchitectureComponent[];
    dataFlow: string;
    integrations: Integration[];
  };
  techStack: {
    backend: string[];
    frontend: string[];
    database: string[];
    infrastructure: string[];
  };
  adrs: ArchitectureDecision[];
  scalingPlan: string;
  securityArchitecture: string;
}

/**
 * Component na arquitetura
 */
export interface ArchitectureComponent {
  name: string;
  tech: string;
  purpose: string;
  replicas?: number;
  dependencies?: string[];
}

/**
 * Integration point
 */
export interface Integration {
  service: string;
  protocol: string;
  authentication: string;
  rateLimits?: string;
}

/**
 * Architecture Decision Record
 */
export interface ArchitectureDecision {
  decision: string;
  rationale: string;
  alternatives: string[];
  consequences: string;
}

/**
 * Code Generation Output (Engenharia persona)
 */
export interface CodeGenerationOutput {
  appLocation: string;
  filesCreated: CodeFile[];
  endpoints: ApiEndpoint[];
  databaseTables: string[];
  nextSteps: string[];
  integrations: string[];
  cicdConfig?: string;
}

/**
 * Arquivo de código criado
 */
export interface CodeFile {
  path: string;
  size: number;
  content?: string; // Apenas para pequenos arquivos
  contentUrl?: string; // Para arquivos grandes
}

/**
 * Endpoint API definido
 */
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth: 'public' | 'jwt' | 'oauth';
  requestBody?: string;
  responseBody?: string;
}

/**
 * Test Results Output (QA persona)
 */
export interface TestResults {
  testResults: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: CoverageMetrics;
  };
  failures?: TestFailure[];
  blocked: boolean;
  reportLocation: string;
  performanceMetrics?: PerformanceMetrics;
}

/**
 * Cobertura de testes
 */
export interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

/**
 * Falha em teste
 */
export interface TestFailure {
  test: string;
  error: string;
  stack?: string;
  suggestion?: string;
}

/**
 * Métricas de performance
 */
export interface PerformanceMetrics {
  avgResponseTime: number; // ms
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // req/s
  errorRate: number; // %
}

/**
 * Security Audit Output (Security persona)
 */
export interface SecurityAudit {
  score: number; // 0-100
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: SecurityFinding[];
  compliance: ComplianceStatus;
  blockers: string[];
  recommendations: string[];
}

/**
 * Finding de segurança
 */
export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  location: string;
  description: string;
  recommendation: string;
  cveId?: string;
}

/**
 * Status de compliance
 */
export interface ComplianceStatus {
  lgpd?: 'compliant' | 'partial' | 'non-compliant';
  gdpr?: 'compliant' | 'partial' | 'non-compliant';
  soc2?: 'compliant' | 'partial' | 'non-compliant';
  hipaa?: 'compliant' | 'partial' | 'non-compliant';
  pci?: 'compliant' | 'partial' | 'non-compliant';
}

/**
 * Deployment Output (Ops persona)
 */
export interface DeploymentOutput {
  deployment: {
    strategy: 'blue-green' | 'canary' | 'rolling' | 'big-bang';
    status: 'pending' | 'in-progress' | 'completed' | 'rolled-back';
    version: string;
    previousVersion?: string;
    rollbackAvailable: boolean;
    duration: number; // seconds
  };
  infrastructure: {
    provider: 'aws' | 'gcp' | 'azure' | 'railway' | 'vercel';
    region: string;
    instances: number;
    loadBalancer?: string;
  };
  urls: {
    production?: string;
    staging?: string;
    monitoring?: string;
  };
  healthCheck: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: string;
    responseTime: number; // ms
    lastCheck: number; // timestamp
  };
  credentials?: string; // Path to .env file or vault
}

/**
 * Analytics Dashboard Output (Dados persona)
 */
export interface AnalyticsDashboard {
  dashboard: {
    url: string;
    panels: DashboardPanel[];
    refreshInterval: string;
  };
  metrics: Record<string, number | string>;
  dataQuality: {
    completeness: number; // %
    accuracy: number; // %
    timeliness: string; // hours
  };
  exportSchedule: string;
  alerts: DashboardAlert[];
}

/**
 * Panel em dashboard
 */
export interface DashboardPanel {
  name: string;
  type: 'timeseries' | 'gauge' | 'stat' | 'table' | 'heatmap';
  query: string;
  unit?: string;
  thresholds?: { warning: number; critical: number };
}

/**
 * Alert em dashboard
 */
export interface DashboardAlert {
  name: string;
  condition: string;
  threshold: number;
  frequency: string;
}

/**
 * Design System Output (Design persona)
 */
export interface DesignSystem {
  wireframes: {
    figmaUrl: string;
    pages: string[];
    components: string[];
    version: string;
  };
  designSystem: {
    colors: Record<string, string>;
    typography: Record<string, string>;
    spacing: number[];
    borderRadius: number[];
    shadows: string[];
  };
  accessibility: {
    wcagLevel: 'A' | 'AA' | 'AAA';
    score: number; // 0-100
    issues: AccessibilityIssue[];
  };
  prototype?: {
    url: string;
    notes: string;
  };
}

/**
 * Accessibility issue
 */
export interface AccessibilityIssue {
  type: string;
  severity: 'critical' | 'major' | 'minor';
  element: string;
  recommendation: string;
}

/**
 * Performance Analysis Output (Performance persona)
 */
export interface PerformanceAnalysis {
  loadTest: {
    totalRequests: number;
    failedRequests: number;
    avgResponseTime: number; // ms
    p50: number;
    p95: number;
    p99: number;
    throughput: number; // req/s
    errorRate: number; // %
  };
  bottlenecks: Bottleneck[];
  recommendations: string[];
  caching: {
    strategy: string;
    expectedImprovement: string;
  };
  scaling: {
    currentCapacity: string;
    recommendedInstances: number;
    estimatedCost: string;
  };
}

/**
 * Bottleneck identificado
 */
export interface Bottleneck {
  location: string;
  issue: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

/**
 * Orchestrator Workflow Step
 */
export interface WorkflowStep {
  persona: string;
  subskill?: string;
  status: 'pending' | 'in-progress' | 'success' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: string;
}

/**
 * Orchestrator Output
 */
export interface OrchestratorOutput {
  appName: string;
  workflow: string;
  workflowSteps: WorkflowStep[];
  summary: {
    totalDuration: number;
    successfulSteps: number;
    failedSteps: number;
    startedAt: number;
    completedAt: number;
  };
  appLocation?: string;
  deploymentUrl?: string;
  documentation?: string;
  artifacts?: string[];
  nextActions?: string[];
}
