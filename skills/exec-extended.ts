// Extended Exec Skills - PowerShell, Python, Node, Background, Sudo
// Skills: exec.powershell, exec.python, exec.node, exec.background, exec.sudo

import { SkillBase, SkillResult } from './skill-base';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Store background processes
const backgroundProcesses: Map<string, { process: ChildProcess; command: string; startTime: Date; output: string[] }> = new Map();

// Blocked dangerous patterns
const blockedPatterns = [
  /rm\s+-rf\s+\/(?!\w)/i,
  /mkfs\s/i,
  /dd\s+if=/i,
  /:\(\)\s*{\s*:\|:&\s*};:/,
  /chmod\s+-R\s+777\s+\//i,
  />\s*\/dev\/sd/i,
  /format\s+c:/i,
  /del\s+\/s\s+\/q\s+c:\\/i,
];

function isCommandBlocked(command: string): boolean {
  return blockedPatterns.some(pattern => pattern.test(command));
}

// ============================================================================
// exec.powershell - Execute PowerShell commands
// ============================================================================
export class ExecPowerShellSkill extends SkillBase {
  name = 'exec.powershell';
  description = 'Execute PowerShell commands (Windows)';
  category = 'exec';
  dangerous = true;

  parameters = {
    command: { type: 'string', required: true, description: 'PowerShell command to execute' },
    script: { type: 'string', required: false, description: 'PowerShell script content (multi-line)' },
    cwd: { type: 'string', required: false, description: 'Working directory' },
    timeout: { type: 'number', required: false, description: 'Timeout in ms (default: 60000)' },
  };

  async execute(params: { command?: string; script?: string; cwd?: string; timeout?: number }): Promise<SkillResult> {
    try {
      const cmd = params.command || params.script;
      if (!cmd) return this.error('Command or script required');

      if (isCommandBlocked(cmd)) {
        return this.error('Command blocked for security reasons');
      }

      // Write script to temp file if multi-line
      let psCommand: string;
      if (params.script && params.script.includes('\n')) {
        const tempFile = path.join(os.tmpdir(), `ps-${Date.now()}.ps1`);
        fs.writeFileSync(tempFile, params.script);
        psCommand = `powershell -ExecutionPolicy Bypass -File "${tempFile}"`;
      } else {
        psCommand = `powershell -ExecutionPolicy Bypass -Command "${cmd.replace(/"/g, '\\"')}"`;
      }

      const { stdout, stderr } = await execAsync(psCommand, {
        cwd: params.cwd || process.cwd(),
        timeout: params.timeout || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return this.success({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command: cmd,
      });
    } catch (error: any) {
      return this.error(error.message, {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
        code: error.code,
      });
    }
  }
}

// ============================================================================
// exec.python - Execute Python scripts
// ============================================================================
export class ExecPythonSkill extends SkillBase {
  name = 'exec.python';
  description = 'Execute Python scripts';
  category = 'exec';
  dangerous = true;

  parameters = {
    code: { type: 'string', required: false, description: 'Python code to execute' },
    file: { type: 'string', required: false, description: 'Python file to run' },
    args: { type: 'array', required: false, description: 'Arguments for the script' },
    cwd: { type: 'string', required: false, description: 'Working directory' },
    timeout: { type: 'number', required: false, description: 'Timeout in ms' },
    python: { type: 'string', required: false, description: 'Python executable (python, python3, py)' },
  };

  async execute(params: { code?: string; file?: string; args?: string[]; cwd?: string; timeout?: number; python?: string }): Promise<SkillResult> {
    try {
      if (!params.code && !params.file) {
        return this.error('Either code or file required');
      }

      const pythonCmd = params.python || (process.platform === 'win32' ? 'python' : 'python3');
      let command: string;

      if (params.code) {
        if (isCommandBlocked(params.code)) {
          return this.error('Code blocked for security reasons');
        }
        // Write to temp file
        const tempFile = path.join(os.tmpdir(), `py-${Date.now()}.py`);
        fs.writeFileSync(tempFile, params.code);
        command = `${pythonCmd} "${tempFile}"`;
      } else {
        command = `${pythonCmd} "${params.file}"`;
      }

      if (params.args?.length) {
        command += ' ' + params.args.map(a => `"${a}"`).join(' ');
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: params.cwd || process.cwd(),
        timeout: params.timeout || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return this.success({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
      });
    } catch (error: any) {
      return this.error(error.message, {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
      });
    }
  }
}

// ============================================================================
// exec.node - Execute Node.js scripts
// ============================================================================
export class ExecNodeSkill extends SkillBase {
  name = 'exec.node';
  description = 'Execute Node.js scripts';
  category = 'exec';
  dangerous = true;

  parameters = {
    code: { type: 'string', required: false, description: 'JavaScript code to execute' },
    file: { type: 'string', required: false, description: 'JS file to run' },
    args: { type: 'array', required: false, description: 'Arguments' },
    cwd: { type: 'string', required: false, description: 'Working directory' },
    timeout: { type: 'number', required: false, description: 'Timeout in ms' },
  };

  async execute(params: { code?: string; file?: string; args?: string[]; cwd?: string; timeout?: number }): Promise<SkillResult> {
    try {
      if (!params.code && !params.file) {
        return this.error('Either code or file required');
      }

      let command: string;

      if (params.code) {
        if (isCommandBlocked(params.code)) {
          return this.error('Code blocked for security reasons');
        }
        const tempFile = path.join(os.tmpdir(), `node-${Date.now()}.js`);
        fs.writeFileSync(tempFile, params.code);
        command = `node "${tempFile}"`;
      } else {
        command = `node "${params.file}"`;
      }

      if (params.args?.length) {
        command += ' ' + params.args.map(a => `"${a}"`).join(' ');
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: params.cwd || process.cwd(),
        timeout: params.timeout || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return this.success({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
      });
    } catch (error: any) {
      return this.error(error.message, {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
      });
    }
  }
}

// ============================================================================
// exec.background - Run process in background
// ============================================================================
export class ExecBackgroundSkill extends SkillBase {
  name = 'exec.background';
  description = 'Run process in background, returns process ID';
  category = 'exec';
  dangerous = true;

  parameters = {
    command: { type: 'string', required: true, description: 'Command to run in background' },
    cwd: { type: 'string', required: false, description: 'Working directory' },
    action: { type: 'string', required: false, description: 'Action: start, status, stop, list, output' },
    processId: { type: 'string', required: false, description: 'Process ID for status/stop/output' },
  };

  async execute(params: { command?: string; cwd?: string; action?: string; processId?: string }): Promise<SkillResult> {
    try {
      const action = params.action || 'start';

      // List all background processes
      if (action === 'list') {
        const list = Array.from(backgroundProcesses.entries()).map(([id, info]) => ({
          id,
          command: info.command,
          startTime: info.startTime,
          running: !info.process.killed,
        }));
        return this.success({ processes: list });
      }

      // Get status of a process
      if (action === 'status' && params.processId) {
        const info = backgroundProcesses.get(params.processId);
        if (!info) return this.error('Process not found');
        return this.success({
          id: params.processId,
          command: info.command,
          running: !info.process.killed,
          startTime: info.startTime,
          outputLines: info.output.length,
        });
      }

      // Get output of a process
      if (action === 'output' && params.processId) {
        const info = backgroundProcesses.get(params.processId);
        if (!info) return this.error('Process not found');
        return this.success({
          id: params.processId,
          output: info.output.join('\n'),
        });
      }

      // Stop a process
      if (action === 'stop' && params.processId) {
        const info = backgroundProcesses.get(params.processId);
        if (!info) return this.error('Process not found');
        info.process.kill();
        backgroundProcesses.delete(params.processId);
        return this.success({ stopped: params.processId });
      }

      // Start new background process
      if (action === 'start' && params.command) {
        if (isCommandBlocked(params.command)) {
          return this.error('Command blocked for security reasons');
        }

        const processId = `bg-${Date.now()}`;
        const [cmd, ...args] = params.command.split(' ');

        const child = spawn(cmd, args, {
          cwd: params.cwd || process.cwd(),
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        const info = {
          process: child,
          command: params.command,
          startTime: new Date(),
          output: [] as string[],
        };

        child.stdout?.on('data', (data) => {
          info.output.push(data.toString());
          if (info.output.length > 1000) info.output.shift();
        });

        child.stderr?.on('data', (data) => {
          info.output.push(`[stderr] ${data.toString()}`);
          if (info.output.length > 1000) info.output.shift();
        });

        backgroundProcesses.set(processId, info);

        return this.success({
          processId,
          command: params.command,
          pid: child.pid,
        });
      }

      return this.error('Invalid action or missing parameters');
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// exec.sudo - Execute with elevated privileges
// ============================================================================
export class ExecSudoSkill extends SkillBase {
  name = 'exec.sudo';
  description = 'Execute command with elevated privileges (requires password or admin)';
  category = 'exec';
  dangerous = true;

  parameters = {
    command: { type: 'string', required: true, description: 'Command to execute with sudo' },
    password: { type: 'string', required: false, description: 'Password for sudo (Linux/Mac)' },
    cwd: { type: 'string', required: false, description: 'Working directory' },
    timeout: { type: 'number', required: false, description: 'Timeout in ms' },
  };

  async execute(params: { command: string; password?: string; cwd?: string; timeout?: number }): Promise<SkillResult> {
    try {
      if (isCommandBlocked(params.command)) {
        return this.error('Command blocked for security reasons');
      }

      let fullCommand: string;

      if (process.platform === 'win32') {
        // Windows: Use PowerShell Start-Process with -Verb RunAs
        // Note: This will prompt UAC dialog
        fullCommand = `powershell -Command "Start-Process -FilePath 'cmd' -ArgumentList '/c ${params.command.replace(/'/g, "''")}' -Verb RunAs -Wait"`;
      } else {
        // Linux/Mac: Use sudo
        if (params.password) {
          fullCommand = `echo '${params.password}' | sudo -S ${params.command}`;
        } else {
          fullCommand = `sudo ${params.command}`;
        }
      }

      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: params.cwd || process.cwd(),
        timeout: params.timeout || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return this.success({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command: params.command,
        elevated: true,
      });
    } catch (error: any) {
      return this.error(error.message, {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
      });
    }
  }
}

// ============================================================================
// exec.eval - Evaluate JavaScript expression
// ============================================================================
export class ExecEvalSkill extends SkillBase {
  name = 'exec.eval';
  description = 'Evaluate JavaScript expression and return result';
  category = 'exec';
  dangerous = true;

  parameters = {
    expression: { type: 'string', required: true, description: 'JavaScript expression to evaluate' },
  };

  async execute(params: { expression: string }): Promise<SkillResult> {
    try {
      if (isCommandBlocked(params.expression)) {
        return this.error('Expression blocked for security reasons');
      }

      // Create sandboxed context with limited globals
      const sandbox = {
        Math,
        Date,
        JSON,
        parseInt,
        parseFloat,
        String,
        Number,
        Boolean,
        Array,
        Object,
        console: { log: (...args: any[]) => args },
      };

      const fn = new Function(...Object.keys(sandbox), `return (${params.expression})`);
      const result = fn(...Object.values(sandbox));

      return this.success({
        expression: params.expression,
        result,
        type: typeof result,
      });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// Export all exec skills
export const execExtendedSkills = [
  new ExecPowerShellSkill(),
  new ExecPythonSkill(),
  new ExecNodeSkill(),
  new ExecBackgroundSkill(),
  new ExecSudoSkill(),
  new ExecEvalSkill(),
];

export default execExtendedSkills;
