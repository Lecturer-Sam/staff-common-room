import * as vscode from 'vscode';
import { AgentEvent, AgentSession, str } from './agentSession';
import { DiffContentProvider } from './diffProvider';

/**
 * Side-panel chat: renders one AgentEvent per NDJSON line and answers with
 * approve/deny. All agent logic stays in Python — this only draws and routes.
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'beaconAgent.chat';

  private view?: vscode.WebviewView;
  private busy = false;
  private actionSeq = 0;
  /** Everything the panel has shown, so a re-created webview can replay it. */
  private transcript: AgentEvent[] = [];
  /** Proposed actions awaiting a decision, by id. */
  private readonly pending = new Map<string, AgentEvent>();
  private readonly onModeChangedEmitter = new vscode.EventEmitter<string>();

  readonly onModeChanged = this.onModeChangedEmitter.event;

  constructor(
    private readonly session: AgentSession,
    private readonly diffs: DiffContentProvider,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((msg: AgentEvent) => void this.onMessage(msg));
    view.onDidDispose(() => {
      this.view = undefined;
    });
  }

  private post(payload: AgentEvent): void {
    void this.view?.webview.postMessage(payload);
  }

  /** Public entry points (commands use these). */
  ask(prompt: string): void {
    const text = prompt.trim();
    if (!text) {
      return;
    }
    void vscode.commands.executeCommand('beaconAgent.chat.focus');
    this.onEvent({ type: 'user', text });
    if (!this.session.ask(text)) {
      this.onEvent({ type: 'done' });
    }
  }

  newChat(): void {
    this.transcript = [];
    this.pending.clear();
    this.diffs.clear();
    this.busy = false;
    this.session.resetHistory();
    this.post({ type: 'clear' });
    this.onEvent({ type: 'info', text: 'New chat — conversation memory cleared.' });
  }

  applySettingsChange(): void {
    // model / mode / timeout / auto-approve are read when the child starts
    if (this.session.isRunning) {
      this.session.restart();
      this.onEvent({ type: 'info', text: 'Settings changed — the agent will restart with your next message.' });
    }
  }

  pushMode(mode: string): void {
    this.onEvent({ type: 'mode', mode });
    this.onModeChangedEmitter.fire(mode);
  }

  /** Persist + apply the auto-approve toggle (needs a child restart: it is a CLI flag). */
  setAutoApprove(value: boolean): void {
    void vscode.workspace
      .getConfiguration('beaconAgent')
      .update('autoApprove', value, vscode.ConfigurationTarget.Global);
    this.post({ type: 'autoApprove', value });
    if (value) {
      this.onEvent({
        type: 'info',
        text: 'Auto-approve is ON: file writes/edits apply without asking. Shell commands still ask.',
      });
    } else {
      this.onEvent({ type: 'info', text: 'Auto-approve is OFF: every write/edit waits for your click.' });
    }
    if (this.session.isRunning) {
      this.session.restart();
    }
  }

  runDemo(): void {
    this.session.restart();
    void vscode.commands.executeCommand('beaconAgent.chat.focus');
    this.transcript = [];
    this.post({ type: 'clear' });
    this.onEvent({
      type: 'info',
      text:
        'Offline demo: the model is replaced by a scripted brain that proposes one new file ' +
        '(agent_demo.py). Use it to check the diff preview and Approve/Deny without Ollama.',
    });
    this.onEvent({ type: 'user', text: 'create a demo file' });
    const started = this.session.startWithDemo();
    if (!started) {
      this.onEvent({ type: 'done' });
      return;
    }
    this.session.ask('create a demo file', true);
  }

  // ----------------------------------------------------------------- events
  onEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'thinking':
        this.busy = true;
        this.post({ type: 'thinking' });
        return;
      case 'action': {
        const id = 'act' + (++this.actionSeq);
        const stored: AgentEvent = { ...event, id };
        if (stored.need_approval === true) {
          this.pending.set(id, stored); // remembered so Show diff / Approve can find it
        }
        this.transcript.push(stored);
        this.post(stored);
        this.autoOpenDiff(stored);
        return;
      }
      case 'done':
        this.busy = false;
        this.transcript.push({ type: 'done' });
        this.post({ type: 'done' });
        return;
      case 'ready':
        this.busy = false;
        this.transcript.push(event);
        this.post({ ...event, type: 'status' });
        this.onModeChangedEmitter.fire(str(event.mode, 'auto'));
        return;
      case 'reset':
        this.transcript.push(event);
        this.post(event);
        return;
      default:
        if (event.type === 'error') {
          this.busy = false;
        }
        this.transcript.push(event);
        this.post(event);
    }
  }

  private autoOpenDiff(action: AgentEvent): void {
    const enabled = vscode.workspace.getConfiguration('beaconAgent').get<boolean>('autoOpenDiff', true);
    const kind = str(action.action);
    if (!enabled || (kind !== 'write' && kind !== 'edit') || action.error) {
      return;
    }
    void this.openDiff(action);
  }

  private async openDiff(action: AgentEvent): Promise<void> {
    await this.diffs.show(
      str(action.path),
      str(action.old),
      str(action.new),
      true,
    );
  }

  private async onMessage(msg: AgentEvent): Promise<void> {
    switch (str(msg.type)) {
      case 'webviewReady':
        this.post({
          type: 'replay',
          events: this.transcript,
          busy: this.busy,
          autoApprove: vscode.workspace.getConfiguration('beaconAgent').get<boolean>('autoApprove', false),
          model: vscode.workspace.getConfiguration('beaconAgent').get<string>('model', ''),
        });
        return;
      case 'ask':
        this.ask(str(msg.text));
        return;
      case 'approve': {
        const action = this.pending.get(str(msg.id));
        this.pending.delete(str(msg.id));
        this.session.approve();
        this.resolveCard(str(msg.id), 'approved', action);
        return;
      }
      case 'deny': {
        const action = this.pending.get(str(msg.id));
        this.pending.delete(str(msg.id));
        this.session.deny();
        this.resolveCard(str(msg.id), 'denied', action);
        return;
      }
      case 'openDiff': {
        const action = this.pending.get(str(msg.id));
        if (action) {
          await this.openDiff(action);
        }
        return;
      }
      case 'stop':
        this.session.restart();
        this.busy = false;
        this.onEvent({ type: 'error', message: 'Stopped. The model call was cancelled; settings are unchanged.' });
        this.onEvent({ type: 'done' });
        return;
      case 'newChat':
        this.newChat();
        return;
      case 'mode': {
        const mode = str(msg.mode, 'auto');
        void vscode.workspace.getConfiguration('beaconAgent').update('mode', mode, vscode.ConfigurationTarget.Global);
        if (this.session.isRunning) {
          this.session.setMode(mode);
        }
        this.pushMode(mode);
        return;
      }
      case 'autoApprove':
        this.setAutoApprove(msg.value === true);
        return;
      case 'showOutput':
        this.session.showOutput();
        return;
      default:
        return;
    }
  }

  private resolveCard(id: string, state: string, action?: AgentEvent): void {
    if (!id) {
      return;
    }
    const resolved: AgentEvent = { type: 'resolved', id, state };
    this.transcript.push(resolved);
    this.post(resolved);
    if (action && state === 'approved' && action.action === 'write') {
      // Nice touch: show the file once it actually landed on disk.
      const rel = str(action.path);
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (rel && folder) {
        const target = vscode.Uri.joinPath(folder.uri, rel);
        void vscode.workspace.fs.stat(target).then(
          () => void vscode.window.showTextDocument(target, { preview: false }),
          () => undefined,
        );
      }
    }
  }

  dispose(): void {
    this.onModeChangedEmitter.dispose();
  }

  // ------------------------------------------------------------------- html
  private html(webview: vscode.Webview): string {
    const nonce = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62)),
    ).join('');
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      'img-src data:',
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh;
    font-family: var(--vscode-font-family); font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground); background: var(--vscode-sideBar-background, transparent);
  }
  #topbar {
    display: flex; align-items: center; gap: 6px; padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  .pill {
    font-size: 11px; padding: 1px 6px; border-radius: 8px; white-space: nowrap;
    background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
    max-width: 45%; overflow: hidden; text-overflow: ellipsis;
  }
  select, input[type=text] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; font-size: 12px; padding: 1px 4px;
  }
  #autoWrap { display: flex; align-items: center; gap: 3px; font-size: 11px; opacity: .85; margin-left: auto; }
  #log { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 7px; }
  .msg { white-space: pre-wrap; word-break: break-word; line-height: 1.45; }
  .user { background: var(--vscode-textBlockQuote-background); border-left: 2px solid var(--vscode-textLink-foreground); padding: 5px 8px; border-radius: 3px; }
  .agent { padding: 2px 2px; }
  .info { opacity: .75; font-size: 12px; font-style: italic; }
  .err { color: var(--vscode-errorForeground); white-space: pre-wrap; border-left: 2px solid var(--vscode-errorForeground); padding: 4px 8px; }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 7px 8px; display: flex; flex-direction: column; gap: 6px; }
  .cardHead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; }
  .badge { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 8px; padding: 0 6px; font-size: 11px; text-transform: uppercase; }
  .plus { color: var(--vscode-gitDecoration-addedResourceForeground, #3fb950); }
  .minus { color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149); }
  .row { display: flex; gap: 6px; flex-wrap: wrap; }
  button {
    font-family: inherit; font-size: 12px; padding: 3px 9px; cursor: pointer; border: none; border-radius: 3px;
    background: var(--vscode-button-secondaryBackground, #3a3d41); color: var(--vscode-button-secondaryForeground, #fff);
  }
  button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button:hover { opacity: .88; }
  button:disabled { opacity: .45; cursor: default; }
  code { font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; background: var(--vscode-textCodeBlock-background); padding: 0 3px; border-radius: 3px; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 7px; border-radius: 4px; overflow-x: auto; margin: 4px 0; }
  pre code { background: none; padding: 0; }
  details { font-size: 12px; }
  summary { cursor: pointer; opacity: .8; }
  #spinner { display: none; align-items: center; gap: 6px; opacity: .8; font-size: 12px; padding: 2px; }
  #spinner.on { display: flex; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vscode-progressBar-background, #0e70c0); animation: pulse 1s infinite ease-in-out; }
  @keyframes pulse { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
  #composer { border-top: 1px solid var(--vscode-panel-border); padding: 7px 8px; display: flex; flex-direction: column; gap: 6px; }
  #input {
    width: 100%; box-sizing: border-box; resize: vertical; min-height: 54px; max-height: 180px;
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 4px;
    padding: 5px 6px; font-family: inherit; font-size: inherit;
  }
  #buttons { display: flex; gap: 6px; }
  #send { flex: 1; }
</style>
</head>
<body>
  <div id="topbar">
    <span class="pill" id="model">…</span>
    <select id="mode" title="Skill mode: auto / beacon (strict) / general">
      <option value="auto">auto</option>
      <option value="beacon">beacon</option>
      <option value="general">general</option>
    </select>
    <label id="autoWrap" title="Apply file writes/edits without asking. Shell commands still always ask.">
      <input type="checkbox" id="auto" /> auto-apply
    </label>
  </div>
  <div id="log">
    <div class="info">Ask a question, or ask for a change — proposed edits show a diff before anything is written.</div>
    <div id="spinner"><span class="dot"></span><span id="spinnerText">thinking…</span></div>
  </div>
  <div id="composer">
    <textarea id="input" rows="3" placeholder="e.g. add a test for greet(), or /beacon how many indicators?"></textarea>
    <div id="buttons">
      <button id="send" class="primary">Send</button>
      <button id="stop" title="Kill the running request">Stop</button>
    </div>
  </div>
<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  var log = document.getElementById('log');
  var input = document.getElementById('input');
  var sendBtn = document.getElementById('send');
  var spinner = document.getElementById('spinner');
  var spinnerText = document.getElementById('spinnerText');
  var modelPill = document.getElementById('model');
  var modeSel = document.getElementById('mode');
  var autoBox = document.getElementById('auto');
  var busy = false;
  var cards = {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Tiny markdown: fenced code blocks + inline code. Everything else escaped.
  function md(text) {
    var parts = String(text == null ? '' : text).split('\\u0060\\u0060\\u0060');
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        var code = parts[i];
        var nl = code.indexOf('\\n');
        out += '<pre><code>' + esc(nl >= 0 ? code.slice(nl + 1) : code) + '</code></pre>';
      } else {
        out += esc(parts[i]).replace(/\\u0060([^\\u0060]+)\\u0060/g, '<code>$1</code>');
      }
    }
    return out;
  }

  function atBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  }

  function add(cls, html) {
    var stick = atBottom();
    var div = document.createElement('div');
    div.className = cls;
    div.innerHTML = html;
    log.appendChild(div);
    if (stick || cls === 'user') { log.scrollTop = log.scrollHeight; }
    return div;
  }

  function setBusy(value, text) {
    busy = value;
    spinner.classList.toggle('on', value);
    spinnerText.textContent = text || 'thinking…';
    sendBtn.disabled = value;
    if (value) { log.scrollTop = log.scrollHeight; }
  }

  function button(label, cls, fn) {
    var b = document.createElement('button');
    b.textContent = label;
    if (cls) { b.className = cls; }
    b.addEventListener('click', fn);
    return b;
  }

  function post(msg) { vscode.postMessage(msg); }

  function clearLog() {
    cards = {};
    log.innerHTML = '';
  }

  function actionCard(ev) {
    var stick = atBottom();
    var card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', ev.id || '');

    var head = document.createElement('div');
    head.className = 'cardHead';
    var html = '<span class="badge">' + esc(ev.action) + '</span>';
    if (ev.path) { html += '<code>' + esc(ev.path) + '</code>'; }
    if (typeof ev.added === 'number' || typeof ev.removed === 'number') {
      html += '<span class="plus">+' + (ev.added || 0) + '</span><span class="minus">-' + (ev.removed || 0) + '</span>';
    }
    head.innerHTML = html;
    card.appendChild(head);

    if (ev.error) {
      var e = document.createElement('div');
      e.className = 'err';
      e.textContent = ev.error;
      card.appendChild(e);
    }

    var row = document.createElement('div');
    row.className = 'row';
    if (ev.need_approval) {
      if (ev.action === 'write' || ev.action === 'edit') {
        row.appendChild(button('Show diff', '', function () { post({ type: 'openDiff', id: ev.id }); }));
      }
      row.appendChild(button('Approve', 'primary', function () { post({ type: 'approve', id: ev.id }); }));
      row.appendChild(button('Deny', '', function () { post({ type: 'deny', id: ev.id }); }));
    } else {
      var note = document.createElement('span');
      note.className = 'info';
      note.textContent = ev.action === 'read' ? 'reading…' : 'applied automatically';
      row.appendChild(note);
    }
    card.appendChild(row);
    log.appendChild(card);
    if (stick) { log.scrollTop = log.scrollHeight; }
    if (ev.id) { cards[ev.id] = card; }
  }

  function resolveCard(ev) {
    var card = cards[ev.id];
    if (!card) { return; }
    var row = card.querySelector('.row');
    if (!row) { return; }
    row.innerHTML = '';
    var note = document.createElement('span');
    note.className = 'info';
    note.textContent =
      ev.state === 'approved' ? '\\u2713 approved' : ev.state === 'denied' ? '\\u2717 denied' : ev.state;
    row.appendChild(note);
  }

  function resultBlock(ev) {
    var stick = atBottom();
    var d = document.createElement('details');
    var s = document.createElement('summary');
    s.textContent = (ev.ok === false ? '\\u26a0 blocked/rejected' : 'tool result') + ' \\u2014 ' + String(ev.text || '').split('\\n')[0].slice(0, 70);
    var pre = document.createElement('pre');
    pre.textContent = String(ev.text || '');
    d.appendChild(s);
    d.appendChild(pre);
    log.appendChild(d);
    if (stick) { log.scrollTop = log.scrollHeight; }
  }

  function render(ev) {
    if (!ev || !ev.type) { return; }
    switch (ev.type) {
      case 'user':
        add('msg user', esc(ev.text));
        setBusy(true, 'thinking…');
        break;
      case 'thinking':
        setBusy(true, 'thinking\\u2026 (a cold model on CPU can take a minute)');
        break;
      case 'message':
        add('msg agent', md(ev.text));
        break;
      case 'action':
        spinner.classList.remove('on');
        actionCard(ev);
        break;
      case 'resolved':
        resolveCard(ev);
        break;
      case 'result':
        spinner.classList.remove('on');
        resultBlock(ev);
        break;
      case 'info':
        add('msg info', esc(ev.text));
        break;
      case 'error':
        setBusy(false);
        add('msg err', esc(ev.message || ev.text));
        break;
      case 'status':
      case 'ready': // replayed from the transcript after the view was re-created
        if (ev.model) { modelPill.textContent = ev.model + (ev.mock ? ' (mock)' : ''); }
        if (ev.mode) { modeSel.value = ev.mode; }
        if (ev.auto_approve !== undefined || ev.autoApprove !== undefined) {
          autoBox.checked = ev.auto_approve === true || ev.autoApprove === true;
        }
        break;
      case 'mode':
        if (ev.mode) { modeSel.value = ev.mode; }
        break;
      case 'autoApprove':
        autoBox.checked = ev.value === true;
        break;
      case 'clear':
        clearLog();
        setBusy(false);
        break;
      case 'done':
        setBusy(false);
        break;
      case 'replay':
        clearLog();
        if (ev.model) { modelPill.textContent = ev.model; }
        if (ev.autoApprove !== undefined) { autoBox.checked = ev.autoApprove === true; }
        (ev.events || []).forEach(render);
        setBusy(ev.busy === true);
        break;
      default:
        break;
    }
  }

  window.addEventListener('message', function (e) { render(e.data); });

  function submit() {
    var text = input.value.trim();
    if (!text || busy) { return; }
    input.value = '';
    post({ type: 'ask', text: text });
  }

  sendBtn.addEventListener('click', submit);
  document.getElementById('stop').addEventListener('click', function () { post({ type: 'stop' }); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  modeSel.addEventListener('change', function () { post({ type: 'mode', mode: modeSel.value }); });
  autoBox.addEventListener('change', function () { post({ type: 'autoApprove', value: autoBox.checked }); });

  post({ type: 'webviewReady' });
})();
</script>
</body>
</html>`;
  }
}
