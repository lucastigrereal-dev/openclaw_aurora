/**
 * Kommo Webhook Transform
 * Extrai e normaliza dados dos webhooks do Kommo CRM
 *
 * @param {Object} payload - Payload bruto do webhook Kommo
 * @returns {Object} - Dados normalizados + metadados
 */

function transformKommo(payload) {
  // Identifica tipo de evento
  const eventType = payload.leads?.add ? 'lead_created'
    : payload.leads?.update ? 'lead_updated'
    : payload.leads?.status ? 'lead_status_changed'
    : payload.notes?.add ? 'note_added'
    : payload.contacts?.add ? 'contact_created'
    : payload.contacts?.update ? 'contact_updated'
    : payload.tasks?.add ? 'task_created'
    : 'unknown';

  // Extrai dados relevantes baseado no tipo
  let data = {};
  let leadId = null;
  let priority = 'normal';

  switch (eventType) {
    case 'lead_created':
    case 'lead_updated': {
      const leads = payload.leads?.add || payload.leads?.update || [];
      const lead = Array.isArray(leads) ? leads[0] : leads;

      leadId = lead?.id;
      data = {
        leadId: lead?.id,
        name: lead?.name,
        price: lead?.price,
        pipelineId: lead?.pipeline_id,
        statusId: lead?.status_id,
        responsibleUserId: lead?.responsible_user_id,
        createdAt: lead?.created_at,
        updatedAt: lead?.updated_at,
        customFields: lead?.custom_fields_values || [],
      };

      // Calcular score de qualificação (0-100)
      let score = 50; // Base
      if (lead?.name) score += 10;
      if (lead?.price && lead.price > 0) score += 20;
      if (lead?.custom_fields_values?.length > 0) score += 10;
      if (lead?.responsible_user_id) score += 10;
      data.score = Math.min(score, 100);

      // Classificar urgência baseado no valor
      if (lead?.price > 10000) {
        priority = 'critical';
        data.urgency = 'critica';
      } else if (lead?.price > 5000) {
        priority = 'high';
        data.urgency = 'alta';
      } else if (lead?.price > 2000) {
        priority = 'medium';
        data.urgency = 'media';
      } else {
        priority = 'low';
        data.urgency = 'baixa';
      }

      // Detectar escalação (keywords que indicam necessidade de atenção humana)
      const needsEscalation = detectEscalation(lead);
      if (needsEscalation.shouldEscalate) {
        priority = 'critical';
        data.escalationReasons = needsEscalation.reasons;
      }

      break;
    }

    case 'lead_status_changed': {
      const statusChanges = payload.leads?.status || [];
      const change = Array.isArray(statusChanges) ? statusChanges[0] : statusChanges;

      leadId = change?.id;
      data = {
        leadId: change?.id,
        oldStatusId: change?.old_status_id,
        newStatusId: change?.status_id,
        oldPipelineId: change?.old_pipeline_id,
        newPipelineId: change?.pipeline_id,
      };

      // Status changed para "ganho" ou "perdido" é alta prioridade
      priority = 'high';
      break;
    }

    case 'note_added': {
      const notes = payload.notes?.add || [];
      const note = Array.isArray(notes) ? notes[0] : notes;

      leadId = note?.element_id;
      data = {
        noteId: note?.id,
        elementId: note?.element_id,
        elementType: note?.element_type,
        noteType: note?.note_type,
        text: note?.params?.text || note?.text || '',
        createdBy: note?.created_by,
        createdAt: note?.created_at,
      };

      // Notas são média prioridade
      priority = 'medium';
      break;
    }

    case 'contact_created':
    case 'contact_updated': {
      const contacts = payload.contacts?.add || payload.contacts?.update || [];
      const contact = Array.isArray(contacts) ? contacts[0] : contacts;

      data = {
        contactId: contact?.id,
        name: contact?.name,
        responsibleUserId: contact?.responsible_user_id,
        customFields: contact?.custom_fields_values || [],
        createdAt: contact?.created_at,
        updatedAt: contact?.updated_at,
      };

      priority = 'low';
      break;
    }

    case 'task_created': {
      const tasks = payload.tasks?.add || [];
      const task = Array.isArray(tasks) ? tasks[0] : tasks;

      leadId = task?.element_id;
      data = {
        taskId: task?.id,
        elementId: task?.element_id,
        elementType: task?.element_type,
        text: task?.text,
        completeTill: task?.complete_till,
        createdBy: task?.created_by,
      };

      priority = 'medium';
      break;
    }
  }

  // Extrair telefone e email dos custom_fields (se houver)
  if (data.customFields && Array.isArray(data.customFields)) {
    for (const field of data.customFields) {
      if (field.field_code === 'PHONE' || field.field_name === 'Telefone') {
        data.phone = field.values?.[0]?.value;
      }
      if (field.field_code === 'EMAIL' || field.field_name === 'Email') {
        data.email = field.values?.[0]?.value;
      }
    }
  }

  // Resultado final normalizado
  return {
    eventType,
    priority,
    timestamp: new Date().toISOString(),
    accountId: payload.account?.id,
    accountSubdomain: payload.account?.subdomain,
    leadId,
    data,
    raw: payload, // Preservar payload original para debug
  };
}

/**
 * Detecta se lead precisa de escalação para humano
 * @param {Object} lead - Lead do Kommo
 * @returns {Object} - { shouldEscalate: boolean, reasons: string[] }
 */
function detectEscalation(lead) {
  const reasons = [];
  const leadName = (lead?.name || '').toLowerCase();
  const customFieldsText = JSON.stringify(lead?.custom_fields_values || []).toLowerCase();

  // Keywords que indicam necessidade de escalação
  const escalationKeywords = {
    valores: ['preço', 'valor', 'quanto custa', 'desconto', 'promoção', 'orçamento'],
    medica: ['dor', 'sangramento', 'infecção', 'médico', 'doutor', 'urgente', 'emergência'],
    insatisfacao: ['reclamação', 'insatisfeito', 'problema', 'ruim', 'péssimo', 'cancelar'],
  };

  // Verificar keywords nos custom fields
  for (const [category, keywords] of Object.entries(escalationKeywords)) {
    for (const keyword of keywords) {
      if (leadName.includes(keyword) || customFieldsText.includes(keyword)) {
        reasons.push(`Detectado: ${keyword} (categoria: ${category})`);
      }
    }
  }

  // Lead com valor alto sempre escala
  if (lead?.price && lead.price > 7000) {
    reasons.push(`Valor alto: R$ ${lead.price}`);
  }

  return {
    shouldEscalate: reasons.length > 0,
    reasons,
  };
}

// Export para CommonJS (usado pelo OpenClaw)
module.exports = { transformKommo };

// Export para ES6 (compatibilidade futura)
if (typeof exports !== 'undefined') {
  exports.transformKommo = transformKommo;
}
