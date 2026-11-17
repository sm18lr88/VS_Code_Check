import * as vscode from "vscode";
import { openFilesWithProgress } from "./documentLoader";
import { findLintableFilesInFolders } from "./workspaceDiscovery";

export async function checkWorkspace(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("No workspace folder open");
    return;
  }

  await diagnoseFolders(
    workspaceFolders.map((folder) => folder.uri),
    "Diagnosing workspace...",
    "lintable files",
  );
}

/** Explorer passes the clicked folder and the selection; the Command Palette passes nothing. */
export async function checkFolder(
  folderUri?: vscode.Uri,
  selectedUris?: vscode.Uri[],
): Promise<void> {
  let candidates: readonly vscode.Uri[];
  if (selectedUris && selectedUris.length > 0) {
    candidates = selectedUris;
  } else if (folderUri) {
    candidates = [folderUri];
  } else {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: true,
      defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
      openLabel: "Check Folder",
    });
    if (!picked) {
      return;
    }
    candidates = picked;
  }

  const folderUris = await keepDirectories(candidates);
  if (folderUris.length === 0) {
    vscode.window.showWarningMessage("No valid folders selected");
    return;
  }

  await diagnoseFolders(
    folderUris,
    `Diagnosing ${folderUris.length} folder(s)...`,
    "lintable files from selected folder(s)",
  );
}

async function keepDirectories(uris: readonly vscode.Uri[]): Promise<vscode.Uri[]> {
  const directories: vscode.Uri[] = [];
  for (const uri of uris) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type & vscode.FileType.Directory) {
        directories.push(uri);
      }
    } catch {
      // Skip invalid URIs
    }
  }
  return directories;
}

async function diagnoseFolders(
  folderUris: readonly vscode.Uri[],
  title: string,
  loadedLabel: string,
): Promise<void> {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title, cancellable: true },
    async (progress, token) => {
      const filesToOpen = await findLintableFilesInFolders(folderUris, progress, token);
      if (token.isCancellationRequested) {
        return;
      }
      if (filesToOpen.length === 0) {
        vscode.window.showInformationMessage("No lintable files found");
        return;
      }

      progress.report({
        message: `Loading ${filesToOpen.length} files for diagnostics...`,
      });
      const opened = await openFilesWithProgress(filesToOpen, progress, token);
      if (!token.isCancellationRequested) {
        vscode.window.showInformationMessage(`Loaded ${opened} ${loadedLabel} for diagnostics`);
      }
    },
  );
}
