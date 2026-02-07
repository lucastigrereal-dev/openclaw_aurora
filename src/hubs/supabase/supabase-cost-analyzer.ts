/**
 * Supabase Archon - Cost Analyzer (S-28)
 * Analisa e otimiza custos de Supabase: tamanho do banco, bandwidth, funções, recomendações
 *
 * @version 1.0.0
 * @priority P2
 * @category UTIL
 * @status production-ready
 */

import { Skill, SkillInput, SkillOutput } from '../skill-base';
import { createLogger } from './supabase-logger';
import { getVault } from './supabase-vault-config';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Custo de armazenamento do banco de dados
 */
export interface DatabaseCost {
  usedGb: number;                    // GB usados
  costPerGb: number;                 // Custo por GB em USD
  estimatedMonthlyCost: number;      // Custo mensal estimado em USD
  tier: string;                      // Free / Pro / Enterprise
  projectedYearlyCost: number;       // Custo anual projetado
}

/**
 * Custo de egress (saída de dados)
 */
export interface EgressCost {
  gbTransferred: number;              // GB transferidos (mensal)
  costPerGb: number;                  // Custo por GB em USD
  estimatedMonthlyCost: number;      // Custo mensal estimado em USD
  includedGb: number;                 // GB inclusos no plano
  overage: number;                    // GB excedentes
}

/**
 * Custo de invocações de funções Edge
 */
export interface FunctionCost {
  monthlyInvocations: number;         // Invocações por mês
  costPerMillion: number;             // Custo por 1M de invocações em USD
  estimatedMonthlyCost: number;      // Custo mensal estimado em USD
  includedInvocations: number;        // Invocações inclusas no plano
  overageInvocations: number;         // Invocações excedentes
}

/**
 * Recomendação de otimização
 */
export interface CostOptimization {
  category: 'database' | 'egress' | 'functions' | 'general';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  estimatedSavings: number;           // Economia em USD por mês
  implementationComplexity: 'easy' | 'medium' | 'hard';
  timeToImplement: string;             // Ex: "1-2 hours", "1-3 days"
}

/**
 * Análise de plano (Free vs Pro vs Enterprise)
 */
export interface PlanAnalysis {
  currentPlan: 'free' | 'pro' | 'enterprise';
  estimatedMonthlyCost: number;      // Custo total mensal
  estimatedYearlyCost: number;       // Custo total anual
  isCurrentPlanOptimal: boolean;     // Se o plano atual é recomendado
  recommendedPlan: 'free' | 'pro' | 'enterprise';
  costDifferenceIfSwitched: number;  // Diferença de custo ao trocar (positivo = economiza)
}

/**
 * Breakdown de custos por componente
 */
export interface CostBreakdown {
  database: DatabaseCost;
  egress: EgressCost;
  functions: FunctionCost;
  other: number;                      // Outros custos em USD/mês
  total: number;                      // Total em USD/mês
}

/**
 * Parâmetros de entrada do skill
 */
export interface CostAnalyzerParams extends SkillInput {
  supabaseUrl?: string;
  supabaseKey?: string;
  includeOptimizations?: boolean;    // Gerar recomendações (default: true)
  projectMonths?: number;            // Meses para projetar custos (default: 12)
  currentPlan?: 'free' | 'pro' | 'enterprise'; // Plano atual
}

/**
 * Resultado do skill
 */
export interface CostAnalyzerResult extends SkillOutput {
  data?: {
    breakdown: CostBreakdown;
    planAnalysis: PlanAnalysis;
    optimizations: CostOptimization[];
    projectedCosts: {
      monthly: number;
      quarterly: number;
      yearly: number;
    };
    costTrends: {
      period: string;
      monthlyAverage: number;
      growthRate: number;              // Percentual de crescimento
    };
    alerts: Array<{
      level: 'info' | 'warning' | 'critical';
      message: string;
      component: string;
    }>;
    timestamp: string;
    analysisDuration: number;          // tempo gasto em ms
  };
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

/**
 * Cost Analyzer - Analisa e otimiza custos de Supabase
 */
export class SupabaseCostAnalyzer extends Skill {
  private logger = createLogger('cost-analyzer');

  constructor() {
    super(
      {
        name: 'supabase-cost-analyzer',
        description:
          'Analyze and optimize Supabase costs: database size, egress bandwidth, function invocations, storage tier recommendations, and cost optimization tips',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Supabase Archon',
        tags: ['supabase', 'cost-analysis', 'optimization', 'billing', 'budgeting'],
      },
      {
        timeout: 30000, // 30 segundos
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as CostAnalyzerParams;

    // Validar plano se fornecido
    if (typed.currentPlan) {
      const validPlans = ['free', 'pro', 'enterprise'];
      if (!validPlans.includes(typed.currentPlan)) {
        this.logger.warn('Invalid plan specified', {
          plan: typed.currentPlan,
        });
        return false;
      }
    }

    // Validar meses de projeção se fornecido
    if (typed.projectMonths && (typed.projectMonths < 1 || typed.projectMonths > 60)) {
      this.logger.warn('Invalid projectMonths specified', {
        months: typed.projectMonths,
      });
      return false;
    }

    return true;
  }

  /**
   * Executa análise de custos
   */
  async execute(params: SkillInput): Promise<CostAnalyzerResult> {
    const typed = params as CostAnalyzerParams;
    const startTime = Date.now();

    this.logger.info('Cost Analyzer iniciado', {
      plan: typed.currentPlan || 'unknown',
      includeOptimizations: typed.includeOptimizations !== false,
    });

    try {
      // Obter credenciais do vault se não fornecidas
      const vault = getVault();
      const url = typed.supabaseUrl || vault.get('SUPABASE_URL');
      const key = typed.supabaseKey || vault.get('SUPABASE_KEY');

      if (!url || !key) {
        throw new Error('Supabase credentials not found in params or vault');
      }

      const projectMonths = typed.projectMonths || 12;
      const currentPlan = typed.currentPlan || 'pro';
      const includeOptimizations = typed.includeOptimizations !== false;

      this.logger.debug('Collecting cost data', {
        plan: currentPlan,
        projectMonths,
      });

      // Coletar dados de custo em paralelo quando possível
      const [dbCost, egressCost, functionCost] = await Promise.all([
        this.collectDatabaseCost(url, key, currentPlan),
        this.collectEgressCost(url, key, currentPlan),
        this.collectFunctionCost(url, key, currentPlan),
      ]);

      // Construir breakdown de custos
      const breakdown = this.buildCostBreakdown(dbCost, egressCost, functionCost);

      // Analisar plano recomendado
      const planAnalysis = this.analyzePlan(breakdown, currentPlan);

      // Gerar recomendações
      const optimizations = includeOptimizations
        ? this.generateOptimizations(breakdown, planAnalysis)
        : [];

      // Calcular alertas
      const alerts = this.generateAlerts(breakdown);

      // Projetar custos futuros
      const projectedCosts = this.projectCosts(breakdown.total, projectMonths);

      // Calcular tendências
      const costTrends = this.calculateTrends(breakdown.total);

      const duration = Date.now() - startTime;

      this.logger.info('Cost analysis completed', {
        totalMonthlyCost: breakdown.total,
        currentPlan,
        recommendedPlan: planAnalysis.recommendedPlan,
        optimizationCount: optimizations.length,
        alertCount: alerts.length,
      });

      return {
        success: true,
        data: {
          breakdown,
          planAnalysis,
          optimizations,
          projectedCosts,
          costTrends,
          alerts,
          timestamp: new Date().toISOString(),
          analysisDuration: duration,
        },
      };
    } catch (error: any) {
      this.logger.error('Cost Analyzer failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Coleta custo de banco de dados (mock para prototipagem)
   */
  private async collectDatabaseCost(
    _url: string,
    _key: string,
    plan: string
  ): Promise<DatabaseCost> {
    this.logger.debug('Collecting database cost');

    // TODO: Implementar coleta real via Supabase Management API
    // Por enquanto, retorna dados mock
    const usedGb = Math.floor(Math.random() * 30) + 5; // 5-35 GB
    let costPerGb = 0;
    let tier = 'Free';

    if (plan === 'free') {
      costPerGb = 0; // 500MB inclusos
      tier = 'Free';
    } else if (plan === 'pro') {
      costPerGb = 0.125; // $0.125 por GB após 8GB inclusos
      tier = 'Pro';
    } else {
      costPerGb = 0.1; // Contato para volume
      tier = 'Enterprise';
    }

    const estimatedMonthlyCost = this.calculateDatabaseCost(usedGb, costPerGb, plan);
    const projectedYearlyCost = estimatedMonthlyCost * 12;

    return {
      usedGb,
      costPerGb,
      estimatedMonthlyCost,
      tier,
      projectedYearlyCost,
    };
  }

  /**
   * Coleta custo de egress (mock para prototipagem)
   */
  private async collectEgressCost(
    _url: string,
    _key: string,
    plan: string
  ): Promise<EgressCost> {
    this.logger.debug('Collecting egress cost');

    // TODO: Implementar coleta real via Supabase Management API
    // Por enquanto, retorna dados mock
    const gbTransferred = Math.floor(Math.random() * 500) + 100; // 100-600 GB/mês
    const costPerGb = 0.14; // $0.14 por GB excedente (padrão internacional)

    let includedGb = 0;
    if (plan === 'free') {
      includedGb = 2; // 2GB inclusos
    } else if (plan === 'pro') {
      includedGb = 50; // 50GB inclusos
    } else {
      includedGb = 1000; // 1TB inclusos
    }

    const overage = Math.max(0, gbTransferred - includedGb);
    const estimatedMonthlyCost = overage * costPerGb;

    return {
      gbTransferred,
      costPerGb,
      estimatedMonthlyCost,
      includedGb,
      overage,
    };
  }

  /**
   * Coleta custo de invocações de funções (mock para prototipagem)
   */
  private async collectFunctionCost(
    _url: string,
    _key: string,
    plan: string
  ): Promise<FunctionCost> {
    this.logger.debug('Collecting function cost');

    // TODO: Implementar coleta real via Edge Functions API
    // Por enquanto, retorna dados mock
    const monthlyInvocations = Math.floor(Math.random() * 10000000) + 1000000; // 1M-11M
    const costPerMillion = 0.5; // $0.50 por 1M de invocações

    let includedInvocations = 0;
    if (plan === 'free') {
      includedInvocations = 100000; // 100k inclusos
    } else if (plan === 'pro') {
      includedInvocations = 500000; // 500k inclusos
    } else {
      includedInvocations = 5000000; // 5M inclusos
    }

    const overageInvocations = Math.max(0, monthlyInvocations - includedInvocations);
    const estimatedMonthlyCost = (overageInvocations / 1000000) * costPerMillion;

    return {
      monthlyInvocations,
      costPerMillion,
      estimatedMonthlyCost,
      includedInvocations,
      overageInvocations,
    };
  }

  /**
   * Calcula custo de banco de dados baseado em plano
   */
  private calculateDatabaseCost(usedGb: number, costPerGb: number, plan: string): number {
    if (plan === 'free') {
      return 0; // 500MB inclusos gratuitamente
    } else if (plan === 'pro') {
      const includedGb = 8; // 8GB inclusos no Pro
      const overageGb = Math.max(0, usedGb - includedGb);
      return overageGb * costPerGb;
    } else {
      // Enterprise - contato para cotação
      return 0;
    }
  }

  /**
   * Constrói breakdown de custos
   */
  private buildCostBreakdown(
    dbCost: DatabaseCost,
    egressCost: EgressCost,
    functionCost: FunctionCost
  ): CostBreakdown {
    const otherCosts = 0; // Pode incluir storage, realtime, auth, etc.
    const total = dbCost.estimatedMonthlyCost + egressCost.estimatedMonthlyCost + functionCost.estimatedMonthlyCost + otherCosts;

    return {
      database: dbCost,
      egress: egressCost,
      functions: functionCost,
      other: otherCosts,
      total,
    };
  }

  /**
   * Analisa plano recomendado
   */
  private analyzePlan(breakdown: CostBreakdown, currentPlan: string): PlanAnalysis {
    const estimatedMonthlyCost = breakdown.total;
    const estimatedYearlyCost = estimatedMonthlyCost * 12;

    // Lógica de recomendação de plano
    let recommendedPlan = currentPlan;
    let isCurrentPlanOptimal = true;
    let costDifference = 0;

    if (currentPlan === 'free') {
      if (estimatedMonthlyCost > 5) {
        // Se custo estimado > $5, considerar Pro
        recommendedPlan = 'pro';
        isCurrentPlanOptimal = false;
        costDifference = 25 - estimatedMonthlyCost; // Pro começa em $25
      }
    } else if (currentPlan === 'pro') {
      if (estimatedMonthlyCost > 100) {
        // Se custo estimado > $100, considerar Enterprise
        recommendedPlan = 'enterprise';
        isCurrentPlanOptimal = false;
        costDifference = 500 - estimatedMonthlyCost; // Enterprise começa em ~$500
      } else if (estimatedMonthlyCost < 5) {
        // Se custo estimado < $5, considerar Free
        recommendedPlan = 'free';
        isCurrentPlanOptimal = false;
        costDifference = estimatedMonthlyCost; // Economiza todo o custo
      }
    } else if (currentPlan === 'enterprise') {
      if (estimatedMonthlyCost < 100) {
        // Se custo estimado < $100, considerar Pro
        recommendedPlan = 'pro';
        isCurrentPlanOptimal = false;
        costDifference = estimatedMonthlyCost - 100; // Pode economizar
      }
    }

    return {
      currentPlan: currentPlan as 'free' | 'pro' | 'enterprise',
      estimatedMonthlyCost,
      estimatedYearlyCost,
      isCurrentPlanOptimal,
      recommendedPlan: recommendedPlan as 'free' | 'pro' | 'enterprise',
      costDifferenceIfSwitched: costDifference,
    };
  }

  /**
   * Gera recomendações de otimização
   */
  private generateOptimizations(
    breakdown: CostBreakdown,
    planAnalysis: PlanAnalysis
  ): CostOptimization[] {
    const optimizations: CostOptimization[] = [];

    // Recomendação 1: Trocar de plano se recomendado
    if (!planAnalysis.isCurrentPlanOptimal && planAnalysis.costDifferenceIfSwitched > 0) {
      optimizations.push({
        category: 'general',
        priority: 'high',
        recommendation: `Switch from ${planAnalysis.currentPlan} to ${planAnalysis.recommendedPlan} plan`,
        estimatedSavings: planAnalysis.costDifferenceIfSwitched,
        implementationComplexity: 'easy',
        timeToImplement: '5-10 minutes',
      });
    }

    // Recomendação 2: Reduzir egress
    if (breakdown.egress.estimatedMonthlyCost > 50) {
      optimizations.push({
        category: 'egress',
        priority: 'high',
        recommendation: 'Implement caching and CDN to reduce egress bandwidth',
        estimatedSavings: breakdown.egress.estimatedMonthlyCost * 0.3,
        implementationComplexity: 'medium',
        timeToImplement: '2-4 hours',
      });
    }

    // Recomendação 3: Otimizar banco de dados
    if (breakdown.database.estimatedMonthlyCost > 20) {
      optimizations.push({
        category: 'database',
        priority: 'medium',
        recommendation: 'Archive old data and implement retention policies to reduce storage',
        estimatedSavings: breakdown.database.estimatedMonthlyCost * 0.25,
        implementationComplexity: 'hard',
        timeToImplement: '2-3 days',
      });
    }

    // Recomendação 4: Otimizar funções
    if (breakdown.functions.estimatedMonthlyCost > 10) {
      optimizations.push({
        category: 'functions',
        priority: 'medium',
        recommendation: 'Batch process requests and optimize function execution time',
        estimatedSavings: breakdown.functions.estimatedMonthlyCost * 0.4,
        implementationComplexity: 'medium',
        timeToImplement: '1-2 days',
      });
    }

    // Recomendação 5: Usar conexão pooling
    optimizations.push({
      category: 'database',
      priority: 'low',
      recommendation: 'Implement connection pooling to improve performance and reduce overhead',
      estimatedSavings: 5,
      implementationComplexity: 'easy',
      timeToImplement: '30-60 minutes',
    });

    return optimizations;
  }

  /**
   * Gera alertas de custo
   */
  private generateAlerts(breakdown: CostBreakdown): Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    component: string;
  }> {
    const alerts: Array<{
      level: 'info' | 'warning' | 'critical';
      message: string;
      component: string;
    }> = [];

    // Alerta: Custo total elevado
    if (breakdown.total > 500) {
      alerts.push({
        level: 'critical',
        message: `Total monthly cost is very high: $${breakdown.total.toFixed(2)}`,
        component: 'budget',
      });
    } else if (breakdown.total > 100) {
      alerts.push({
        level: 'warning',
        message: `Total monthly cost is high: $${breakdown.total.toFixed(2)}`,
        component: 'budget',
      });
    }

    // Alerta: Egress elevado
    if (breakdown.egress.overage > 100) {
      alerts.push({
        level: 'warning',
        message: `High egress usage: ${breakdown.egress.gbTransferred}GB (${breakdown.egress.overage}GB overage)`,
        component: 'egress',
      });
    }

    // Alerta: Banco de dados crescendo
    if (breakdown.database.usedGb > 50) {
      alerts.push({
        level: 'info',
        message: `Database size is significant: ${breakdown.database.usedGb}GB. Consider archiving old data.`,
        component: 'database',
      });
    }

    // Alerta: Funções com muitas invocações
    if (breakdown.functions.monthlyInvocations > 10000000) {
      alerts.push({
        level: 'info',
        message: `High function invocations: ${(breakdown.functions.monthlyInvocations / 1000000).toFixed(1)}M/month. Optimization recommended.`,
        component: 'functions',
      });
    }

    return alerts;
  }

  /**
   * Projeta custos futuros
   */
  private projectCosts(
    monthlyBase: number,
    projectMonths: number
  ): {
    monthly: number;
    quarterly: number;
    yearly: number;
  } {
    // Assumir crescimento de 5% ao mês (conservador)
    const growthRate = 0.05;

    let quarterlyTotal = 0;
    let yearlyTotal = 0;

    for (let month = 1; month <= Math.min(12, projectMonths); month++) {
      const monthCost = monthlyBase * Math.pow(1 + growthRate, month - 1);
      if (month <= 3) quarterlyTotal += monthCost;
      yearlyTotal += monthCost;
    }

    const projectedMonthly = monthlyBase * Math.pow(1 + growthRate, 1);
    const projectedQuarterly = monthlyBase * Math.pow(1 + growthRate, 3);
    const projectedYearly = yearlyTotal;

    return {
      monthly: Math.round(projectedMonthly * 100) / 100,
      quarterly: Math.round(projectedQuarterly * 100) / 100,
      yearly: Math.round(projectedYearly * 100) / 100,
    };
  }

  /**
   * Calcula tendências de custo
   */
  private calculateTrends(monthlyCost: number): {
    period: string;
    monthlyAverage: number;
    growthRate: number;
  } {
    // Dados mock - em produção viriam de histórico real
    const growthRate = 0.05; // 5% ao mês
    const monthlyAverage = monthlyCost;

    return {
      period: 'last-30-days',
      monthlyAverage: Math.round(monthlyAverage * 100) / 100,
      growthRate: Math.round(growthRate * 10000) / 100, // Como percentual
    };
  }

  /**
   * Método auxiliar: obter estimativa rápida
   */
  async quickEstimate(params: SkillInput): Promise<number> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.breakdown.total;
    }
    return 0;
  }

  /**
   * Método auxiliar: verificar se há alertas críticos de custo
   */
  async hasCriticalCostAlerts(params: SkillInput): Promise<boolean> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.alerts.some((a) => a.level === 'critical');
    }
    return false;
  }

  /**
   * Método auxiliar: obter top recomendações
   */
  async getTopOptimizations(params: SkillInput, limit: number = 5): Promise<CostOptimization[]> {
    const result = await this.execute(params);
    if (result.success && result.data) {
      return result.data.optimizations
        .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
        .slice(0, limit);
    }
    return [];
  }
}
