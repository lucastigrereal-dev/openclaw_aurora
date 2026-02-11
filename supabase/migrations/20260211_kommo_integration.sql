-- Migration: Kommo CRM Integration
-- Data: 2026-02-11
-- Descrição: Tabelas para armazenar leads, eventos e interações do Kommo

-- =======================
-- TABELA: kommo_leads
-- =======================
CREATE TABLE IF NOT EXISTS kommo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kommo_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pipeline_id BIGINT,
  status_id BIGINT,
  price DECIMAL(10,2) DEFAULT 0,
  responsible_user_id BIGINT,
  phone TEXT,
  email TEXT,
  custom_fields JSONB DEFAULT '{}',

  -- Scoring e qualificação
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  urgencia TEXT CHECK (urgencia IN ('baixa', 'media', 'alta', 'critica')),

  -- Status interno
  status_interno TEXT DEFAULT 'novo' CHECK (status_interno IN (
    'novo',
    'qualificando',
    'qualificado',
    'desqualificado',
    'agendado',
    'convertido',
    'perdido'
  )),

  -- Flags de controle
  precisa_aprovacao_humana BOOLEAN DEFAULT FALSE,
  humano_assumiu BOOLEAN DEFAULT FALSE,
  respondido_automaticamente BOOLEAN DEFAULT FALSE,

  -- Contadores
  num_followups INTEGER DEFAULT 0,
  num_interacoes INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  -- Índices
  CONSTRAINT kommo_leads_kommo_id_key UNIQUE (kommo_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kommo_leads_status ON kommo_leads(status_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_pipeline ON kommo_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_score ON kommo_leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_urgencia ON kommo_leads(urgencia);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_phone ON kommo_leads(phone);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_email ON kommo_leads(email);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_created_at ON kommo_leads(created_at DESC);

-- =======================
-- TABELA: kommo_eventos
-- =======================
CREATE TABLE IF NOT EXISTS kommo_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES kommo_leads(id) ON DELETE CASCADE,
  kommo_lead_id BIGINT REFERENCES kommo_leads(kommo_id),

  -- Tipo e dados do evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_created',
    'lead_updated',
    'lead_status_changed',
    'contact_created',
    'contact_updated',
    'note_added',
    'task_created',
    'mensagem_enviada',
    'mensagem_recebida',
    'escalado_para_humano',
    'followup_enviado',
    'unknown'
  )),

  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Contexto
  source TEXT DEFAULT 'kommo',
  session_key TEXT,

  -- Processamento
  processado BOOLEAN DEFAULT FALSE,
  processado_at TIMESTAMPTZ,
  erro TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Índices
  CONSTRAINT kommo_eventos_check_lead FOREIGN KEY (kommo_lead_id)
    REFERENCES kommo_leads(kommo_id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kommo_eventos_lead_id ON kommo_eventos(lead_id);
CREATE INDEX IF NOT EXISTS idx_kommo_eventos_kommo_lead_id ON kommo_eventos(kommo_lead_id);
CREATE INDEX IF NOT EXISTS idx_kommo_eventos_event_type ON kommo_eventos(event_type);
CREATE INDEX IF NOT EXISTS idx_kommo_eventos_created_at ON kommo_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kommo_eventos_processado ON kommo_eventos(processado) WHERE NOT processado;

-- =======================
-- TABELA: kommo_interacoes
-- =======================
CREATE TABLE IF NOT EXISTS kommo_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES kommo_leads(id) ON DELETE CASCADE,
  kommo_lead_id BIGINT REFERENCES kommo_leads(kommo_id),

  -- Tipo de interação
  tipo TEXT NOT NULL CHECK (tipo IN (
    'boas_vindas',
    'followup',
    'resposta',
    'qualificacao',
    'agendamento',
    'escalacao',
    'nota_interna'
  )),

  -- Conteúdo
  conteudo TEXT NOT NULL,
  intent_classificado TEXT,

  -- Direção
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),

  -- Canal
  canal TEXT CHECK (canal IN ('whatsapp', 'telegram', 'email', 'kommo', 'interno')),

  -- Quem enviou/recebeu
  enviado_por TEXT, -- 'agente', 'humano', 'lead'
  agente_model TEXT,

  -- Resultado
  sucesso BOOLEAN DEFAULT TRUE,
  erro TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Índices
  CONSTRAINT kommo_interacoes_check_lead FOREIGN KEY (kommo_lead_id)
    REFERENCES kommo_leads(kommo_id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kommo_interacoes_lead_id ON kommo_interacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_kommo_interacoes_kommo_lead_id ON kommo_interacoes(kommo_lead_id);
CREATE INDEX IF NOT EXISTS idx_kommo_interacoes_tipo ON kommo_interacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_kommo_interacoes_direcao ON kommo_interacoes(direcao);
CREATE INDEX IF NOT EXISTS idx_kommo_interacoes_created_at ON kommo_interacoes(created_at DESC);

-- =======================
-- TABELA: kommo_config
-- =======================
CREATE TABLE IF NOT EXISTS kommo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO kommo_config (key, value, description) VALUES
  ('pipeline_mappings', '{
    "stages": {
      "novo": null,
      "primeiro_contato": null,
      "qualificando": null,
      "proposta": null,
      "negociando": null,
      "agendado": null,
      "ganho": null,
      "perdido": null
    }
  }', 'Mapeamento de IDs dos estágios do pipeline Kommo'),
  ('horario_funcionamento', '{
    "inicio": "08:00",
    "fim": "20:00",
    "timezone": "America/Sao_Paulo"
  }', 'Horário de funcionamento do SDR'),
  ('regras_escalacao', '{
    "score_minimo": 70,
    "keywords_valores": ["preço", "valor", "custo", "quanto custa"],
    "keywords_medicas": ["procedimento", "anestesia", "risco", "recuperação"],
    "keywords_insatisfacao": ["reclamação", "insatisfeito", "problema"]
  }', 'Regras para escalar lead para humano'),
  ('limites', '{
    "max_followups": 4,
    "intervalo_followup_horas": 48
  }', 'Limites de automação')
ON CONFLICT (key) DO NOTHING;

-- =======================
-- FUNÇÕES AUXILIARES
-- =======================

-- Função: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update em kommo_leads
DROP TRIGGER IF EXISTS trigger_update_kommo_leads_updated_at ON kommo_leads;
CREATE TRIGGER trigger_update_kommo_leads_updated_at
  BEFORE UPDATE ON kommo_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update em kommo_config
DROP TRIGGER IF EXISTS trigger_update_kommo_config_updated_at ON kommo_config;
CREATE TRIGGER trigger_update_kommo_config_updated_at
  BEFORE UPDATE ON kommo_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função: Calcular score de qualificação
CREATE OR REPLACE FUNCTION calcular_score_lead(
  p_kommo_id BIGINT
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_lead kommo_leads%ROWTYPE;
  v_num_interacoes INTEGER;
BEGIN
  -- Buscar lead
  SELECT * INTO v_lead FROM kommo_leads WHERE kommo_id = p_kommo_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Score base por presença de dados
  IF v_lead.phone IS NOT NULL THEN v_score := v_score + 15; END IF;
  IF v_lead.email IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF v_lead.price > 0 THEN v_score := v_score + 20; END IF;

  -- Score por engajamento
  SELECT COUNT(*) INTO v_num_interacoes
  FROM kommo_interacoes
  WHERE kommo_lead_id = p_kommo_id AND direcao = 'entrada';

  v_score := v_score + LEAST(v_num_interacoes * 10, 30);

  -- Score por pipeline status (assumindo que status mais alto = mais qualificado)
  IF v_lead.status_id > 1000 THEN v_score := v_score + 25; END IF;

  -- Garantir que score está entre 0-100
  RETURN LEAST(GREATEST(v_score, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- =======================
-- VIEWS ÚTEIS
-- =======================

-- View: Leads ativos que precisam de atenção
CREATE OR REPLACE VIEW v_leads_ativos AS
SELECT
  l.*,
  COUNT(DISTINCT i.id) as total_interacoes,
  MAX(i.created_at) as ultima_interacao,
  COUNT(DISTINCT CASE WHEN i.direcao = 'entrada' THEN i.id END) as msgs_recebidas,
  COUNT(DISTINCT CASE WHEN i.direcao = 'saida' THEN i.id END) as msgs_enviadas
FROM kommo_leads l
LEFT JOIN kommo_interacoes i ON l.id = i.lead_id
WHERE l.status_interno NOT IN ('convertido', 'perdido', 'desqualificado')
GROUP BY l.id
ORDER BY l.score DESC, l.created_at DESC;

-- View: Eventos não processados
CREATE OR REPLACE VIEW v_eventos_pendentes AS
SELECT *
FROM kommo_eventos
WHERE NOT processado
ORDER BY created_at ASC;

-- =======================
-- RLS (Row Level Security) - Opcional
-- =======================

-- Habilitar RLS nas tabelas (descomente se quiser usar autenticação)
-- ALTER TABLE kommo_leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE kommo_eventos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE kommo_interacoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE kommo_config ENABLE ROW LEVEL SECURITY;

-- Políticas de exemplo (ajustar conforme necessidade)
-- CREATE POLICY "Service role has full access" ON kommo_leads FOR ALL TO service_role USING (true);

-- =======================
-- GRANTS
-- =======================

-- Garantir que o service role tem acesso total
GRANT ALL ON kommo_leads TO service_role;
GRANT ALL ON kommo_eventos TO service_role;
GRANT ALL ON kommo_interacoes TO service_role;
GRANT ALL ON kommo_config TO service_role;

-- Garantir acesso às sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =======================
-- FIM DA MIGRATION
-- =======================

COMMENT ON TABLE kommo_leads IS 'Leads sincronizados do Kommo CRM';
COMMENT ON TABLE kommo_eventos IS 'Log de todos os eventos recebidos via webhook do Kommo';
COMMENT ON TABLE kommo_interacoes IS 'Histórico de interações com os leads';
COMMENT ON TABLE kommo_config IS 'Configurações do módulo Kommo';
