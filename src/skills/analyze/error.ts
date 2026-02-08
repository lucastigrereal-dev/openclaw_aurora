/**
 * analyze.error - P1 Skill
 * Analisa erros de build/test e extrai informações para correção
 *
 * Funcionalidades:
 * - Parseia erros TypeScript (TS2345, TS2304, etc)
 * - Parseia erros Node (Cannot find module, etc)
 * - Identifica arquivo e linha do erro
 * - Sugere correção baseada em padrões comuns
 */

import { Skill, SkillInput, SkillOutput } from '../base';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface AnalyzeErrorInput {
  appLocation: string;
  errorType: 'build' | 'test' | 'runtime';
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ErrorInfo {
  errorCode?: string;       // TS2345, ENOENT, etc
  errorType: string;        // 'typescript' | 'node' | 'npm' | 'unknown'
  message: string;          // Mensagem principal do erro
  file?: string;            // Arquivo afetado (caminho relativo)
  line?: number;            // Linha do erro
  column?: number;          // Coluna do erro
  suggestion?: string;      // Sugestão de correção
}

export interface AnalyzeErrorOutput {
  errors: ErrorInfo[];
  primaryError?: ErrorInfo; // Erro mais importante
  totalErrors: number;
  canAutoFix: boolean;      // Se pode ser corrigido automaticamente
  fixHint?: string;         // Dica para correção manual
}

// ============================================================================
// PADRÕES DE ERRO CONHECIDOS
// ============================================================================

interface ErrorPattern {
  regex: RegExp;
  type: string;
  extract: (match: RegExpMatchArray, fullText: string) => ErrorInfo;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // TypeScript: src/index.ts(5,10): error TS2345: ...
  {
    regex: /([^\s]+\.tsx?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/g,
    type: 'typescript',
    extract: (match) => ({
      errorType: 'typescript',
      errorCode: match[4],
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[5].trim(),
      suggestion: getTSSuggestion(match[4], match[5]),
    }),
  },
  // TypeScript (tsc format): src/index.ts:5:10 - error TS2345: ...
  {
    regex: /([^\s]+\.tsx?):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/g,
    type: 'typescript',
    extract: (match) => ({
      errorType: 'typescript',
      errorCode: match[4],
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[5].trim(),
      suggestion: getTSSuggestion(match[4], match[5]),
    }),
  },
  // Node: Cannot find module 'xxx'
  {
    regex: /Cannot find module ['"]([^'"]+)['"]/g,
    type: 'node',
    extract: (match) => ({
      errorType: 'node',
      errorCode: 'MODULE_NOT_FOUND',
      message: `Cannot find module '${match[1]}'`,
      suggestion: `Run 'npm install ${match[1]}' or check if the import path is correct`,
    }),
  },
  // Node: ReferenceError / TypeError
  {
    regex: /(ReferenceError|TypeError|SyntaxError):\s*(.+)/g,
    type: 'node',
    extract: (match) => ({
      errorType: 'node',
      errorCode: match[1],
      message: match[2].trim(),
      suggestion: getRuntimeSuggestion(match[1], match[2]),
    }),
  },
  // npm ERR!
  {
    regex: /npm ERR!\s*(.+)/g,
    type: 'npm',
    extract: (match) => ({
      errorType: 'npm',
      errorCode: 'NPM_ERROR',
      message: match[1].trim(),
    }),
  },
  // Generic error with file:line
  {
    regex: /Error:\s*(.+)\s+at\s+([^\s]+):(\d+):?(\d+)?/g,
    type: 'generic',
    extract: (match) => ({
      errorType: 'generic',
      message: match[1].trim(),
      file: match[2],
      line: parseInt(match[3]),
      column: match[4] ? parseInt(match[4]) : undefined,
    }),
  },
];

// ============================================================================
// SUGESTÕES POR CÓDIGO DE ERRO
// ============================================================================

function getTSSuggestion(code: string, message: string): string | undefined {
  const suggestions: Record<string, string> = {
    'TS2304': 'Check if the identifier is imported or declared',
    'TS2345': 'Check argument types - they may not match the expected parameter type',
    'TS2322': 'Type mismatch - check if the assigned value matches the expected type',
    'TS2339': 'Property does not exist - check spelling or add the property to the type',
    'TS2307': 'Module not found - check the import path or install the dependency',
    'TS1005': 'Syntax error - check for missing punctuation (semicolon, bracket, etc)',
    'TS1003': 'Identifier expected - check for missing variable or function name',
    'TS2554': 'Wrong number of arguments - check the function signature',
    'TS2551': 'Property typo - check spelling (did you mean...)',
    'TS7006': 'Parameter has implicit any - add type annotation',
  };

  return suggestions[code];
}

function getRuntimeSuggestion(errorType: string, message: string): string | undefined {
  if (errorType === 'ReferenceError') {
    return 'Variable/function not defined - check spelling or if it was declared';
  }
  if (errorType === 'TypeError') {
    if (message.includes('undefined')) {
      return 'Trying to access property of undefined - add null check';
    }
    return 'Type error - check if the value has the expected type';
  }
  if (errorType === 'SyntaxError') {
    return 'Syntax error - check for missing brackets, quotes, or semicolons';
  }
  return undefined;
}

// ============================================================================
// SKILL
// ============================================================================

export class AnalyzeErrorSkill extends Skill {
  constructor() {
    super(
      {
        name: 'analyze.error',
        description: 'Analisa erros de build/test e extrai informações para correção',
        version: '1.0.0',
        category: 'UTIL',
        author: 'OpenClaw',
        tags: ['p1', 'analyze', 'error', 'typescript', 'node'],
      },
      {
        timeout: 30000,
        retries: 0,
        requiresApproval: false,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const params = input.params as AnalyzeErrorInput;
    return !!(params?.appLocation && params?.errorType);
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.params as AnalyzeErrorInput;
    const { appLocation, errorType, stdout, stderr, exitCode } = params;

    console.log(`[analyze.error] Analyzing ${errorType} error (exit code: ${exitCode})`);

    // Combinar stdout e stderr para análise
    const fullOutput = `${stdout}\n${stderr}`;

    // Extrair erros usando patterns
    const errors: ErrorInfo[] = [];

    for (const pattern of ERROR_PATTERNS) {
      // Reset regex state
      pattern.regex.lastIndex = 0;

      let match;
      while ((match = pattern.regex.exec(fullOutput)) !== null) {
        const errorInfo = pattern.extract(match, fullOutput);

        // Normalizar path do arquivo (relativo ao appLocation)
        if (errorInfo.file) {
          errorInfo.file = this.normalizePath(errorInfo.file, appLocation);
        }

        errors.push(errorInfo);
      }
    }

    // Se não encontrou erros específicos, criar erro genérico
    if (errors.length === 0 && exitCode !== 0) {
      // Tentar extrair primeira linha relevante de erro
      const lines = fullOutput.split('\n').filter(l =>
        l.toLowerCase().includes('error') ||
        l.toLowerCase().includes('failed')
      );

      errors.push({
        errorType: 'unknown',
        message: lines[0] || `Process exited with code ${exitCode}`,
      });
    }

    // Determinar erro primário (primeiro TypeScript > primeiro Node > primeiro outro)
    const primaryError = this.selectPrimaryError(errors);

    // Determinar se pode auto-corrigir
    const canAutoFix = this.canAutoFix(primaryError);

    const output: AnalyzeErrorOutput = {
      errors,
      primaryError,
      totalErrors: errors.length,
      canAutoFix,
      fixHint: primaryError?.suggestion,
    };

    console.log(`[analyze.error] Found ${errors.length} errors`);
    if (primaryError) {
      console.log(`[analyze.error] Primary: ${primaryError.errorCode || 'unknown'} - ${primaryError.message.substring(0, 50)}...`);
    }

    return this.success(output);
  }

  private normalizePath(filePath: string, appLocation: string): string {
    // Remover prefixos absolutos se o caminho já contém appLocation
    if (filePath.includes(appLocation)) {
      return path.relative(appLocation, filePath);
    }
    // Se já é relativo, manter
    if (!path.isAbsolute(filePath)) {
      return filePath;
    }
    // Tentar tornar relativo
    return path.relative(appLocation, filePath);
  }

  private selectPrimaryError(errors: ErrorInfo[]): ErrorInfo | undefined {
    if (errors.length === 0) return undefined;

    // Priorizar TypeScript com arquivo
    const tsWithFile = errors.find(e => e.errorType === 'typescript' && e.file);
    if (tsWithFile) return tsWithFile;

    // Depois TypeScript sem arquivo
    const ts = errors.find(e => e.errorType === 'typescript');
    if (ts) return ts;

    // Depois Node
    const node = errors.find(e => e.errorType === 'node');
    if (node) return node;

    // Primeiro qualquer
    return errors[0];
  }

  private canAutoFix(error?: ErrorInfo): boolean {
    if (!error) return false;

    // Erros que podem ser auto-corrigidos
    const autoFixable = [
      'TS2304', // Cannot find name - pode importar
      'TS2307', // Cannot find module - pode instalar
      'TS7006', // Implicit any - pode adicionar tipo
      'MODULE_NOT_FOUND', // npm install
    ];

    return error.errorCode !== undefined && autoFixable.includes(error.errorCode);
  }
}

// Factory
export function createAnalyzeErrorSkill(): AnalyzeErrorSkill {
  return new AnalyzeErrorSkill();
}
