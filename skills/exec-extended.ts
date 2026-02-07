// Extended Exec Skills - PowerShell, Python, Node, Background, Sudo
// Skills: exec.powershell, exec.python, exec.node, exec.background, exec.sudo

import { Skill, SkillOutput, SkillInput } from './skill-base';
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
export class ExecPowerShellSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.powershell',
        description: 'Execute PowerShell commands (Windows)',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['powershell', 'windows', 'script'],
      },
      {
        timeout: 60000,
        retries: 1,
        requiresApproval: true,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { command, script } = input;
    if (!command && !script) return false;
    const cmd = (command || script) as string;
    return !isCommandBlocked(cmd);
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { command, script, cwd, timeout } = input;

    try {
      const cmd = command || script;
      if (!cmd) {
        return { success: false, error: 'Command or script required' };
      }

      // Write script to temp file if multi-line
      let psCommand: string;
      if (script && (script as string).includes('\n')) {
        const tempFile = path.join(os.tmpdir(), `ps-${Date.now()}.ps1`);
        fs.writeFileSync(tempFile, script);
        psCommand = `powershell -ExecutionPolicy Bypass -File "${tempFile}"`;
      } else {
        psCommand = `powershell -ExecutionPolicy Bypass -Command "${(cmd as string).replace(/"/g, '\\"')}"`;
      }

      const { stdout, stderr } = await execAsync(psCommand, {
        cwd: (cwd as string) || process.cwd(),
        timeout: (timeout as number) || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command: cmd,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: {
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          code: error.code,
        },
      };
    }
  }
}

// ============================================================================
// exec.python - Execute Python scripts
// ============================================================================
export class ExecPythonSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.python',
        description: 'Execute Python scripts',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['python', 'script'],
      },
      {
        timeout: 60000,
        retries: 1,
        requiresApproval: true,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { code, file } = input;
    if (!code && !file) return false;
    if (code && isCommandBlocked(code as string)) return false;
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { code, file, args, cwd, timeout, python } = input;

    try {
      if (!code && !file) {
        return { success: false, error: 'Either code or file required' };
      }

      const pythonCmd = (python as string) || (process.platform === 'win32' ? 'python' : 'python3');
      let command: string;

      if (code) {
        // Write to temp file
        const tempFile = path.join(os.tmpdir(), `py-${Date.now()}.py`);
        fs.writeFileSync(tempFile, code as string);
        command = `${pythonCmd} "${tempFile}"`;
      } else {
        command = `${pythonCmd} "${file}"`;
      }

      if (args && Array.isArray(args)) {
        command += ' ' + (args as string[]).map(a => `"${a}"`).join(' ');
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: (cwd as string) || process.cwd(),
        timeout: (timeout as number) || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: {
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
        },
      };
    }
  }
}

// ============================================================================
// exec.node - Execute Node.js scripts
// ============================================================================
export class ExecNodeSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.node',
        description: 'Execute Node.js scripts',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['node', 'javascript', 'script'],
      },
      {
        timeout: 60000,
        retries: 1,
        requiresApproval: true,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { code, file } = input;
    if (!code && !file) return false;
    if (code && isCommandBlocked(code as string)) return false;
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { code, file, args, cwd, timeout } = input;

    try {
      if (!code && !file) {
        return { success: false, error: 'Either code or file required' };
      }

      let command: string;

      if (code) {
        const tempFile = path.join(os.tmpdir(), `node-${Date.now()}.js`);
        fs.writeFileSync(tempFile, code as string);
        command = `node "${tempFile}"`;
      } else {
        command = `node "${file}"`;
      }

      if (args && Array.isArray(args)) {
        command += ' ' + (args as string[]).map(a => `"${a}"`).join(' ');
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: (cwd as string) || process.cwd(),
        timeout: (timeout as number) || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: {
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
        },
      };
    }
  }
}

// ============================================================================
// exec.background - Run process in background
// ============================================================================
export class ExecBackgroundSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.background',
        description: 'Run process in background, returns process ID',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['background', 'process', 'async'],
      },
      {
        timeout: 30000,
        retries: 1,
        requiresApproval: true,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { action, command } = input;
    const act = action || 'start';
    if (act === 'start' && !command) return false;
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { command, cwd, action, processId } = input;
      const act = (action as string) || 'start';

      // List all background processes
      if (act === 'list') {
        const list = Array.from(backgroundProcesses.entries()).map(([id, info]) => ({
          id,
          command: info.command,
          startTime: info.startTime,
          running: !info.process.killed,
        }));
        return { success: true, data: { processes: list } };
      }

      // Get status of a process
      if (act === 'status' && processId) {
        const info = backgroundProcesses.get(processId as string);
        if (!info) return { success: false, error: 'Process not found' };
        return {
          success: true,
          data: {
            id: processId,
            command: info.command,
            running: !info.process.killed,
            startTime: info.startTime,
            outputLines: info.output.length,
          },
        };
      }

      // Get output of a process
      if (act === 'output' && processId) {
        const info = backgroundProcesses.get(processId as string);
        if (!info) return { success: false, error: 'Process not found' };
        return {
          success: true,
          data: {
            id: processId,
            output: info.output.join('\n'),
          },
        };
      }

      // Stop a process
      if (act === 'stop' && processId) {
        const info = backgroundProcesses.get(processId as string);
        if (!info) return { success: false, error: 'Process not found' };
        info.process.kill();
        backgroundProcesses.delete(processId as string);
        return { success: true, data: { stopped: processId } };
      }

      // Start new background process
      if (act === 'start' && command) {
        if (isCommandBlocked(command as string)) {
          return { success: false, error: 'Command blocked for security reasons' };
        }

        const processId = `bg-${Date.now()}`;
        const [cmd, ...cmdArgs] = (command as string).split(' ');

        const child = spawn(cmd, cmdArgs, {
          cwd: (cwd as string) || process.cwd(),
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        const info = {
          process: child,
          command: command as string,
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

        return {
          success: true,
          data: {
            processId,
            command,
            pid: child.pid,
          },
        };
      }

      return { success: false, error: 'Invalid action or missing parameters' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// exec.sudo - Execute with elevated privileges
// ============================================================================
export class ExecSudoSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.sudo',
        description: 'Execute command with elevated privileges (requires password or admin)',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['sudo', 'elevated', 'admin'],
      },
      {
        timeout: 60000,
        retries: 1,
        requiresApproval: true,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { command } = input;
    if (!command) return false;
    return !isCommandBlocked(command as string);
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { command, password, cwd, timeout } = input;

    try {
      if (!command) {
        return { success: false, error: 'Command required' };
      }

      let fullCommand: string;

      if (process.platform === 'win32') {
        // Windows: Use PowerShell Start-Process with -Verb RunAs
        fullCommand = `powershell -Command "Start-Process -FilePath 'cmd' -ArgumentList '/c ${(command as string).replace(/'/g, "''")}' -Verb RunAs -Wait"`;
      } else {
        // Linux/Mac: Use sudo
        if (password) {
          fullCommand = `echo '${password}' | sudo -S ${command}`;
        } else {
          fullCommand = `sudo ${command}`;
        }
      }

      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: (cwd as string) || process.cwd(),
        timeout: (timeout as number) || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command,
          elevated: true,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: {
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
        },
      };
    }
  }
}

// ============================================================================
// exec.eval - Evaluate JavaScript expression
// ============================================================================
export class ExecEvalSkill extends Skill {
  constructor() {
    super(
      {
        name: 'exec.eval',
        description: 'Evaluate JavaScript expression and return result',
        version: '1.0.0',
        category: 'EXEC',
        tags: ['eval', 'javascript', 'expression'],
      },
      {
        timeout: 5000,
        retries: 1,
        requiresApproval: true,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const { expression } = input;
    if (!expression) return false;
    return !isCommandBlocked(expression as string);
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { expression } = input;

    try {
      if (!expression) {
        return { success: false, error: 'Expression required' };
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

      const fn = new Function(...Object.keys(sandbox), `return (${expression})`);
      const result = fn(...Object.values(sandbox));

      return {
        success: true,
        data: {
          expression,
          result,
          type: typeof result,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
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
