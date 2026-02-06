#!/usr/bin/env node
const { classifyIntent } = require('../intent_classifier');
const assert = require('assert');

const tests = [
  { input: 'o app caiu', expectedType: 'incidente' },
  { input: 'há um bug crítico', expectedType: 'bug_critico' },
  { input: 'faz o app de estoque', expectedType: 'feature_new_app' },
  { input: 'adiciona feature de pagamentos', expectedType: 'feature_add' },
  { input: 'como está o app pedidos?', expectedType: 'consulta' }
];

tests.forEach(({ input, expectedType }) => {
  const res = classifyIntent(input);
  assert.strictEqual(res.type, expectedType, `Esperado ${expectedType} para mensagem '${input}', mas recebeu ${res.type}`);
});

console.log('Todos os testes passaram');
