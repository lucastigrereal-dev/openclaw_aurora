#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function main() {
  const appName = process.argv[2];
  if (!appName) {
    console.error('Uso: node mvp_definition.js <nome_do_app>');
    process.exit(1);
  }
  // Exemplo de MVP genérico; ajuste conforme o domínio
  const result = {
    agent: 'produto',
    task: 'mvp_definition',
    status: 'success',
    output: {
      app_name: appName,
      objetivo: `Aplicativo ${appName} com funcionalidades básicas`,
      requisitos: [
        'Cadastro e login de usuário',
        'Endpoint health para monitoramento'
      ],
      criterios_aceite: [
        'Usuário consegue criar conta e fazer login',
        'Health endpoint responde 200'
      ],
      fora_do_escopo: [
        'Funcionalidades avançadas',
        'Integrações externas'
      ]
    },
    metadata: {
      timestamp: new Date().toISOString(),
      duration_seconds: 1,
      next_step: 'engenharia',
      risks: [
        'Escopo pode inflar se não limitar features'
      ],
      artifacts: [
        { type: 'file', path: path.join('docs', `${appName}_mvp.md`) }
      ]
    }
  };
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}
