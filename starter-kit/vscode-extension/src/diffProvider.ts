import * as vscode from 'vscode';

/**
 * Serves the two sides of a proposed change to `vscode.diff` without ever
 * writing the file. The right-hand side is always in-memory, so nothing
 * touches disk until the user clicks Approve.
 */
export class DiffContentProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'beacon-diff';

  private readonly store = new Map<string, string>();
  private seq = 0;

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.store.get(uri.toString()) ?? '';
  }

  register(): vscode.Disposable {
    return vscode.workspace.registerTextDocumentContentProvider(DiffContentProvider.scheme, this);
  }

  /** Open VS Code's native diff view: current file on the left, proposal on the right. */
  async show(relPath: string, oldText: string, newText: string, open = true): Promise<void> {
    const base = relPath.replace(/\\/g, '/').replace(/^\/+/, '') || 'file';
    const token = String(++this.seq);
    const oldUri = vscode.Uri.from({
      scheme: DiffContentProvider.scheme, path: `/${base}`, query: `${token}-old`,
    });
    const newUri = vscode.Uri.from({
      scheme: DiffContentProvider.scheme, path: `/${base}`, query: `${token}-new`,
    });
    this.store.set(oldUri.toString(), oldText);
    this.store.set(newUri.toString(), newText);
    if (open) {
      await vscode.commands.executeCommand(
        'vscode.diff', oldUri, newUri, `Proposed change: ${base}`, { preview: true },
      );
    }
  }

  /** Free the saved content for a preview once its action is resolved. */
  clear(): void {
    this.store.clear();
  }
}
