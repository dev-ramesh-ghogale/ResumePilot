import React from 'react';
import { CheckCircle2, ExternalLink, Folder, FolderPlus } from 'lucide-react';
import { DriveFolder, SavedResumeFile } from '../types/automation';
import { ResumesTable } from './ResumesTable';

interface CloudFolderPanelProps {
  folders: DriveFolder[];
  selectedFolder: DriveFolder | null;
  files: SavedResumeFile[];
  isLoadingFiles: boolean;
  isSyncing: boolean;
  downloadingId: string | null;
  onSelectFolder: (folder: DriveFolder) => void;
  onOpenCreateFolder: () => void;
  onRunSync: () => void;
  onDownloadLocal: (file: SavedResumeFile) => void;
  onRequestDelete: (file: SavedResumeFile) => void;
}

export const CloudFolderPanel: React.FC<CloudFolderPanelProps> = ({
  folders,
  selectedFolder,
  files,
  isLoadingFiles,
  isSyncing,
  downloadingId,
  onSelectFolder,
  onOpenCreateFolder,
  onRunSync,
  onDownloadLocal,
  onRequestDelete,
}) => {
  return (
    <div className="space-y-6">
      {/* Destination Folder Selector */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Google Drive Root Folders
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Select a folder in your Google Drive root directory (default: root/resume) or create a new one.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {selectedFolder?.webViewLink && (
              <a
                href={selectedFolder.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in Drive</span>
              </a>
            )}
            <button
              type="button"
              onClick={onOpenCreateFolder}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {folders.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-slate-500">
              No cloud folders created yet. Click &quot;New Folder&quot; to create one.
            </div>
          ) : (
            folders.map((folder) => {
              const isSelected = selectedFolder?.id === folder.id;
              return (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between gap-4 px-6 py-3.5 transition-colors ${
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectFolder(folder)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Folder
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        root/{folder.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">
                        ID: {folder.id}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3 shrink-0">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Active Target</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectFolder(folder)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        Use Folder
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Folder Contents */}
      <ResumesTable
        files={files}
        isLoading={isLoadingFiles}
        isSyncing={isSyncing}
        folderName={`root/${selectedFolder?.name || 'resume'}`}
        onRunSync={onRunSync}
        onDownloadLocal={onDownloadLocal}
        onRequestDelete={onRequestDelete}
        downloadingId={downloadingId}
      />
    </div>
  );
};
