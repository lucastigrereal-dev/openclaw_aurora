// Reviews & Reputation Skills
// Skills: reviews.google, reviews.request, reviews.report

import { SkillBase, SkillResult } from './skill-base';

// In-memory reviews storage
const reviewsDB: Review[] = [];

interface Review {
  id: string;
  platform: string;
  author: string;
  rating: number;
  text: string;
  date: Date;
  replied: boolean;
  reply?: string;
}

// ============================================================================
// reviews.google - Monitora e responde reviews Google
// ============================================================================
export class ReviewsGoogleSkill extends SkillBase {
  name = 'reviews.google';
  description = 'Monitora e responde reviews no Google Meu Negocio';
  category = 'reviews';
  dangerous = false;

  parameters = {
    action: { type: 'string', required: true, description: 'Action: fetch, reply, list, stats' },
    reviewId: { type: 'string', required: false, description: 'Review ID para responder' },
    replyText: { type: 'string', required: false, description: 'Texto da resposta' },
    autoReply: { type: 'boolean', required: false, description: 'Gerar resposta automatica com IA' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { action } = params;
      const googleToken = process.env.GOOGLE_BUSINESS_TOKEN;
      const placeId = process.env.GOOGLE_PLACE_ID;

      switch (action) {
        case 'fetch': {
          if (googleToken && placeId) {
            try {
              const res = await fetch(
                `https://mybusiness.googleapis.com/v4/accounts/me/locations/${placeId}/reviews`,
                { headers: { Authorization: `Bearer ${googleToken}` } }
              );
              const data: any = await res.json();
              if (data.reviews) {
                data.reviews.forEach((r: any) => {
                  if (!reviewsDB.find(rev => rev.id === r.reviewId)) {
                    reviewsDB.push({
                      id: r.reviewId,
                      platform: 'google',
                      author: r.reviewer?.displayName || 'Anonimo',
                      rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
                      text: r.comment || '',
                      date: new Date(r.createTime),
                      replied: !!r.reviewReply,
                      reply: r.reviewReply?.comment,
                    });
                  }
                });
                return this.success({ reviews: reviewsDB.length, fetched: data.reviews.length });
              }
            } catch { /* fallback */ }
          }
          return this.success({
            message: 'Google Business API nao configurada',
            setup: 'Configure GOOGLE_BUSINESS_TOKEN e GOOGLE_PLACE_ID no .env',
            currentReviews: reviewsDB.length,
          });
        }

        case 'reply': {
          if (!params.reviewId) return this.error('reviewId obrigatorio');
          const review = reviewsDB.find(r => r.id === params.reviewId);
          if (!review) return this.error('Review nao encontrada');

          let replyText = params.replyText;

          if (params.autoReply || !replyText) {
            const claudeKey = process.env.ANTHROPIC_API_KEY;
            if (claudeKey) {
              try {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': claudeKey,
                    'anthropic-version': '2023-06-01',
                  },
                  body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 200,
                    messages: [{
                      role: 'user',
                      content: `Gere uma resposta profissional e empatica para esta avaliacao de clinica no Google:
Avaliacao: ${review.rating} estrelas
Texto: "${review.text}"
A resposta deve ser curta (max 3 frases), cordial e profissional. Se for negativa, oferecer solucao.`,
                    }],
                  }),
                });
                const data: any = await res.json();
                replyText = data.content?.[0]?.text;
              } catch { /* fallback */ }
            }

            if (!replyText) {
              replyText = review.rating >= 4
                ? `Obrigado pela avaliacao, ${review.author}! Ficamos felizes em saber que teve uma boa experiencia. Esperamos ve-lo novamente!`
                : `${review.author}, agradecemos o feedback. Lamentamos que sua experiencia nao tenha sido ideal. Entre em contato conosco para resolvermos.`;
            }
          }

          review.replied = true;
          review.reply = replyText;

          return this.success({ reviewId: params.reviewId, reply: replyText, rating: review.rating });
        }

        case 'list': {
          return this.success({
            reviews: reviewsDB.sort((a, b) => b.date.getTime() - a.date.getTime()),
            total: reviewsDB.length,
            unreplied: reviewsDB.filter(r => !r.replied).length,
          });
        }

        case 'stats': {
          const total = reviewsDB.length;
          const avgRating = total > 0
            ? (reviewsDB.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
            : '0';
          const byRating: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          reviewsDB.forEach(r => { byRating[r.rating] = (byRating[r.rating] || 0) + 1; });
          const repliedPct = total > 0
            ? Math.round((reviewsDB.filter(r => r.replied).length / total) * 100)
            : 0;

          return this.success({
            total,
            averageRating: avgRating,
            byRating,
            repliedPercentage: `${repliedPct}%`,
            unreplied: reviewsDB.filter(r => !r.replied).length,
          });
        }

        default:
          return this.error('Action invalida. Use: fetch, reply, list, stats');
      }
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// reviews.request - Envia pedido de avaliacao
// ============================================================================
export class ReviewsRequestSkill extends SkillBase {
  name = 'reviews.request';
  description = 'Envia pedido de avaliacao pos-consulta';
  category = 'reviews';
  dangerous = false;

  parameters = {
    patientName: { type: 'string', required: true, description: 'Nome do paciente' },
    phone: { type: 'string', required: false, description: 'WhatsApp do paciente' },
    email: { type: 'string', required: false, description: 'Email do paciente' },
    channel: { type: 'string', required: false, description: 'Canal: whatsapp, email, sms' },
    googleReviewLink: { type: 'string', required: false, description: 'Link do Google Reviews' },
    clinicName: { type: 'string', required: false, description: 'Nome da clinica' },
    delay: { type: 'string', required: false, description: 'Delay: immediate, 2h, 24h, 48h' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const {
        patientName, phone, email, channel = 'whatsapp',
        googleReviewLink = process.env.GOOGLE_REVIEW_LINK || 'https://g.page/r/sua-clinica/review',
        clinicName = 'nossa clinica',
      } = params;

      const message = `Ola ${patientName}! 😊

Esperamos que tenha tido uma otima experiencia na ${clinicName}.

Sua opiniao e muito importante para nos! Poderia deixar uma avaliacao? Leva menos de 1 minuto:

⭐ ${googleReviewLink}

Obrigado pela confianca!
Equipe ${clinicName}`;

      // WhatsApp
      if (channel === 'whatsapp' && phone) {
        const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        return this.success({
          channel: 'whatsapp',
          patient: patientName,
          message,
          whatsappUrl,
          reviewLink: googleReviewLink,
        });
      }

      // Email
      if (channel === 'email' && email) {
        return this.success({
          channel: 'email',
          patient: patientName,
          email,
          subject: `${patientName}, como foi sua experiencia na ${clinicName}?`,
          body: message,
          reviewLink: googleReviewLink,
        });
      }

      return this.success({
        channel,
        patient: patientName,
        message,
        reviewLink: googleReviewLink,
        note: 'Mensagem gerada. Configure canal de envio.',
      });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// reviews.report - Relatorio de reputacao
// ============================================================================
export class ReviewsReportSkill extends SkillBase {
  name = 'reviews.report';
  description = 'Relatorio de reputacao online';
  category = 'reviews';
  dangerous = false;

  parameters = {
    period: { type: 'string', required: false, description: 'Period: week, month, quarter, year' },
    format: { type: 'string', required: false, description: 'Format: text, html' },
    outputPath: { type: 'string', required: false, description: 'Salvar relatorio' },
  };

  async execute(params: any): Promise<SkillResult> {
    try {
      const { period = 'month', format = 'text' } = params;
      const total = reviewsDB.length;
      const avgRating = total > 0
        ? (reviewsDB.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
        : '0';

      const positive = reviewsDB.filter(r => r.rating >= 4).length;
      const neutral = reviewsDB.filter(r => r.rating === 3).length;
      const negative = reviewsDB.filter(r => r.rating <= 2).length;

      const report = `
═══════════════════════════════════════
    RELATORIO DE REPUTACAO ONLINE
    Periodo: ${period}
═══════════════════════════════════════

⭐ NOTA MEDIA: ${avgRating}/5.0

📊 DISTRIBUICAO:
  ⭐⭐⭐⭐⭐  ${'█'.repeat(Math.round((reviewsDB.filter(r => r.rating === 5).length / Math.max(total, 1)) * 20))} ${reviewsDB.filter(r => r.rating === 5).length}
  ⭐⭐⭐⭐     ${'█'.repeat(Math.round((reviewsDB.filter(r => r.rating === 4).length / Math.max(total, 1)) * 20))} ${reviewsDB.filter(r => r.rating === 4).length}
  ⭐⭐⭐       ${'█'.repeat(Math.round((reviewsDB.filter(r => r.rating === 3).length / Math.max(total, 1)) * 20))} ${reviewsDB.filter(r => r.rating === 3).length}
  ⭐⭐         ${'█'.repeat(Math.round((reviewsDB.filter(r => r.rating === 2).length / Math.max(total, 1)) * 20))} ${reviewsDB.filter(r => r.rating === 2).length}
  ⭐           ${'█'.repeat(Math.round((reviewsDB.filter(r => r.rating === 1).length / Math.max(total, 1)) * 20))} ${reviewsDB.filter(r => r.rating === 1).length}

📈 RESUMO:
  Total: ${total} avaliacoes
  Positivas (4-5): ${positive} (${total > 0 ? Math.round(positive/total*100) : 0}%)
  Neutras (3): ${neutral} (${total > 0 ? Math.round(neutral/total*100) : 0}%)
  Negativas (1-2): ${negative} (${total > 0 ? Math.round(negative/total*100) : 0}%)

💬 RESPOSTAS:
  Respondidas: ${reviewsDB.filter(r => r.replied).length}
  Pendentes: ${reviewsDB.filter(r => !r.replied).length}
  Taxa de resposta: ${total > 0 ? Math.round(reviewsDB.filter(r => r.replied).length/total*100) : 0}%

═══════════════════════════════════════`;

      if (params.outputPath) {
        const fs = await import('fs');
        fs.writeFileSync(params.outputPath, report);
      }

      return this.success({ report, avgRating, total, positive, negative, neutral });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

export const reviewsSkills = [
  new ReviewsGoogleSkill(),
  new ReviewsRequestSkill(),
  new ReviewsReportSkill(),
];

export default reviewsSkills;
