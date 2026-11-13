import React from 'react';
import { Share2, X } from 'lucide-react';

interface ConfirmShareModalProps {
  isOpen: boolean;
  email: string;
  role: 'writer' | 'reader';
  folderName: string;
  isSharing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmShareModal: React.FC<ConfirmShareModalProps> = ({
  isOpen,
  email,
  role,
  folderName,
  isSharing,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-share-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="confirm-share-title"
                className="font-display text-base font-semibold text-slate-900"
              >
                Share Google Drive folder
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Folder: {folderName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSharing}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Grant{' '}
          <span className="font-medium text-slate-900">
            {role === 'writer' ? 'Editor' : 'Viewer'}
          </span>{' '}
          access on{' '}
          <span className="font-medium text-slate-900">{folderName}</span> to{' '}
          <span className="font-medium text-slate-900">{email}</span>? Google
          Drive will send an invitation email to this address.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSharing}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSharing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isSharing ? 'Sharing...' : 'Confirm Share'}
          </button>
        </div>
      </div>
    </div>
  );
};
