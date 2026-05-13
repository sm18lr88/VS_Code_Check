import * as vscode from "vscode";
import { checkFolder, checkWorkspace } from "./commands";

export function activate(context: vscode.ExtensionContext): void {
  const workspaceCommandDisposable = vscode.commands.registerCommand(
    "vsCodeCheck.checkWorkspace",
    checkWorkspace,
  );
  context.subscriptions.push(workspaceCommandDisposable);

  const folderCommandDisposable = vscode.commands.registerCommand(
    "vsCodeCheck.checkFolder",
    checkFolder,
  );
  context.subscriptions.push(folderCommandDisposable);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.text = "$(pulse) Code Check";
  statusBarItem.tooltip = "Re-diagnose all lintable workspace files";
  statusBarItem.command = "vsCodeCheck.checkWorkspace";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

// Required by VS Code extension API but no cleanup needed
export function deactivate(): void {
  // No resources to dispose
}
