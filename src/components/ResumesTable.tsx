import React, { useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { SavedResumeFile } from '../types/automation';
import {
  formatFileSize,
  formatShortDate,
  getFileKindLabel,
  parseSenderDisplay,
} from '../lib/formatters';

interface ResumesTableProps {
  files: SavedResumeFile[];
  isLoading: boolean;
  isSyncing: boolean;
  folderName: string;
  onRunSync: () => void;
  onDownloadLocal: (file: SavedResumeFile) => void;
  onRequestDelete: (file: SavedResumeFile) => void;
  downloadingId: string | null;
}

type TypeFilter = 'all' | 'pdf' | 'word';

export const ResumesTable: React.FC<ResumesTableProps> = ({
  files,
  isLoading,
  isSyncing,
  folderName,
  onRunSync,
  onDownloadLocal,
  onRequestDelete,
  downloadingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const kind = getFileKindLabel(file.name, file.mimeType);
      if (typeFilter === 'pdf' && kind !== 'PDF') return false;
      if (typeFilter === 'word' && kind !== 'Word') return false;

      if (!q) return true;
      return (
        file.name.toLowerCase().includes(q) ||
        (file.subject && file.subject.toLowerCase().includes(q)) ||
        (file.sender && file.sender.toLowerCase().includes(q))
      );
    });
  }, [files, searchQuery, typeFilter]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Table Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Saved Resume Attachments
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Destination folder: {folderName} ·{' '}
            <span className="tabular-nums">{files.length}</span>{' '}
            {files.length === 1 ? 'file' : 'files'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename, subject, sender..."
              aria-label="Search saved resumes"
              className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none sm:w-64"
            />
          </div>

          {/* Segmented File Filter Control */}
          <div
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            role="group"
            aria-label="Filter by file type"
          >
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('pdf')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === 'pdf'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('word')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === 'word'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Word
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="divide-y divide-slate-100 px-5 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="flex h-11 items-center justify-between gap-4"
            >
              <div className="h-3.5 w-48 animate-pulse rounded bg-slate-100" />
              <div className="hidden h-3.5 w-56 animate-pulse rounded bg-slate-100 md:block" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        /* Empty State */
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
            {files.length === 0
              ? 'No resume attachments saved yet'
              : 'No files match your current filter'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
            {files.length === 0
              ? `When an incoming email has "resume" in the subject line and an attachment, it will be saved automatically to "${folderName}" during the next 5-minute check.`
              : 'Try clearing your search query or switching back to All file types.'}
          </p>
          {files.length === 0 && (
            <button
              type="button"
              onClick={onRunSync}
              disabled={isSyncing}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>{isSyncing ? 'Checking Inbox...' : 'Check Inbox Now'}</span>
            </button>
          )}
        </div>
      ) : (
        /* High-Density Data Grid */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 pl-5 pr-3">Attachment</th>
                <th className="px-3 py-2.5">Email Subject</th>
                <th className="px-3 py-2.5">Sender</th>
                <th className="px-3 py-2.5">Saved At</th>
                <th className="px-3 py-2.5 text-right">Size</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredFiles.map((file) => {
                const senderInfo = parseSenderDisplay(file.sender);
                const kind = getFileKindLabel(file.name, file.mimeType);
                return (
                  <tr
                    key={file.id}
                    className="h-11 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-2.5 pl-5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <div className="max-w-[220px] truncate font-medium text-slate-900">
                            {file.name}
                          </div>
                          <div className="text-xs text-slate-500">{kind}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[240px] truncate text-xs text-slate-700">
                        {file.subject || 'Uploaded to Drive folder'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[180px] truncate text-xs text-slate-700">
                        {senderInfo.name}
                      </div>
                      {senderInfo.email && (
                        <div className="max-w-[180px] truncate text-[11px] text-slate-500">
                          {senderInfo.email}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatShortDate(file.createdTime)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Drive"
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onDownloadLocal(file)}
                          disabled={downloadingId === file.id}
                          title="Download copy to computer"
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(file)}
                          title="Delete from Google Drive"
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
