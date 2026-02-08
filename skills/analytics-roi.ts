// Analytics & ROI Skills
// Skills: analytics.dashboard, analytics.roi, analytics.conversion, analytics.report

import { SkillBase, SkillResult } from './skill-base';
import * as fs from 'fs';

// In-memory analytics data
const metricsHistory: MetricEntry[] = [];
const campaignData: CampaignMetric[] = [];

interface MetricEntry {
  date: Date;
  channel: string;
  metric: string;
  value: number;
}

interface CampaignMetric {
  channel: string;
  spent: number;
  leads: number;
  patients: number;
  revenue: number;
  period: string;
}

// ============================================================================
// analytics.dashboard - Dashboard de metricas
// ============================================================================
export class AnalyticsDashboardSkill extends SkillBase {
  name = 'analytics.dashboard';
  description = 'Dashboard de metricas de marketing';
  category = 'analytics';
  dangerous = false;

  parameters = {
    period: { type: 'string', required: false, description: 'Period: today, week, month, quarter' },
    action: { type: 'string', required: false, description: 'Action: overview, record, history' },
    channel: { type: 'string', required: false, description: 'Canal especifico' },
    metric: { type: 'string', required: false, description: 'Metrica para registrar' },
    value: { type: 'number', required: false, description: 'Valor da metrica' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { action = 'overview', period = 'month' } = params;

      if (action === 'record') {
        if (!params.channel || !params.metric || params.value === undefined) {
          return this.error('channel, metric e value obrigatorios');
        }
        metricsHistory.push({
          date: new Date(),
          channel: params.channel,
          metric: params.metric,
          value: params.value,
        });
        return this.success({ recorded: { channel: params.channel, metric: params.metric, value: params.value } });
      }

      if (action === 'history') {
        const filtered = params.channel
          ? metricsHistory.filter(m => m.channel === params.channel)
          : metricsHistory;
        return this.success({ history: filtered.slice(-50), total: filtered.length });
      }

      // Overview
      const channels = ['google_ads', 'meta_ads', 'organic', 'referral', 'social', 'direct'];
      const overview: Record<string, any> = {};

      channels.forEach(ch => {
        const channelMetrics = metricsHistory.filter(m => m.channel === ch);
        const campaign = campaignData.filter(c => c.channel === ch);

        overview[ch] = {
          spent: campaign.reduce((s, c) => s + c.spent, 0),
          leads: campaign.reduce((s, c) => s + c.leads, 0),
          patients: campaign.reduce((s, c) => s + c.patients, 0),
          revenue: campaign.reduce((s, c) => s + c.revenue, 0),
          metrics: channelMetrics.length,
        };
      });

      const totals = {
        totalSpent: Object.values(overview).reduce((s: number, ch: any) => s + ch.spent, 0),
        totalLeads: Object.values(overview).reduce((s: number, ch: any) => s + ch.leads, 0),
        totalPatients: Object.values(overview).reduce((s: number, ch: any) => s + ch.patients, 0),
        totalRevenue: Object.values(overview).reduce((s: number, ch: any) => s + ch.revenue, 0),
      };

      return this.success({
        period,
        channels: overview,
        totals,
        roi: totals.totalSpent > 0
          ? `${(((totals.totalRevenue - totals.totalSpent) / totals.totalSpent) * 100).toFixed(1)}%`
          : 'N/A',
      });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// analytics.roi - Calcula ROI por canal
// ============================================================================
export class AnalyticsROISkill extends SkillBase {
  name = 'analytics.roi';
  description = 'Calcula ROI por canal (Google, Meta, Indicacao)';
  category = 'analytics';
  dangerous = false;

  parameters = {
    action: { type: 'string', required: true, description: 'Action: calculate, record, compare' },
    channel: { type: 'string', required: false, description: 'Canal: google_ads, meta_ads, organic, referral' },
    spent: { type: 'number', required: false, description: 'Valor investido (BRL)' },
    leads: { type: 'number', required: false, description: 'Numero de leads gerados' },
    patients: { type: 'number', required: false, description: 'Numero de pacientes convertidos' },
    revenue: { type: 'number', required: false, description: 'Receita gerada (BRL)' },
    period: { type: 'string', required: false, description: 'Periodo' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { action } = params;

      switch (action) {
        case 'record': {
          if (!params.channel) return this.error('channel obrigatorio');
          campaignData.push({
            channel: params.channel,
            spent: params.spent || 0,
            leads: params.leads || 0,
            patients: params.patients || 0,
            revenue: params.revenue || 0,
            period: params.period || new Date().toISOString().slice(0, 7),
          });
          return this.success({ recorded: params.channel });
        }

        case 'calculate': {
          const data = params.channel
            ? campaignData.filter(c => c.channel === params.channel)
            : campaignData;

          const totalSpent = data.reduce((s, c) => s + c.spent, 0);
          const totalLeads = data.reduce((s, c) => s + c.leads, 0);
          const totalPatients = data.reduce((s, c) => s + c.patients, 0);
          const totalRevenue = data.reduce((s, c) => s + c.revenue, 0);

          const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
          const cpl = totalLeads > 0 ? totalSpent / totalLeads : 0; // Cost per lead
          const cpa = totalPatients > 0 ? totalSpent / totalPatients : 0; // Cost per acquisition
          const ltv = totalPatients > 0 ? totalRevenue / totalPatients : 0; // Lifetime value

          return this.success({
            channel: params.channel || 'all',
            roi: `${roi.toFixed(1)}%`,
            totalSpent: `R$ ${totalSpent.toFixed(2)}`,
            totalRevenue: `R$ ${totalRevenue.toFixed(2)}`,
            profit: `R$ ${(totalRevenue - totalSpent).toFixed(2)}`,
            leads: totalLeads,
            patients: totalPatients,
            costPerLead: `R$ ${cpl.toFixed(2)}`,
            costPerAcquisition: `R$ ${cpa.toFixed(2)}`,
            averageLTV: `R$ ${ltv.toFixed(2)}`,
            conversionRate: totalLeads > 0 ? `${((totalPatients / totalLeads) * 100).toFixed(1)}%` : '0%',
          });
        }

        case 'compare': {
          const channels = [...new Set(campaignData.map(c => c.channel))];
          const comparison = channels.map(ch => {
            const data = campaignData.filter(c => c.channel === ch);
            const spent = data.reduce((s, c) => s + c.spent, 0);
            const leads = data.reduce((s, c) => s + c.leads, 0);
            const patients = data.reduce((s, c) => s + c.patients, 0);
            const revenue = data.reduce((s, c) => s + c.revenue, 0);
            const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;

            return {
              channel: ch,
              spent,
              leads,
              patients,
              revenue,
              roi: `${roi.toFixed(1)}%`,
              cpl: leads > 0 ? `R$ ${(spent / leads).toFixed(2)}` : 'N/A',
            };
          });

          comparison.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));

          return this.success({
            comparison,
            bestROI: comparison[0]?.channel || 'N/A',
            bestCPL: comparison.sort((a, b) => (a.spent / Math.max(a.leads, 1)) - (b.spent / Math.max(b.leads, 1)))[0]?.channel || 'N/A',
          });
        }

        default:
          return this.error('Action invalida. Use: calculate, record, compare');
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// analytics.conversion - Taxa de conversao
// ============================================================================
export class AnalyticsConversionSkill extends SkillBase {
  name = 'analytics.conversion';
  description = 'Taxa de conversao lead -> paciente';
  category = 'analytics';
  dangerous = false;

  parameters = {
    action: { type: 'string', required: false, description: 'Action: funnel, byChannel, trend' },
    period: { type: 'string', required: false, description: 'Period: week, month, quarter' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { action = 'funnel' } = params;

      const totalLeads = campaignData.reduce((s, c) => s + c.leads, 0);
      const totalPatients = campaignData.reduce((s, c) => s + c.patients, 0);

      switch (action) {
        case 'funnel': {
          // Estimated funnel stages
          const contacted = Math.round(totalLeads * 0.7);
          const interested = Math.round(totalLeads * 0.4);
          const scheduled = Math.round(totalLeads * 0.25);

          return this.success({
            funnel: {
              leads: totalLeads,
              contacted: { count: contacted, rate: `${totalLeads > 0 ? ((contacted / totalLeads) * 100).toFixed(0) : 0}%` },
              interested: { count: interested, rate: `${totalLeads > 0 ? ((interested / totalLeads) * 100).toFixed(0) : 0}%` },
              scheduled: { count: scheduled, rate: `${totalLeads > 0 ? ((scheduled / totalLeads) * 100).toFixed(0) : 0}%` },
              patients: { count: totalPatients, rate: `${totalLeads > 0 ? ((totalPatients / totalLeads) * 100).toFixed(0) : 0}%` },
            },
            overallConversion: totalLeads > 0 ? `${((totalPatients / totalLeads) * 100).toFixed(1)}%` : '0%',
          });
        }

        case 'byChannel': {
          const channels = [...new Set(campaignData.map(c => c.channel))];
          const byChannel = channels.map(ch => {
            const data = campaignData.filter(c => c.channel === ch);
            const leads = data.reduce((s, c) => s + c.leads, 0);
            const patients = data.reduce((s, c) => s + c.patients, 0);
            return {
              channel: ch,
              leads,
              patients,
              conversionRate: leads > 0 ? `${((patients / leads) * 100).toFixed(1)}%` : '0%',
            };
          });
          byChannel.sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate));

          return this.success({ byChannel, bestChannel: byChannel[0]?.channel || 'N/A' });
        }

        default:
          return this.success({ totalLeads, totalPatients, conversionRate: totalLeads > 0 ? `${((totalPatients / totalLeads) * 100).toFixed(1)}%` : '0%' });
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// analytics.report - Relatorio mensal
// ============================================================================
export class AnalyticsReportSkill extends SkillBase {
  name = 'analytics.report';
  description = 'Relatorio mensal automatico em PDF/texto';
  category = 'analytics';
  dangerous = false;

  parameters = {
    period: { type: 'string', required: false, description: 'Period: month, quarter' },
    format: { type: 'string', required: false, description: 'Format: text, html' },
    clinicName: { type: 'string', required: false, description: 'Nome da clinica' },
    outputPath: { type: 'string', required: false, description: 'Salvar relatorio' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { period = 'month', clinicName = 'Clinica Aurora' } = params;

      const totalSpent = campaignData.reduce((s, c) => s + c.spent, 0);
      const totalLeads = campaignData.reduce((s, c) => s + c.leads, 0);
      const totalPatients = campaignData.reduce((s, c) => s + c.patients, 0);
      const totalRevenue = campaignData.reduce((s, c) => s + c.revenue, 0);
      const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

      const channels = [...new Set(campaignData.map(c => c.channel))];

      const report = `
╔══════════════════════════════════════════════════════════════╗
║              RELATORIO DE MARKETING ${period.toUpperCase()}                    ║
║              ${clinicName}                                    ║
║              ${new Date().toLocaleDateString('pt-BR')}                              ║
╚══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RESUMO FINANCEIRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Investimento:  R$ ${totalSpent.toFixed(2)}
  Receita:       R$ ${totalRevenue.toFixed(2)}
  Lucro:         R$ ${(totalRevenue - totalSpent).toFixed(2)}
  ROI:           ${roi.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FUNIL DE CONVERSAO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Leads:     ${totalLeads}
  Pacientes: ${totalPatients}
  Conversao: ${totalLeads > 0 ? ((totalPatients / totalLeads) * 100).toFixed(1) : 0}%
  CPL:       R$ ${totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : '0.00'}
  CPA:       R$ ${totalPatients > 0 ? (totalSpent / totalPatients).toFixed(2) : '0.00'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POR CANAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${channels.map(ch => {
  const data = campaignData.filter(c => c.channel === ch);
  const spent = data.reduce((s, c) => s + c.spent, 0);
  const leads = data.reduce((s, c) => s + c.leads, 0);
  const patients = data.reduce((s, c) => s + c.patients, 0);
  const revenue = data.reduce((s, c) => s + c.revenue, 0);
  const chRoi = spent > 0 ? ((revenue - spent) / spent * 100).toFixed(1) : '0';
  return `  ${ch.padEnd(15)} | R$ ${spent.toFixed(0).padStart(6)} | ${String(leads).padStart(3)} leads | ${String(patients).padStart(3)} pac. | ROI ${chRoi}%`;
}).join('\n') || '  (sem dados de campanha registrados)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RECOMENDACOES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${roi > 200 ? '  ✅ ROI excelente! Considere aumentar investimento.' :
  roi > 100 ? '  ✅ ROI bom. Mantenha a estrategia e otimize canais fracos.' :
  roi > 0 ? '  ⚠️ ROI positivo mas baixo. Revise estrategia de canais.' :
  '  ❌ ROI negativo. Reavalie canais e reducao de custos.'}

══════════════════════════════════════════════════════════════
  Gerado automaticamente por OpenClaw Aurora
══════════════════════════════════════════════════════════════`;

      if (params.outputPath) {
        fs.writeFileSync(params.outputPath, report);
      }

      return this.success({
        report,
        summary: { totalSpent, totalRevenue, totalLeads, totalPatients, roi: `${roi.toFixed(1)}%` },
        path: params.outputPath,
      });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

export const analyticsSkills = [
  new AnalyticsDashboardSkill(),
  new AnalyticsROISkill(),
  new AnalyticsConversionSkill(),
  new AnalyticsReportSkill(),
];

export default analyticsSkills;
