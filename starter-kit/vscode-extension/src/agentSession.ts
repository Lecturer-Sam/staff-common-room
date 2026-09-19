import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/** One NDJSON line from agent.py --json. */
export interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function expandHome(p: string): string {
  if (p === '~') {
    return os.homedir();
  }
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

/**
 * Owns one `python agent.py --json` child process per workspace.
 *
 * The Python side keeps conversation history, so the process is started on
 * the first message and reused for every follow-up in the same chat. It is
 * killed only when a setting that is read at startup changes (model, mode,
 * auto-approve…) or when the user clicks "New chat" after a hard reset.
 */
export class AgentSession implements vscode.Disposable {
  private proc?: ChildProcessWithoutNullStreams;
  private stdoutBuf = '';
  private stderrTail = '';
  private starting = false;
  private demo = false;
  private readonly output: vscode.OutputChannel;

  constructor(
    private readonly workspace: string,
    private readonly onEvent: (event: AgentEvent) => void,
    private readonly onExit: (code: number | null) => void,
  ) {
    this.output = vscode.window.createOutputChannel('Beacon Agent');
  }

  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('beaconAgent');
  }

  get isRunning(): boolean {
    return this.proc !== undefined;
  }

  /** Locate agent.py: explicit setting, workspace root, or workspace/starter-kit. */
  resolveAgentPy(): string | undefined {
    const configured = str(this.config.get('agentPath')).trim();
    const candidates: string[] = [];
    if (configured) {
      const p = expandHome(configured);
      candidates.push(fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'agent.py') : p);
    }
    candidates.push(path.join(this.workspace, 'agent.py'));
    candidates.push(path.join(this.workspace, 'starter-kit', 'agent.py'));
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }

  /**
   * Pick the interpreter. An explicit setting always wins; otherwise a local
   * virtualenv is preferred, because that is where `pip install -r
   * requirements.txt` put `requests` during setup (plain `python` often lacks it).
   */
  resolvePython(agentPy: string): string {
    const configured = str(this.config.get('pythonPath'), 'python').trim() || 'python';
    if (configured !== 'python' && configured !== 'py') {
      return configured;
    }
    const win = process.platform === 'win32';
    const rels = win
      ? ['.venv/Scripts/python.exe', 'venv/Scripts/python.exe', 'env/Scripts/python.exe']
      : ['.venv/bin/python3', '.venv/bin/python', 'venv/bin/python3', 'venv/bin/python'];
    for (const root of [path.dirname(agentPy), this.workspace]) {
      for (const rel of rels) {
        const candidate = path.join(root, rel);
        if (fs.existsSync(candidate)) {
          this.output.appendLine(`[env] using virtualenv interpreter: ${candidate}`);
          return candidate;
        }
      }
    }
    return configured;
  }

  /** Start the child if needed. Returns false (and reports why) on failure. */
  start(): boolean {
    if (this.proc) {
      return true;
    }
    if (this.starting) {
      return true;
    }
    if (!this.workspace) {
      this.onEvent({
        type: 'error',
        message: 'Open a folder first (File ▸ Open Folder…). The agent works inside one project at a time.',
      });
      return false;
    }
    const agentPy = this.resolveAgentPy();
    if (!agentPy) {
      this.onEvent({
        type: 'error',
        message:
          'Could not find agent.py. Set "Beacon Agent › Agent Path" to the starter-kit folder, ' +
          'or open that folder in VS Code.',
      });
      return false;
    }

    const python = this.resolvePython(agentPy);
    const args = [
      agentPy,
      '--json',
      '--cwd', this.workspace,
      '--model', str(this.config.get('model'), 'qwen2.5-coder:7b'),
      '--mode', str(this.config.get('mode'), 'auto'),
      '--ollama-url', str(this.config.get('ollamaUrl'), 'http://localhost:11434'),
      '--timeout', String(num(this.config.get('timeout'), 600)),
      '--max-steps', String(num(this.config.get('maxSteps'), 6)),
    ];
    if (this.config.get<boolean>('autoApprove', false)) {
      args.push('--yes');
    }
    if (this.demo) {
      args.push('--demo');
    }

    this.output.appendLine(`[spawn] ${python} ${args.join(' ')}`);
    this.starting = true;
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(python, args, {
        cwd: path.dirname(agentPy),
        env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
        windowsHide: true,
      });
    } catch (err) {
      this.starting = false;
      this.onEvent({ type: 'error', message: `Failed to launch ${python}: ${String(err)}` });
      return false;
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => this.onStdout(chunk));
    child.stderr.on('data', (chunk: string) => {
      this.stderrTail = (this.stderrTail + chunk).slice(-2000);
      this.output.append(chunk);
    });
    child.on('error', (err: Error) => {
      this.starting = false;
      this.proc = undefined;
      this.onEvent({
        type: 'error',
        message:
          `Could not start the agent (${err.message}). Is Python installed and is ` +
          `"Beacon Agent › Python Path" (now "${python}") correct?`,
      });
      this.onExit(null);
    });
    child.on('exit', (code: number | null) => {
      if (this.proc === child) {
        this.proc = undefined;
      }
      this.starting = false;
      this.stdoutBuf = '';
      this.output.appendLine(`[exit] code=${code}`);
      if (code !== null && code !== 0) {
        // Translate the common crashes into something the user can act on.
        const stderr = this.stderrTail;
        let message = `The agent process exited (code ${code}). Run "Beacon: Show Agent Log" for the last output.`;
        if (/ModuleNotFoundError|No module named|ImportError/i.test(stderr)) {
          message =
            'Python could not import a dependency (usually `requests`). Point ' +
            '"Beacon Agent ▸ Python Path" at your virtualenv interpreter ' +
            '(.venv\\Scripts\\python.exe on Windows) or run `pip install -r requirements.txt` ' +
            'with the same Python.';
        } else if (/SyntaxError|IndentationError/i.test(stderr)) {
          message = 'agent.py failed to load (syntax error). Re-download agent.py from the kit — it must match this extension version.';
        } else if (/can't open file|No such file or directory.*agent\.py/i.test(stderr)) {
          message = 'agent.py could not be found at the configured path. Check "Beacon Agent ▸ Agent Path".';
        }
        this.stderrTail = '';
        this.onEvent({ type: 'error', message });
        this.onEvent({ type: 'done' });
      }
      this.onExit(code);
    });
    child.stdin.on('error', () => {
      /* the child went away between write and flush — 'exit' reports it */
    });

    this.proc = child;
    this.starting = false;
    return true;
  }

  private onStdout(chunk: string): void {
    this.stdoutBuf += chunk;
    let newline = this.stdoutBuf.indexOf('\n');
    while (newline >= 0) {
      const line = this.stdoutBuf.slice(0, newline).trim();
      this.stdoutBuf = this.stdoutBuf.slice(newline + 1);
      newline = this.stdoutBuf.indexOf('\n');
      if (!line) {
        continue;
      }
      let event: AgentEvent;
      try {
        event = JSON.parse(line) as AgentEvent;
      } catch {
        this.output.appendLine(`[non-json stdout] ${line}`);
        continue;
      }
      if (event && typeof event.type === 'string') {
        this.onEvent(event);
      }
    }
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.proc) {
      return;
    }
    this.proc.stdin.write(JSON.stringify(payload) + '\n');
  }

  /** Send a user message; starts the child on first use. */
  ask(task: string, keepDemo = false): boolean {
    if (this.demo && !keepDemo) {
      // The offline demo lasts exactly one run: a normal question gets the real model.
      this.restart();
      this.demo = false;
    }
    if (!this.start()) {
      return false;
    }
    this.send({ task });
    return true;
  }

  /** Start a throwaway session whose brain is the scripted demo (no Ollama). */
  startWithDemo(): boolean {
    this.restart();
    this.demo = true;
    return this.start();
  }

  approve(): void {
    this.send({ decision: 'approve' });
  }

  deny(): void {
    this.send({ decision: 'deny' });
  }

  cancel(): void {
    this.send({ type: 'cancel' });
  }

  resetHistory(): void {
    this.send({ type: 'reset' });
  }

  setMode(mode: string): void {
    this.send({ type: 'set_mode', mode });
  }

  /** Kill the child; the next ask() starts a fresh one with current settings. */
  restart(): void {
    const proc = this.proc;
    this.proc = undefined;
    this.stdoutBuf = '';
    if (proc) {
      proc.kill();
    }
  }

  showOutput(): void {
    this.output.show(true);
  }

  dispose(): void {
    this.restart();
    this.output.dispose();
  }
}
