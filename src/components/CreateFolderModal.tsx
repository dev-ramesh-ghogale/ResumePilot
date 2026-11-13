import React, { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  isCreating: boolean;
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  isCreating,
  onCreate,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a folder name.');
      return;
    }
    setError(null);
    await onCreate(trimmed);
    setName('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-folder-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="create-folder-title"
                className="font-display text-base font-semibold text-slate-900"
              >
                New Google Drive Folder
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Create a new folder in your Google Drive root directory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="folder-name-input"
            className="block text-sm font-medium text-slate-700"
          >
            Folder Name
          </label>
          <input
            id="folder-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Engineering Resumes 2026"
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isCreating ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
