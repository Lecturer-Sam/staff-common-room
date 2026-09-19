import * as vscode from 'vscode';
import { AgentEvent, AgentSession } from './agentSession';
import { ChatViewProvider } from './chatPanel';
import { DiffContentProvider } from './diffProvider';

const MAX_SNIPPET = 6000;

export function activate(context: vscode.ExtensionContext): void {
  const folder = vscode.workspace.workspaceFolders?.[0];
  const workspace = folder ? folder.uri.fsPath : '';

  const diffs = new DiffContentProvider();
  const session = new AgentSession(
    workspace,
    (event) => provider.onEvent(event),
    (code) => {
      // A crashed child would otherwise leave the panel waiting forever.
      if (code !== null && code !== 0) {
        provider.onEvent({
          type: 'error',
          message: `The agent process exited (code ${code}). Run "Beacon: Show Agent Log" for the last output, then send again.`,
        });
        provider.onEvent({ type: 'done' });
      }
    },
  );
  const provider = new ChatViewProvider(session, diffs);

  context.subscriptions.push(
    diffs.register(),
    session,
    provider,
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // ---------------------------------------------------------------- status
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  status.command = 'beaconAgent.chooseMode';
  status.tooltip = 'Beacon Agent — click to choose mode (auto / beacon / general)';
  const modeOf = (): string => vscode.workspace.getConfiguration('beaconAgent').get<string>('mode', 'auto');
  const paintStatus = (mode: string): void => {
    status.text = `$(sparkle) Beacon: ${mode}`;
    status.show();
  };
  paintStatus(modeOf());
  context.subscriptions.push(status, provider.onModeChanged(paintStatus));

  // ------------------------------------------------------------- workspace
  const requireWorkspace = (): string | undefined => {
    if (!workspace) {
      void vscode.window.showWarningMessage(
        'Beacon Agent needs an open folder. Use File ▸ Open Folder… and pick your project (or the starter-kit folder).',
      );
      return undefined;
    }
    return workspace;
  };

  // -------------------------------------------------------------- commands
  context.subscriptions.push(
    vscode.commands.registerCommand('beaconAgent.chat', async () => {
      await vscode.commands.executeCommand('beaconAgent.chat.focus');
    }),

    vscode.commands.registerCommand('beaconAgent.ask', async () => {
      if (!requireWorkspace()) {
        return;
      }
      const question = await vscode.window.showInputBox({
        title: 'Beacon Agent',
        prompt: 'What should the agent do?',
        placeHolder: 'e.g. add a test for greet()',
      });
      if (question) {
        provider.ask(question);
      }
    }),

    vscode.commands.registerCommand('beaconAgent.askSelection', async () => {
      if (!requireWorkspace()) {
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Beacon Agent: open a file and select some code first.');
        return;
      }
      const doc = editor.document;
      const selection = doc.getText(editor.selection);
      const rel = vscode.workspace.asRelativePath(doc.uri, false);
      const range = editor.selection.isEmpty
        ? 'whole file'
        : `lines ${editor.selection.start.line + 1}-${editor.selection.end.line + 1}`;
      const instruction = await vscode.window.showInputBox({
        title: `Beacon Agent — ${rel} (${range})`,
        prompt: 'What should I do with this code?',
        placeHolder: 'explain this / add error handling / write a test',
      });
      if (!instruction) {
        return;
      }
      const snippet = (selection || doc.getText()).slice(0, MAX_SNIPPET);
      const fence = '```';
      const prompt =
        `${instruction}\n\n` +
        `Context — ${rel} (${range}):\n${fence}${doc.languageId}\n${snippet}\n${fence}`;
      provider.ask(prompt);
    }),

    vscode.commands.registerCommand('beaconAgent.newChat', () => provider.newChat()),

    vscode.commands.registerCommand('beaconAgent.chooseMode', async () => {
      const current = modeOf();
      const picked = await vscode.window.showQuickPick(
        [
          { label: 'auto', description: 'Pick the skill from your wording (default)', mode: 'auto' },
          { label: 'beacon', description: 'Strict Beacon Ground Rules G1-G14', mode: 'beacon' },
          { label: 'general', description: 'Plain coding assistant', mode: 'general' },
        ].map((item) => ({ ...item, picked: item.mode === current })),
        { title: 'Beacon Agent mode', placeHolder: `current: ${current}` },
      );
      if (!picked) {
        return;
      }
      const mode = String(picked.mode);
      await vscode.workspace
        .getConfiguration('beaconAgent')
        .update('mode', mode, vscode.ConfigurationTarget.Global);
      session.setMode(mode);
      provider.pushMode(mode);
    }),

    vscode.commands.registerCommand('beaconAgent.toggleAutoApprove', async () => {
      const current = vscode.workspace.getConfiguration('beaconAgent').get<boolean>('autoApprove', false);
      provider.setAutoApprove(!current);
      void vscode.window.showInformationMessage(
        !current
          ? 'Beacon Agent: auto-approve ON — file writes/edits apply without asking (shell commands still ask).'
          : 'Beacon Agent: auto-approve OFF — every write/edit waits for your click.',
      );
    }),

    vscode.commands.registerCommand('beaconAgent.runDemo', () => provider.runDemo()),

    vscode.commands.registerCommand('beaconAgent.showLog', () => session.showOutput()),
  );

  // ------------------------------------------------------------ settings
  const reloadKeys = [
    'beaconAgent.pythonPath',
    'beaconAgent.agentPath',
    'beaconAgent.model',
    'beaconAgent.timeout',
    'beaconAgent.maxSteps',
    'beaconAgent.ollamaUrl',
    'beaconAgent.autoApprove',
  ];
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (reloadKeys.some((key) => e.affectsConfiguration(key))) {
        provider.applySettingsChange();
      }
      if (e.affectsConfiguration('beaconAgent.mode')) {
        const mode = modeOf();
        session.setMode(mode);
        provider.pushMode(mode);
      }
    }),
  );

  void vscode.commands.executeCommand('setContext', 'beaconAgent.enabled', Boolean(workspace));
}

export function deactivate(): void {
  // Subscriptions (including the AgentSession child process) are disposed by VS Code.
}
