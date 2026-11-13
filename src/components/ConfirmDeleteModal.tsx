import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { SavedResumeFile } from '../types/automation';

interface ConfirmDeleteModalProps {
  file: SavedResumeFile | null;
  folderName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  file,
  folderName,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="confirm-delete-title"
                className="font-display text-base font-semibold text-slate-900"
              >
                Delete file from Google Drive
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Folder: {folderName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Are you sure you want to permanently delete{' '}
          <span className="font-medium text-slate-900">{file.name}</span> from
          your Google Drive folder? This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-red-600 whitespace-nowrap shrink-0"
          >
            {isDeleting ? 'Deleting...' : 'Delete File'}
          </button>
        </div>
      </div>
    </div>
  );
};
