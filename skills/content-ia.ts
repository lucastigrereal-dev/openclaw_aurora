// Content IA Skills - Geracao de conteudo com IA
// Skills: content.blog, content.image, content.video, content.email

import { SkillBase, SkillResult } from './skill-base';
import * as fs from 'fs';

// ============================================================================
// Helper: Call Claude API
// ============================================================================
async function callClaude(prompt: string, maxTokens: number = 1000): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data: any = await res.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ============================================================================
// content.blog - Gera artigos SEO
// ============================================================================
export class ContentBlogSkill extends SkillBase {
  name = 'content.blog';
  description = 'Gera artigos SEO para o site da clinica';
  category = 'content';
  dangerous = false;

  parameters = {
    topic: { type: 'string', required: true, description: 'Tema do artigo' },
    keywords: { type: 'array', required: false, description: 'Palavras-chave SEO' },
    wordCount: { type: 'number', required: false, description: 'Tamanho aproximado (default: 800)' },
    tone: { type: 'string', required: false, description: 'Tom: professional, educational, friendly' },
    outputPath: { type: 'string', required: false, description: 'Salvar como arquivo' },
    clinicName: { type: 'string', required: false, description: 'Nome da clinica' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { topic, keywords = [], wordCount = 800, tone = 'educational', clinicName = 'nossa clinica' } = params;

      const prompt = `Escreva um artigo de blog otimizado para SEO sobre "${topic}" para o site de uma clinica de saude chamada "${clinicName}".

Requisitos:
- Aproximadamente ${wordCount} palavras
- Tom: ${tone}
- Palavras-chave SEO: ${keywords.length > 0 ? keywords.join(', ') : topic}
- Inclua: titulo H1, subtitulos H2, introducao, desenvolvimento, conclusao com CTA
- Formato: Markdown
- Meta description (max 160 caracteres)
- Use linguagem acessivel para pacientes
- Inclua perguntas frequentes (FAQ) no final
- NÃO invente dados medicos, use informacoes gerais`;

      const content = await callClaude(prompt, 2000);

      if (content) {
        if (params.outputPath) {
          fs.writeFileSync(params.outputPath, content);
        }
        return this.success({ article: content, topic, wordCount: content.split(/\s+/).length, generatedByAI: true });
      }

      // Template fallback
      const article = this.generateTemplate(topic, keywords, clinicName);
      if (params.outputPath) {
        fs.writeFileSync(params.outputPath, article);
      }
      return this.success({ article, topic, generatedByAI: false });
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private generateTemplate(topic: string, keywords: string[], clinicName: string): string {
    return `# ${topic}: Guia Completo

## O que e ${topic}?

${topic} e um tema importante na area da saude. Neste artigo, vamos explicar tudo o que voce precisa saber.

## Beneficios

- Melhora na qualidade de vida
- Resultados comprovados
- Atendimento personalizado

## Como funciona na ${clinicName}

Na ${clinicName}, contamos com profissionais especializados em ${topic}.

## Perguntas Frequentes

**${topic} doi?**
Depende do procedimento, mas nossa equipe garante o maximo conforto.

**Quanto custa?**
Entre em contato para uma avaliacao personalizada.

---
*Agende sua consulta na ${clinicName}.*

Keywords: ${keywords.join(', ')}`;
  }
}

// ============================================================================
// content.image - Gera artes para social media
// ============================================================================
export class ContentImageSkill extends SkillBase {
  name = 'content.image';
  description = 'Gera artes para social media (DALL-E / API)';
  category = 'content';
  dangerous = false;

  parameters = {
    prompt: { type: 'string', required: true, description: 'Descricao da imagem' },
    style: { type: 'string', required: false, description: 'Estilo: professional, minimalist, vibrant, elegant' },
    size: { type: 'string', required: false, description: 'Tamanho: 1024x1024, 1080x1080, 1080x1920' },
    outputPath: { type: 'string', required: false, description: 'Caminho para salvar' },
    platform: { type: 'string', required: false, description: 'Platform: instagram_post, instagram_story, facebook, thumbnail' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { prompt, style = 'professional', size = '1024x1024', platform = 'instagram_post' } = params;

      const openaiKey = process.env.OPENAI_API_KEY;

      if (!openaiKey) {
        // Generate prompt suggestion for manual creation
        const suggestion = await callClaude(
          `Crie um prompt detalhado para gerar uma imagem de marketing de clinica de saude sobre: "${prompt}". Estilo: ${style}. Para: ${platform}. O prompt deve ser em ingles e otimizado para DALL-E ou Midjourney.`,
          300
        );

        return this.success({
          message: 'OPENAI_API_KEY nao configurada para gerar imagem automaticamente',
          promptSuggestion: suggestion || `Professional medical clinic photo, ${prompt}, ${style} style, clean background`,
          platform,
          size,
          tip: 'Use este prompt no DALL-E, Midjourney, ou Canva AI',
        });
      }

      // Call DALL-E API
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Professional medical/health clinic marketing image: ${prompt}. Style: ${style}. Clean, modern, trustworthy.`,
          n: 1,
          size,
        }),
      });

      const data: any = await res.json();
      const imageUrl = data.data?.[0]?.url;

      if (imageUrl && params.outputPath) {
        const imgRes = await fetch(imageUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(params.outputPath, buffer);
        return this.success({ imageUrl, savedTo: params.outputPath, platform });
      }

      return this.success({ imageUrl, platform, size });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// content.video - Gera roteiros + legendas
// ============================================================================
export class ContentVideoSkill extends SkillBase {
  name = 'content.video';
  description = 'Gera roteiros + legendas para videos';
  category = 'content';
  dangerous = false;

  parameters = {
    topic: { type: 'string', required: true, description: 'Tema do video' },
    type: { type: 'string', required: false, description: 'Tipo: educational, testimonial, tour, procedure, tips' },
    duration: { type: 'number', required: false, description: 'Duracao em minutos' },
    platform: { type: 'string', required: false, description: 'Platform: youtube, instagram, tiktok' },
    outputPath: { type: 'string', required: false, description: 'Salvar roteiro' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { topic, type = 'educational', duration = 3, platform = 'youtube' } = params;

      const prompt = `Crie um roteiro completo de video de ${duration} minutos sobre "${topic}" para uma clinica de saude.
Tipo: ${type}
Plataforma: ${platform}

Inclua:
1. TITULO do video
2. THUMBNAIL: descricao da imagem ideal
3. ROTEIRO cena por cena com:
   - Timestamp [00:00]
   - Descricao visual
   - Fala/narracao
   - Texto na tela (se houver)
4. DESCRICAO para ${platform} com SEO
5. TAGS/hashtags
6. CALL TO ACTION`;

      const script = await callClaude(prompt, 1500);

      if (script) {
        if (params.outputPath) fs.writeFileSync(params.outputPath, script);
        return this.success({ script, topic, type, duration, platform, generatedByAI: true });
      }

      const fallback = `=== ROTEIRO: ${topic} (${duration}min) ===

[00:00] Abertura - "Ola! Hoje vamos falar sobre ${topic}"
[00:15] Introducao ao tema
[01:00] Desenvolvimento principal
[02:00] Demonstracao/exemplos
[02:30] Conclusao e CTA
[${duration}:00] Encerramento

DESCRICAO: ${topic} - Guia completo pela nossa clinica
TAGS: #${topic.replace(/\s/g, '')} #saude #clinica`;

      if (params.outputPath) fs.writeFileSync(params.outputPath, fallback);
      return this.success({ script: fallback, topic, type, duration, platform, generatedByAI: false });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// content.email - Templates de email marketing
// ============================================================================
export class ContentEmailSkill extends SkillBase {
  name = 'content.email';
  description = 'Templates de email marketing';
  category = 'content';
  dangerous = false;

  parameters = {
    type: { type: 'string', required: true, description: 'Tipo: welcome, promotion, newsletter, followup, reactivation, birthday' },
    subject: { type: 'string', required: false, description: 'Assunto do email' },
    clinicName: { type: 'string', required: false, description: 'Nome da clinica' },
    service: { type: 'string', required: false, description: 'Servico/promocao' },
    patientName: { type: 'string', required: false, description: 'Nome do paciente (personalizacao)' },
    discount: { type: 'string', required: false, description: 'Desconto (ex: 20%)' },
    outputPath: { type: 'string', required: false, description: 'Salvar template HTML' },
    color: { type: 'string', required: false, description: 'Cor primaria' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const {
        type, clinicName = 'Nossa Clinica', service = '',
        patientName = '{{nome}}', discount = '', color = '#00a86b'
      } = params;

      const templates: Record<string, { subject: string; body: string }> = {
        welcome: {
          subject: `Bem-vindo(a) a ${clinicName}!`,
          body: `<h2>Ola ${patientName}!</h2>
<p>Seja bem-vindo(a) a ${clinicName}. Estamos felizes em te receber!</p>
<p>Aqui voce encontra os melhores tratamentos com profissionais especializados.</p>
<a href="#" style="background:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Agendar Consulta</a>`,
        },
        promotion: {
          subject: params.subject || `${discount || 'Oferta'} especial em ${service || 'tratamentos'}!`,
          body: `<h2>${patientName}, temos uma oferta especial para voce!</h2>
<p>${discount ? `<span style="font-size:2em;color:${color};font-weight:bold">${discount} OFF</span>` : ''}</p>
<p>${service ? `em ${service}` : 'em tratamentos selecionados'}</p>
<p>Validade limitada. Nao perca!</p>
<a href="#" style="background:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Aproveitar Agora</a>`,
        },
        newsletter: {
          subject: params.subject || `Novidades da ${clinicName}`,
          body: `<h2>Novidades do mes!</h2>
<p>Ola ${patientName}, confira as novidades:</p>
<ul>
<li>Novo tratamento disponivel</li>
<li>Dicas de saude e bem-estar</li>
<li>Promocoes exclusivas</li>
</ul>
<a href="#" style="background:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Ver Mais</a>`,
        },
        followup: {
          subject: `Como voce esta, ${patientName}?`,
          body: `<h2>Ola ${patientName}!</h2>
<p>Esperamos que esteja bem apos sua ultima visita a ${clinicName}.</p>
<p>Gostavamos de saber como voce esta se sentindo e se precisa de algum acompanhamento.</p>
<p>Caso tenha duvidas, estamos a disposicao!</p>
<a href="#" style="background:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Falar Conosco</a>`,
        },
        reactivation: {
          subject: `Sentimos sua falta, ${patientName}!`,
          body: `<h2>Faz tempo que nao nos vemos!</h2>
<p>Ola ${patientName}, sentimos sua falta na ${clinicName}.</p>
<p>Temos novidades e gostavamos de te receber novamente.</p>
${discount ? `<p style="font-size:1.3em;color:${color};font-weight:bold">${discount} de desconto na sua proxima visita!</p>` : ''}
<a href="#" style="background:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Agendar Retorno</a>`,
        },
        birthday: {
          subject: `Feliz Aniversario, ${patientName}! 🎂`,
          body: `<h2>Parabens, ${patientName}!</h2>
<p>A equipe da ${clinicName} deseja um feliz aniversario!</p>
<p>Preparamos um presente especial para voce:</p>
<p style="font-size:1.5em;color:${color};font-weight:bold">${discount || '15% OFF'} no seu proximo tratamento</p>
<p>Valido por 30 dias. Aproveite!</p>
<a href="#" style="background:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Usar Presente</a>`,
        },
      };

      const template = templates[type];
      if (!template) {
        return this.error(`Tipo invalido. Use: ${Object.keys(templates).join(', ')}`);
      }

      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <div style="text-align:center;padding:20px;background:${color};color:white;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;">${clinicName}</h1>
  </div>
  <div style="padding:30px;background:#fff;border:1px solid #eee;">
    ${template.body}
  </div>
  <div style="text-align:center;padding:15px;color:#888;font-size:0.9em;">
    <p>${clinicName} | Cancelar inscricao</p>
  </div>
</body></html>`;

      if (params.outputPath) {
        fs.writeFileSync(params.outputPath, html);
      }

      return this.success({
        subject: params.subject || template.subject,
        html,
        type,
        path: params.outputPath,
      });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

export const contentSkills = [
  new ContentBlogSkill(),
  new ContentImageSkill(),
  new ContentVideoSkill(),
  new ContentEmailSkill(),
];

export default contentSkills;
