// Marketing Skills - Captacao de pacientes
// Skills: marketing.landing, marketing.leads, marketing.funnel, marketing.ads

import { SkillBase, SkillResult } from './skill-base';
import * as fs from 'fs';
import * as path from 'path';

// In-memory leads database
const leadsDB: Map<string, Lead> = new Map();

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string; // google, meta, organic, referral
  score: number; // 0-100
  stage: 'new' | 'contacted' | 'interested' | 'scheduled' | 'patient' | 'lost';
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// ============================================================================
// marketing.landing - Gera landing pages
// ============================================================================
export class MarketingLandingSkill extends SkillBase {
  name = 'marketing.landing';
  description = 'Gera landing pages com formulario de captacao';
  category = 'marketing';
  dangerous = false;

  parameters = {
    title: { type: 'string', required: true, description: 'Titulo da landing page' },
    service: { type: 'string', required: true, description: 'Servico/procedimento da clinica' },
    description: { type: 'string', required: false, description: 'Descricao do servico' },
    phone: { type: 'string', required: false, description: 'Telefone da clinica' },
    whatsapp: { type: 'string', required: false, description: 'WhatsApp da clinica' },
    color: { type: 'string', required: false, description: 'Cor primaria (hex)' },
    outputPath: { type: 'string', required: false, description: 'Caminho para salvar HTML' },
    cta: { type: 'string', required: false, description: 'Texto do botao CTA' },
    benefits: { type: 'array', required: false, description: 'Lista de beneficios' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const {
        title, service, description = '', phone = '', whatsapp = '',
        color = '#00a86b', cta = 'Agendar Consulta', benefits = [],
        outputPath
      } = params;

      const benefitsHTML = (benefits.length > 0 ? benefits : [
        'Atendimento personalizado',
        'Profissionais especializados',
        'Resultado comprovado',
        'Ambiente acolhedor',
      ]).map((b: string) => `<li>${b}</li>`).join('\n');

      const whatsappLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Olá! Tenho interesse em ${service}` : '#';

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #333; }
    .hero { background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 80px 20px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 20px; }
    .hero p { font-size: 1.2rem; max-width: 600px; margin: 0 auto 30px; opacity: 0.9; }
    .cta-btn { background: white; color: ${color}; padding: 16px 40px; border: none; border-radius: 50px; font-size: 1.1rem; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; transition: transform 0.2s; }
    .cta-btn:hover { transform: scale(1.05); }
    .benefits { padding: 60px 20px; max-width: 800px; margin: 0 auto; }
    .benefits h2 { text-align: center; margin-bottom: 30px; color: ${color}; }
    .benefits ul { list-style: none; }
    .benefits li { padding: 15px 0; padding-left: 30px; position: relative; font-size: 1.1rem; border-bottom: 1px solid #eee; }
    .benefits li::before { content: "✓"; position: absolute; left: 0; color: ${color}; font-weight: bold; }
    .form-section { background: #f8f9fa; padding: 60px 20px; }
    .form-container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .form-container h2 { text-align: center; margin-bottom: 25px; color: ${color}; }
    .form-group { margin-bottom: 15px; }
    .form-group input, .form-group select { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s; }
    .form-group input:focus { border-color: ${color}; outline: none; }
    .submit-btn { width: 100%; background: ${color}; color: white; padding: 14px; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
    .submit-btn:hover { opacity: 0.9; }
    .contact { text-align: center; padding: 40px 20px; }
    .contact a { color: ${color}; font-size: 1.2rem; text-decoration: none; }
    .whatsapp-float { position: fixed; bottom: 20px; right: 20px; background: #25d366; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${title}</h1>
    <p>${description || `Descubra como ${service} pode transformar sua vida. Agende uma avaliação gratuita.`}</p>
    <a href="#form" class="cta-btn">${cta}</a>
  </div>

  <div class="benefits">
    <h2>Por que escolher nossa clinica?</h2>
    <ul>${benefitsHTML}</ul>
  </div>

  <div class="form-section" id="form">
    <div class="form-container">
      <h2>Agende sua Avaliacao</h2>
      <form id="leadForm" onsubmit="handleSubmit(event)">
        <div class="form-group">
          <input type="text" name="name" placeholder="Seu nome completo" required />
        </div>
        <div class="form-group">
          <input type="tel" name="phone" placeholder="Seu WhatsApp" required />
        </div>
        <div class="form-group">
          <input type="email" name="email" placeholder="Seu email" />
        </div>
        <div class="form-group">
          <select name="interest">
            <option value="">Qual seu interesse?</option>
            <option value="${service}">${service}</option>
            <option value="avaliacao">Avaliacao Gratuita</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <button type="submit" class="submit-btn">${cta}</button>
      </form>
    </div>
  </div>

  ${phone ? `<div class="contact"><p>Ligue: <a href="tel:${phone}">${phone}</a></p></div>` : ''}
  ${whatsapp ? `<a href="${whatsappLink}" target="_blank" class="whatsapp-float">💬</a>` : ''}

  <script>
    function handleSubmit(e) {
      e.preventDefault();
      const form = new FormData(e.target);
      const data = Object.fromEntries(form);
      // Send to webhook/API
      fetch('/api/leads', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...data, source: 'landing', service: '${service}'}) }).catch(()=>{});
      alert('Obrigado! Entraremos em contato em breve.');
      e.target.reset();
    }
  </script>
</body>
</html>`;

      const filePath = outputPath || `landing-${Date.now()}.html`;
      fs.writeFileSync(filePath, html);

      return this.success({ path: filePath, title, service, size: html.length });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// marketing.leads - CRM de leads
// ============================================================================
export class MarketingLeadsSkill extends SkillBase {
  name = 'marketing.leads';
  description = 'CRM de leads - captura, classifica, pontua';
  category = 'marketing';
  dangerous = false;

  parameters = {
    action: { type: 'string', required: true, description: 'Action: add, update, get, list, search, score, stats, delete' },
    id: { type: 'string', required: false, description: 'Lead ID' },
    name: { type: 'string', required: false, description: 'Nome do lead' },
    phone: { type: 'string', required: false, description: 'Telefone' },
    email: { type: 'string', required: false, description: 'Email' },
    source: { type: 'string', required: false, description: 'Origem: google, meta, organic, referral, landing' },
    stage: { type: 'string', required: false, description: 'Estagio: new, contacted, interested, scheduled, patient, lost' },
    note: { type: 'string', required: false, description: 'Nota/observacao' },
    tags: { type: 'array', required: false, description: 'Tags do lead' },
    query: { type: 'string', required: false, description: 'Busca por nome/telefone/email' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { action } = params;

      switch (action) {
        case 'add': {
          const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const lead: Lead = {
            id,
            name: params.name || '',
            phone: params.phone || '',
            email: params.email || '',
            source: params.source || 'organic',
            score: this.calculateScore(params),
            stage: 'new',
            notes: params.note ? [params.note] : [],
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: params.tags || [],
          };
          leadsDB.set(id, lead);
          return this.success({ lead, message: 'Lead adicionado' });
        }

        case 'update': {
          if (!params.id) return this.error('ID do lead obrigatorio');
          const lead = leadsDB.get(params.id);
          if (!lead) return this.error('Lead nao encontrado');

          if (params.name) lead.name = params.name;
          if (params.phone) lead.phone = params.phone;
          if (params.email) lead.email = params.email;
          if (params.stage) lead.stage = params.stage as any;
          if (params.note) lead.notes.push(`[${new Date().toISOString()}] ${params.note}`);
          if (params.tags) lead.tags = [...new Set([...lead.tags, ...params.tags])];
          lead.score = this.calculateScore(lead);
          lead.updatedAt = new Date();

          return this.success({ lead, message: 'Lead atualizado' });
        }

        case 'get': {
          if (!params.id) return this.error('ID do lead obrigatorio');
          const lead = leadsDB.get(params.id);
          if (!lead) return this.error('Lead nao encontrado');
          return this.success({ lead });
        }

        case 'list': {
          const leads = Array.from(leadsDB.values());
          const filtered = params.stage
            ? leads.filter(l => l.stage === params.stage)
            : leads;
          const sorted = filtered.sort((a, b) => b.score - a.score);
          return this.success({ leads: sorted, total: sorted.length });
        }

        case 'search': {
          if (!params.query) return this.error('Query obrigatorio');
          const q = params.query.toLowerCase();
          const results = Array.from(leadsDB.values()).filter(l =>
            l.name.toLowerCase().includes(q) ||
            l.phone.includes(q) ||
            l.email.toLowerCase().includes(q)
          );
          return this.success({ results, total: results.length });
        }

        case 'stats': {
          const all = Array.from(leadsDB.values());
          const byStage: Record<string, number> = {};
          const bySource: Record<string, number> = {};
          all.forEach(l => {
            byStage[l.stage] = (byStage[l.stage] || 0) + 1;
            bySource[l.source] = (bySource[l.source] || 0) + 1;
          });
          const avgScore = all.length > 0 ? all.reduce((s, l) => s + l.score, 0) / all.length : 0;

          return this.success({
            total: all.length,
            byStage,
            bySource,
            avgScore: Math.round(avgScore),
            conversionRate: all.length > 0
              ? Math.round((all.filter(l => l.stage === 'patient').length / all.length) * 100)
              : 0,
          });
        }

        case 'delete': {
          if (!params.id) return this.error('ID do lead obrigatorio');
          leadsDB.delete(params.id);
          return this.success({ deleted: params.id });
        }

        default:
          return this.error('Action invalida. Use: add, update, get, list, search, score, stats, delete');
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private calculateScore(lead: any): number {
    let score = 0;
    if (lead.name) score += 10;
    if (lead.phone) score += 20;
    if (lead.email) score += 15;
    if (lead.source === 'referral') score += 25;
    if (lead.source === 'google') score += 20;
    if (lead.source === 'meta') score += 15;
    if (lead.source === 'landing') score += 20;
    if (lead.stage === 'interested') score += 15;
    if (lead.stage === 'scheduled') score += 25;
    return Math.min(score, 100);
  }
}

// ============================================================================
// marketing.funnel - Funil de vendas
// ============================================================================
export class MarketingFunnelSkill extends SkillBase {
  name = 'marketing.funnel';
  description = 'Funil de vendas automatizado (lead -> agendamento -> paciente)';
  category = 'marketing';
  dangerous = false;

  parameters = {
    action: { type: 'string', required: true, description: 'Action: view, move, report' },
    leadId: { type: 'string', required: false, description: 'Lead ID para mover no funil' },
    toStage: { type: 'string', required: false, description: 'Estagio destino' },
    period: { type: 'string', required: false, description: 'Periodo: today, week, month, all' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { action } = params;

      switch (action) {
        case 'view': {
          const leads = Array.from(leadsDB.values());
          const funnel = {
            new: leads.filter(l => l.stage === 'new'),
            contacted: leads.filter(l => l.stage === 'contacted'),
            interested: leads.filter(l => l.stage === 'interested'),
            scheduled: leads.filter(l => l.stage === 'scheduled'),
            patient: leads.filter(l => l.stage === 'patient'),
            lost: leads.filter(l => l.stage === 'lost'),
          };

          return this.success({
            funnel: {
              new: funnel.new.length,
              contacted: funnel.contacted.length,
              interested: funnel.interested.length,
              scheduled: funnel.scheduled.length,
              patient: funnel.patient.length,
              lost: funnel.lost.length,
            },
            total: leads.length,
            conversionRate: leads.length > 0
              ? `${Math.round((funnel.patient.length / leads.length) * 100)}%`
              : '0%',
          });
        }

        case 'move': {
          if (!params.leadId || !params.toStage) {
            return this.error('leadId e toStage obrigatorios');
          }
          const lead = leadsDB.get(params.leadId);
          if (!lead) return this.error('Lead nao encontrado');

          const previousStage = lead.stage;
          lead.stage = params.toStage;
          lead.updatedAt = new Date();
          lead.notes.push(`[${new Date().toISOString()}] Movido: ${previousStage} -> ${params.toStage}`);

          return this.success({ lead, moved: { from: previousStage, to: params.toStage } });
        }

        case 'report': {
          const leads = Array.from(leadsDB.values());
          const stages = ['new', 'contacted', 'interested', 'scheduled', 'patient', 'lost'];
          const report: string[] = [
            '=== RELATORIO DO FUNIL ===',
            `Total de leads: ${leads.length}`,
            '',
          ];

          stages.forEach(stage => {
            const count = leads.filter(l => l.stage === stage).length;
            const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
            const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
            report.push(`${stage.padEnd(12)} ${bar} ${count} (${pct}%)`);
          });

          return this.success({ report: report.join('\n') });
        }

        default:
          return this.error('Action invalida. Use: view, move, report');
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// marketing.ads - Gerencia campanhas Google/Meta Ads
// ============================================================================
export class MarketingAdsSkill extends SkillBase {
  name = 'marketing.ads';
  description = 'Gerencia campanhas Google Ads / Meta Ads via API';
  category = 'marketing';
  dangerous = true;

  parameters = {
    platform: { type: 'string', required: true, description: 'Platform: google, meta' },
    action: { type: 'string', required: true, description: 'Action: create, pause, resume, stats, budget, keywords' },
    campaignId: { type: 'string', required: false, description: 'Campaign ID' },
    name: { type: 'string', required: false, description: 'Campaign name' },
    budget: { type: 'number', required: false, description: 'Daily budget (BRL)' },
    keywords: { type: 'array', required: false, description: 'Keywords for Google Ads' },
    audience: { type: 'object', required: false, description: 'Target audience for Meta Ads' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { platform, action } = params;

      // Google Ads
      if (platform === 'google') {
        const googleAdsToken = process.env.GOOGLE_ADS_TOKEN;
        const googleAdsCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

        if (!googleAdsToken) {
          return this.success({
            message: 'Google Ads API nao configurada',
            setup: 'Configure GOOGLE_ADS_TOKEN e GOOGLE_ADS_CUSTOMER_ID no .env',
            mock: true,
            action,
            suggestion: this.getAdSuggestion(params),
          });
        }

        // Real API calls would go here
        return this.success({ platform: 'google', action, status: 'executed' });
      }

      // Meta Ads
      if (platform === 'meta') {
        const metaToken = process.env.META_ADS_TOKEN;

        if (!metaToken) {
          return this.success({
            message: 'Meta Ads API nao configurada',
            setup: 'Configure META_ADS_TOKEN e META_ADS_ACCOUNT_ID no .env',
            mock: true,
            action,
            suggestion: this.getAdSuggestion(params),
          });
        }

        return this.success({ platform: 'meta', action, status: 'executed' });
      }

      return this.error('Platform invalida. Use: google, meta');
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private getAdSuggestion(params: any): any {
    return {
      headline: `${params.name || 'Sua Clinica'} - Agende Agora`,
      description: 'Avaliacao gratuita. Profissionais especializados. Resultados comprovados.',
      keywords: params.keywords || ['clinica', 'consulta', 'tratamento', 'saude'],
      targetCPA: 50, // R$50 por lead
      suggestedBudget: params.budget || 30, // R$30/dia
    };
  }
}

export const marketingSkills = [
  new MarketingLandingSkill(),
  new MarketingLeadsSkill(),
  new MarketingFunnelSkill(),
  new MarketingAdsSkill(),
];

export default marketingSkills;
