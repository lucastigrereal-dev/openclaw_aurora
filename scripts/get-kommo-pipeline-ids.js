#!/usr/bin/env node

/**
 * Script: Extrair Pipeline IDs do Kommo CRM
 *
 * Uso:
 *   node scripts/get-kommo-pipeline-ids.js
 *
 * Pré-requisitos:
 *   - Arquivo .env.kommo com KOMMO_DOMAIN e KOMMO_ACCESS_TOKEN
 *
 * Saída:
 *   - Imprime todos os pipelines e estágios com IDs
 *   - Gera arquivo .env.kommo.pipeline_ids com variáveis prontas
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Carregar .env.kommo
const envPath = join(process.cwd(), '.env.kommo');
if (!existsSync(envPath)) {
  console.error('❌ Arquivo .env.kommo não encontrado!');
  console.error('   Crie o arquivo com KOMMO_DOMAIN e KOMMO_ACCESS_TOKEN');
  process.exit(1);
}

config({ path: envPath });

const KOMMO_DOMAIN = process.env.KOMMO_DOMAIN;
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN;

if (!KOMMO_DOMAIN || !KOMMO_ACCESS_TOKEN) {
  console.error('❌ Variáveis necessárias não encontradas em .env.kommo:');
  console.error('   - KOMMO_DOMAIN');
  console.error('   - KOMMO_ACCESS_TOKEN');
  process.exit(1);
}

console.log('🔍 Buscando pipelines do Kommo...\n');

// Fazer request para API do Kommo
const apiUrl = `https://${KOMMO_DOMAIN}.kommo.com/api/v4/leads/pipelines`;

try {
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Erro HTTP ${response.status}: ${response.statusText}`);
    console.error(`   Resposta: ${errorText}`);

    if (response.status === 401) {
      console.error('\n💡 Dica: O access token pode ter expirado (válido por 24h).');
      console.error('   Use o refresh_token para gerar um novo token.');
    }

    process.exit(1);
  }

  const data = await response.json();

  if (!data._embedded?.pipelines || data._embedded.pipelines.length === 0) {
    console.error('❌ Nenhum pipeline encontrado!');
    console.error('   Verifique se há pipelines configurados no Kommo.');
    process.exit(1);
  }

  const pipelines = data._embedded.pipelines;

  console.log(`✅ Encontrados ${pipelines.length} pipeline(s):\n`);
  console.log('='.repeat(80));

  let envOutput = '# Pipeline IDs extraídos do Kommo\n';
  envOutput += `# Gerado em: ${new Date().toISOString()}\n\n`;

  // Processar cada pipeline
  pipelines.forEach((pipeline, pipelineIndex) => {
    console.log(`\n📊 PIPELINE ${pipelineIndex + 1}: ${pipeline.name}`);
    console.log(`   ID: ${pipeline.id}`);
    console.log(`   Ordenação: ${pipeline.sort}`);
    console.log(`   É principal: ${pipeline.is_main ? 'Sim' : 'Não'}`);

    if (pipelineIndex === 0) {
      envOutput += `KOMMO_PIPELINE_ID=${pipeline.id}\n`;
    } else {
      envOutput += `KOMMO_PIPELINE_${pipelineIndex + 1}_ID=${pipeline.id}\n`;
    }

    // Processar estágios (statuses)
    if (pipeline._embedded?.statuses) {
      const statuses = pipeline._embedded.statuses;
      console.log(`\n   🔹 Estágios (${statuses.length}):`);

      statuses.forEach((status) => {
        const statusName = status.name;
        const statusId = status.id;
        const statusColor = status.color;

        console.log(`      • ${statusName} (ID: ${statusId}) [${statusColor}]`);

        // Gerar variável de ambiente
        const varName = normalizeStatusName(statusName, pipelineIndex);
        envOutput += `${varName}=${statusId}\n`;
      });
    }

    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\n✅ Pipeline IDs extraídos com sucesso!\n');

  // Salvar em arquivo
  const outputPath = join(process.cwd(), '.env.kommo.pipeline_ids');
  writeFileSync(outputPath, envOutput, 'utf8');

  console.log(`📝 Arquivo gerado: .env.kommo.pipeline_ids`);
  console.log('\n📋 Próximos passos:');
  console.log('   1. Revisar o arquivo .env.kommo.pipeline_ids');
  console.log('   2. Copiar as variáveis para .env.kommo');
  console.log('   3. Ajustar nomes das variáveis se necessário');
  console.log('   4. Rodar: node scripts/test-kommo-webhook.sh\n');

} catch (error) {
  console.error('❌ Erro ao buscar pipelines:', error.message);

  if (error.cause) {
    console.error('   Causa:', error.cause.message);
  }

  console.error('\n💡 Dicas:');
  console.error('   - Verificar se KOMMO_DOMAIN está correto (sem .kommo.com)');
  console.error('   - Verificar se KOMMO_ACCESS_TOKEN é válido');
  console.error('   - Verificar conexão com a internet');

  process.exit(1);
}

/**
 * Normaliza nome do estágio para variável de ambiente
 * Exemplos:
 *   "Novo" → "KOMMO_STAGE_NOVO"
 *   "Primeiro Contato" → "KOMMO_STAGE_PRIMEIRO_CONTATO"
 *   "Ganho 🎉" → "KOMMO_STAGE_GANHO"
 */
function normalizeStatusName(name, pipelineIndex = 0) {
  // Remover emojis e caracteres especiais
  let normalized = name
    .replace(/[^\w\s]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  // Prefixo
  const prefix = pipelineIndex === 0 ? 'KOMMO_STAGE' : `KOMMO_PIPELINE_${pipelineIndex + 1}_STAGE`;

  return `${prefix}_${normalized}`;
}
