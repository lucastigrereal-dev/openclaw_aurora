// AutoPC Skills - Desktop automation (mouse, keyboard, window control)
// Skills: autopc.click, autopc.type, autopc.press, autopc.move, autopc.screenshot, autopc.window

import { SkillBase, SkillResult } from './skill-base';
import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Detect OS
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// ============================================================================
// Helper functions for cross-platform automation
// ============================================================================

async function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`powershell -Command "${script.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout.trim());
    });
  });
}

async function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script.replace(/'/g, "\\'")}'`, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout.trim());
    });
  });
}

async function runXdotool(args: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`xdotool ${args}`, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout.trim());
    });
  });
}

// ============================================================================
// autopc.click - Click at coordinates
// ============================================================================
export class AutoPCClickSkill extends SkillBase {
  name = 'autopc.click';
  description = 'Click mouse at screen coordinates';
  category = 'autopc';
  dangerous = true;

  parameters = {
    x: { type: 'number', required: true, description: 'X coordinate' },
    y: { type: 'number', required: true, description: 'Y coordinate' },
    button: { type: 'string', required: false, description: 'Mouse button: left, right, middle' },
    clicks: { type: 'number', required: false, description: 'Number of clicks' },
  };

  async execute(params: { x: number; y: number; button?: string; clicks?: number }): Promise<SkillResult> {
    try {
      const { x, y, button = 'left', clicks = 1 } = params;

      if (isWindows) {
        // PowerShell with .NET
        const script = `
          Add-Type -AssemblyName System.Windows.Forms
          [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
          Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int data, int info);' -Name U32 -Namespace W
          $down = ${button === 'right' ? '0x0008' : '0x0002'}
          $up = ${button === 'right' ? '0x0010' : '0x0004'}
          for ($i = 0; $i -lt ${clicks}; $i++) { [W.U32]::mouse_event($down, 0, 0, 0, 0); [W.U32]::mouse_event($up, 0, 0, 0, 0) }
        `;
        await runPowerShell(script);
      } else if (isMac) {
        // AppleScript + cliclick if available
        const clickType = button === 'right' ? 'rc' : 'c';
        for (let i = 0; i < clicks; i++) {
          await runAppleScript(`do shell script "cliclick ${clickType}:${x},${y}"`);
        }
      } else if (isLinux) {
        // xdotool
        const btn = button === 'right' ? '3' : button === 'middle' ? '2' : '1';
        await runXdotool(`mousemove ${x} ${y}`);
        for (let i = 0; i < clicks; i++) {
          await runXdotool(`click ${btn}`);
        }
      }

      return this.success({ clicked: { x, y, button, clicks } });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// autopc.move - Move mouse to coordinates
// ============================================================================
export class AutoPCMoveSkill extends SkillBase {
  name = 'autopc.move';
  description = 'Move mouse to coordinates';
  category = 'autopc';
  dangerous = true;

  parameters = {
    x: { type: 'number', required: true, description: 'X coordinate' },
    y: { type: 'number', required: true, description: 'Y coordinate' },
  };

  async execute(params: { x: number; y: number }): Promise<SkillResult> {
    try {
      const { x, y } = params;

      if (isWindows) {
        await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`);
      } else if (isMac) {
        await runAppleScript(`do shell script "cliclick m:${x},${y}"`);
      } else if (isLinux) {
        await runXdotool(`mousemove ${x} ${y}`);
      }

      return this.success({ moved: { x, y } });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// autopc.type - Type text
// ============================================================================
export class AutoPCTypeSkill extends SkillBase {
  name = 'autopc.type';
  description = 'Type text on keyboard';
  category = 'autopc';
  dangerous = true;

  parameters = {
    text: { type: 'string', required: true, description: 'Text to type' },
    delay: { type: 'number', required: false, description: 'Delay between keystrokes (ms)' },
  };

  async execute(params: { text: string; delay?: number }): Promise<SkillResult> {
    try {
      const { text, delay = 50 } = params;

      if (isWindows) {
        // PowerShell SendKeys
        const escaped = text.replace(/[+^%~(){}[\]]/g, '{$&}');
        await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${escaped}")`);
      } else if (isMac) {
        await runAppleScript(`tell application "System Events" to keystroke "${text.replace(/"/g, '\\"')}"`);
      } else if (isLinux) {
        await runXdotool(`type --delay ${delay} "${text.replace(/"/g, '\\"')}"`);
      }

      return this.success({ typed: text });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// autopc.press - Press special keys
// ============================================================================
export class AutoPCPressSkill extends SkillBase {
  name = 'autopc.press';
  description = 'Press special keys (Enter, Tab, Escape, etc.)';
  category = 'autopc';
  dangerous = true;

  parameters = {
    key: { type: 'string', required: true, description: 'Key to press (enter, tab, escape, backspace, delete, up, down, left, right, f1-f12, ctrl+c, etc.)' },
  };

  async execute(params: { key: string }): Promise<SkillResult> {
    try {
      const { key } = params;
      const keyLower = key.toLowerCase();

      // Key mapping
      const winKeys: Record<string, string> = {
        enter: '{ENTER}', tab: '{TAB}', escape: '{ESC}', esc: '{ESC}',
        backspace: '{BACKSPACE}', delete: '{DELETE}', del: '{DELETE}',
        up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
        home: '{HOME}', end: '{END}', pageup: '{PGUP}', pagedown: '{PGDN}',
        f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}', f5: '{F5}',
        f6: '{F6}', f7: '{F7}', f8: '{F8}', f9: '{F9}', f10: '{F10}',
        f11: '{F11}', f12: '{F12}', space: ' ',
        'ctrl+a': '^a', 'ctrl+c': '^c', 'ctrl+v': '^v', 'ctrl+x': '^x',
        'ctrl+z': '^z', 'ctrl+s': '^s', 'alt+f4': '%{F4}', 'alt+tab': '%{TAB}',
      };

      const macKeys: Record<string, string> = {
        enter: 'return', tab: 'tab', escape: 'escape', esc: 'escape',
        backspace: 'delete', delete: 'forward delete',
        up: 'up arrow', down: 'down arrow', left: 'left arrow', right: 'right arrow',
      };

      const linuxKeys: Record<string, string> = {
        enter: 'Return', tab: 'Tab', escape: 'Escape', esc: 'Escape',
        backspace: 'BackSpace', delete: 'Delete',
        up: 'Up', down: 'Down', left: 'Left', right: 'Right',
        home: 'Home', end: 'End', pageup: 'Page_Up', pagedown: 'Page_Down',
        f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5',
        f6: 'F6', f7: 'F7', f8: 'F8', f9: 'F9', f10: 'F10',
        f11: 'F11', f12: 'F12', space: 'space',
        'ctrl+a': 'ctrl+a', 'ctrl+c': 'ctrl+c', 'ctrl+v': 'ctrl+v',
        'ctrl+z': 'ctrl+z', 'ctrl+s': 'ctrl+s',
      };

      if (isWindows) {
        const winKey = winKeys[keyLower] || `{${key.toUpperCase()}}`;
        await runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${winKey}")`);
      } else if (isMac) {
        const macKey = macKeys[keyLower] || key;
        if (keyLower.includes('+')) {
          const [mod, k] = keyLower.split('+');
          const modifier = mod === 'ctrl' ? 'control' : mod === 'alt' ? 'option' : mod;
          await runAppleScript(`tell application "System Events" to key code (key code "${k}") using ${modifier} down`);
        } else {
          await runAppleScript(`tell application "System Events" to key code (key code "${macKey}")`);
        }
      } else if (isLinux) {
        const linuxKey = linuxKeys[keyLower] || key;
        await runXdotool(`key ${linuxKey}`);
      }

      return this.success({ pressed: key });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// autopc.screenshot - Take desktop screenshot
// ============================================================================
export class AutoPCScreenshotSkill extends SkillBase {
  name = 'autopc.screenshot';
  description = 'Take a screenshot of the desktop';
  category = 'autopc';
  dangerous = false;

  parameters = {
    path: { type: 'string', required: false, description: 'Save path (default: desktop-{timestamp}.png)' },
    region: { type: 'object', required: false, description: 'Region {x, y, width, height}' },
  };

  async execute(params: { path?: string; region?: { x: number; y: number; width: number; height: number } }): Promise<SkillResult> {
    try {
      const filename = params.path || `desktop-${Date.now()}.png`;
      const absPath = path.resolve(filename);

      if (isWindows) {
        if (params.region) {
          const { x, y, width, height } = params.region;
          await runPowerShell(`
            Add-Type -AssemblyName System.Windows.Forms
            $bitmap = New-Object System.Drawing.Bitmap(${width}, ${height})
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.CopyFromScreen(${x}, ${y}, 0, 0, $bitmap.Size)
            $bitmap.Save("${absPath.replace(/\\/g, '\\\\')}")
          `);
        } else {
          await runPowerShell(`
            Add-Type -AssemblyName System.Windows.Forms
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
            $bitmap.Save("${absPath.replace(/\\/g, '\\\\')}")
          `);
        }
      } else if (isMac) {
        if (params.region) {
          const { x, y, width, height } = params.region;
          execSync(`screencapture -R${x},${y},${width},${height} "${absPath}"`);
        } else {
          execSync(`screencapture "${absPath}"`);
        }
      } else if (isLinux) {
        if (params.region) {
          const { x, y, width, height } = params.region;
          execSync(`import -window root -crop ${width}x${height}+${x}+${y} "${absPath}" || scrot -a ${x},${y},${width},${height} "${absPath}"`);
        } else {
          execSync(`import -window root "${absPath}" || scrot "${absPath}"`);
        }
      }

      return this.success({ screenshot: absPath });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// autopc.window - Window management
// ============================================================================
export class AutoPCWindowSkill extends SkillBase {
  name = 'autopc.window';
  description = 'Manage windows (focus, minimize, maximize, close, list)';
  category = 'autopc';
  dangerous = true;

  parameters = {
    action: { type: 'string', required: true, description: 'Action: focus, minimize, maximize, restore, close, list' },
    title: { type: 'string', required: false, description: 'Window title (partial match)' },
    pid: { type: 'number', required: false, description: 'Process ID' },
  };

  async execute(params: { action: string; title?: string; pid?: number }): Promise<SkillResult> {
    try {
      const { action, title, pid } = params;

      if (action === 'list') {
        let windows: string[] = [];
        if (isWindows) {
          const result = await runPowerShell(`Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object Id, MainWindowTitle | Format-Table -HideTableHeaders`);
          windows = result.split('\n').filter(Boolean);
        } else if (isLinux) {
          const result = await runXdotool('search --name ""');
          windows = result.split('\n').filter(Boolean);
        }
        return this.success({ windows });
      }

      if (!title && !pid) {
        return this.error('Window title or pid required');
      }

      if (isWindows) {
        const filter = pid ? `$_.Id -eq ${pid}` : `$_.MainWindowTitle -like "*${title}*"`;
        const actions: Record<string, string> = {
          focus: `$w = (Get-Process | Where-Object {${filter}})[0]; Add-Type '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);' -Name W -Namespace U; [U.W]::SetForegroundWindow($w.MainWindowHandle)`,
          minimize: `$w = (Get-Process | Where-Object {${filter}})[0]; $w.MainWindowHandle | ForEach-Object { $sig='[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; Add-Type -MemberDefinition $sig -Name W -Namespace U; [U.W]::ShowWindow($_, 6) }`,
          maximize: `$w = (Get-Process | Where-Object {${filter}})[0]; $w.MainWindowHandle | ForEach-Object { $sig='[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; Add-Type -MemberDefinition $sig -Name W -Namespace U; [U.W]::ShowWindow($_, 3) }`,
          restore: `$w = (Get-Process | Where-Object {${filter}})[0]; $w.MainWindowHandle | ForEach-Object { $sig='[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; Add-Type -MemberDefinition $sig -Name W -Namespace U; [U.W]::ShowWindow($_, 9) }`,
          close: `(Get-Process | Where-Object {${filter}})[0] | Stop-Process`,
        };
        await runPowerShell(actions[action] || '');
      } else if (isLinux) {
        const searchArg = pid ? `--pid ${pid}` : `--name "${title}"`;
        const actions: Record<string, string> = {
          focus: `windowactivate $(xdotool search ${searchArg} | head -1)`,
          minimize: `windowminimize $(xdotool search ${searchArg} | head -1)`,
          maximize: `windowsize $(xdotool search ${searchArg} | head -1) 100% 100%`,
          close: `windowclose $(xdotool search ${searchArg} | head -1)`,
        };
        await runXdotool(actions[action] || '');
      } else if (isMac) {
        const actions: Record<string, string> = {
          focus: `tell application "${title}" to activate`,
          minimize: `tell application "System Events" to set miniaturized of (first window of process "${title}") to true`,
          close: `tell application "${title}" to quit`,
        };
        await runAppleScript(actions[action] || '');
      }

      return this.success({ action, title: title || pid });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// ============================================================================
// autopc.scroll - Scroll mouse wheel
// ============================================================================
export class AutoPCScrollSkill extends SkillBase {
  name = 'autopc.scroll';
  description = 'Scroll mouse wheel';
  category = 'autopc';
  dangerous = true;

  parameters = {
    direction: { type: 'string', required: true, description: 'Direction: up, down, left, right' },
    amount: { type: 'number', required: false, description: 'Scroll amount (default: 3)' },
  };

  async execute(params: { direction: string; amount?: number }): Promise<SkillResult> {
    try {
      const { direction, amount = 3 } = params;
      const scrollAmount = direction === 'up' || direction === 'left' ? amount : -amount;

      if (isWindows) {
        const delta = scrollAmount * 120;
        await runPowerShell(`Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int data, int info);' -Name U32 -Namespace W; [W.U32]::mouse_event(0x0800, 0, 0, ${delta}, 0)`);
      } else if (isLinux) {
        const btn = scrollAmount > 0 ? '4' : '5';
        for (let i = 0; i < Math.abs(scrollAmount); i++) {
          await runXdotool(`click ${btn}`);
        }
      } else if (isMac) {
        await runAppleScript(`do shell script "cliclick s:${scrollAmount}"`);
      }

      return this.success({ scrolled: { direction, amount } });
    } catch (error: any) {
      return this.error(error.message);
    }
  }
}

// Export all autopc skills
export const autopcSkills = [
  new AutoPCClickSkill(),
  new AutoPCMoveSkill(),
  new AutoPCTypeSkill(),
  new AutoPCPressSkill(),
  new AutoPCScreenshotSkill(),
  new AutoPCWindowSkill(),
  new AutoPCScrollSkill(),
];

export default autopcSkills;
