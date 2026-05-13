import * as vscode from "vscode";
import { openFilesWithProgress } from "./documentLoader";
import { buildExcludePattern } from "./filePolicies";
import {
  filterLintableFiles,
  findLintableFilesInFolders,
} from "./workspaceDiscovery";

export async function checkWorkspace(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("No workspace folder open");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Diagnosing workspace...",
      cancellable: true,
    },
    async (progress, token) => {
      const includePattern = "**/*";
      const excludePattern = buildExcludePattern();

      progress.report({ message: "Finding files..." });

      const files = await vscode.workspace.findFiles(
        includePattern,
        excludePattern,
      );

      if (token.isCancellationRequested) {
        return;
      }

      const filesToOpen = await filterLintableFiles(
        files,
        token,
        workspaceFolders.map((folder) => folder.uri),
      );

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
        vscode.window.showInformationMessage(
          `Loaded ${opened} lintable files for diagnostics`,
        );
      }
    },
  );
}

export async function checkFolder(
  folderUri?: vscode.Uri,
  selectedUris?: vscode.Uri[],
): Promise<void> {
  let foldersToProcess: vscode.Uri[];
  if (selectedUris && selectedUris.length > 0) {
    foldersToProcess = selectedUris;
  } else if (folderUri) {
    foldersToProcess = [folderUri];
  } else {
    foldersToProcess = [];
  }

  if (foldersToProcess.length === 0) {
    vscode.window.showWarningMessage("No folder selected");
    return;
  }

  const folderUris: vscode.Uri[] = [];
  for (const uri of foldersToProcess) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        folderUris.push(uri);
      }
    } catch {
      // Skip invalid URIs
    }
  }

  if (folderUris.length === 0) {
    vscode.window.showWarningMessage("No valid folders selected");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Diagnosing ${folderUris.length} folder(s)...`,
      cancellable: true,
    },
    async (progress, token) => {
      const filesToOpen = await findLintableFilesInFolders(
        folderUris,
        progress,
        token,
      );

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
        vscode.window.showInformationMessage(
          `Loaded ${opened} lintable files from selected folder(s) for diagnostics`,
        );
      }
    },
  );
}
