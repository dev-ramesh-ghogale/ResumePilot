import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {
  CompanyProfile,
  DriveFolderMember,
} from '../types/automation';
import {
  normalizeKeywordString,
  parseSearchKeywords,
} from '../lib/formatters';

interface CompanySetupPanelProps {
  primaryEmail: string;
  verifiedGmailEmail?: string | null;
  verifiedDriveEmail?: string | null;
  profile: CompanyProfile;
  keywords: string;
  folderName: string;
  folderMembers: DriveFolderMember[];
  isLoadingMembers: boolean;
  onSaveProfile: (next: CompanyProfile) => void;
  onSaveKeywords: (nextKeywords: string) => void;
  onRequestShareFolder: (email: string, role: 'writer' | 'reader') => void;
}

export const CompanySetupPanel: React.FC<CompanySetupPanelProps> = ({
  primaryEmail,
  verifiedGmailEmail,
  verifiedDriveEmail,
  profile,
  keywords,
  folderName,
  folderMembers,
  isLoadingMembers,
  onSaveProfile,
  onSaveKeywords,
  onRequestShareFolder,
}) => {
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [savedNotice, setSavedNotice] = useState(false);

  const [keywordsInput, setKeywordsInput] = useState(
    normalizeKeywordString(keywords)
  );
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [keywordNotice, setKeywordNotice] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'writer' | 'reader'>('writer');
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    setCompanyName(profile.companyName);
  }, [profile]);

  useEffect(() => {
    setKeywordsInput(normalizeKeywordString(keywords));
    setEditingIndex(null);
  }, [keywords]);

  const parsedKeywords = useMemo(
    () => parseSearchKeywords(keywords),
    [keywords]
  );

  const flashKeywordNotice = (msg: string) => {
    setKeywordNotice(msg);
    setTimeout(() => setKeywordNotice(null), 2500);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      companyName: companyName.trim(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSaveKeywordsInput = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeKeywordString(keywordsInput);
    setKeywordsInput(cleaned);
    setKeywordError(null);
    onSaveKeywords(cleaned);
    flashKeywordNotice('Search keywords saved');
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const additions = newKeywordInput
      .split(',')
      .map((part) => part.replace(/"/g, '').trim())
      .filter(Boolean);

    if (additions.length === 0) {
      setKeywordError('Enter one or more keywords (comma-separated).');
      return;
    }

    const merged = normalizeKeywordString(
      [...parsedKeywords, ...additions].join(', ')
    );
    setKeywordError(null);
    setNewKeywordInput('');
    setKeywordsInput(merged);
    onSaveKeywords(merged);
    flashKeywordNotice(
      additions.length === 1
        ? `Added "${additions[0]}"`
        : `Added ${additions.length} keywords`
    );
  };

  const handleSaveInlineEdit = (index: number) => {
    const cleaned = editingValue.replace(/"/g, '').trim();
    if (!cleaned) {
      setKeywordError('Keyword cannot be empty.');
      return;
    }
    const nextList = [...parsedKeywords];
    nextList[index] = cleaned;
    const merged = normalizeKeywordString(nextList.join(', '));
    setKeywordError(null);
    setEditingIndex(null);
    setEditingValue('');
    setKeywordsInput(merged);
    onSaveKeywords(merged);
    flashKeywordNotice('Keyword updated');
  };

  const handleRemoveKeyword = (index: number) => {
    if (parsedKeywords.length <= 1) {
      setKeywordError('At least one search keyword is required.');
      return;
    }
    const nextList = parsedKeywords.filter((_, idx) => idx !== index);
    const merged = normalizeKeywordString(nextList.join(', '));
    setKeywordError(null);
    setEditingIndex(null);
    setKeywordsInput(merged);
    onSaveKeywords(merged);
    flashKeywordNotice('Keyword removed');
  };

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = shareEmail.trim();
    if (!cleaned || !cleaned.includes('@')) {
      setShareError('Please enter a valid Google email address.');
      return;
    }
    setShareError(null);
    onRequestShareFolder(cleaned, shareRole);
    setShareEmail('');
  };

  const gmailDisplay = verifiedGmailEmail || primaryEmail;
  const driveDisplay = verifiedDriveEmail || primaryEmail;

  return (
    <div className="space-y-6">
      {/* 01. Company Workspace & Verified Own-Drive Binding */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-slate-600" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Company Workspace & Account Isolation
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Resumes are scanned exclusively from your signed-in Gmail mailbox and stored exclusively in your own Google Drive {folderName} folder.
          </p>
        </div>

        <form onSubmit={handleSaveCompany} className="divide-y divide-slate-100">
          <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <label
                htmlFor="company-name-input"
                className="block text-sm font-medium text-slate-900"
              >
                Company Name
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Displayed in the workspace header for your hiring team.
              </p>
            </div>
            <div className="md:col-span-7">
              <input
                id="company-name-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Acme Hiring Team"
                className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <span className="block text-sm font-medium text-slate-900">
                Verified Mailbox & Drive Binding
              </span>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Each authorized user accesses only their own Gmail inbox and their own Google Drive storage.
              </p>
            </div>
            <div className="space-y-2.5 md:col-span-7">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Private per-user storage verified</span>
                </div>
                <p>
                  <span className="text-slate-500">Source Gmail Inbox:</span>{' '}
                  <span className="font-medium text-slate-900">{gmailDisplay}</span>
                </p>
                <p>
                  <span className="text-slate-500">Destination Google Drive:</span>{' '}
                  <span className="font-medium text-slate-900">{driveDisplay}</span>{' '}
                  <span className="font-mono text-slate-700">({folderName})</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4">
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                <Check className="h-3.5 w-3.5" />
                <span>Company settings saved</span>
              </span>
            )}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Save Company Settings
            </button>
          </div>
        </form>
      </div>

      {/* 02. Subject Search Keywords */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4 text-slate-600" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Subject Search Keywords
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Add or edit the email subject keywords searched during checks. Separate multiple keywords with a comma (e.g., resume, cv, job application).
            </p>
          </div>
          {keywordNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
              <Check className="h-3.5 w-3.5" />
              <span>{keywordNotice}</span>
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {/* Bulk Comma-Separated Editor */}
          <form
            onSubmit={handleSaveKeywordsInput}
            className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start"
          >
            <div className="md:col-span-5">
              <label
                htmlFor="company-keywords-input"
                className="block text-sm font-medium text-slate-900"
              >
                All Search Keywords (Comma-Separated)
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Any email subject matching at least one keyword will have its attachments saved.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  id="company-keywords-input"
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="resume, cv, application"
                  className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                >
                  Save Keywords
                </button>
              </div>
            </div>
          </form>

          {/* Add Individual or Multiple Keywords */}
          <form
            onSubmit={handleAddKeyword}
            className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start"
          >
            <div className="md:col-span-5">
              <label
                htmlFor="add-keyword-input"
                className="block text-sm font-medium text-slate-900"
              >
                Add Keyword
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Quickly append a new keyword or comma-separated list to your active filters.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  id="add-keyword-input"
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="e.g., biodata, portfolio"
                  className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Keyword</span>
                </button>
              </div>
              {keywordError && (
                <p className="mt-2 text-xs text-red-600">{keywordError}</p>
              )}
            </div>
          </form>

          {/* Structured Active Keywords List */}
          <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <span className="block text-sm font-medium text-slate-900">
                Active Keywords ({parsedKeywords.length})
              </span>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Edit or remove individual subject keywords below.
              </p>
            </div>
            <div className="md:col-span-7">
              <ul className="max-w-md divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {parsedKeywords.map((kw, idx) => {
                  const isEditing = editingIndex === idx;
                  return (
                    <li
                      key={`${kw}-${idx}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInlineEdit(idx);
                              } else if (e.key === 'Escape') {
                                setEditingIndex(null);
                              }
                            }}
                            aria-label={`Edit keyword ${kw}`}
                            autoFocus
                            className="w-full rounded-md border border-blue-600 bg-white px-2.5 py-1 text-sm text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineEdit(idx)}
                            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                            aria-label="Cancel edit"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate font-mono text-sm text-slate-900">
                            {kw}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(idx);
                                setEditingValue(kw);
                                setKeywordError(null);
                              }}
                              title={`Edit "${kw}"`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(idx)}
                              disabled={parsedKeywords.length <= 1}
                              title={
                                parsedKeywords.length <= 1
                                  ? 'At least one keyword is required'
                                  : `Remove "${kw}"`
                              }
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                              aria-label={`Remove keyword ${kw}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 02. Share root/resume Folder With Team Email */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Share2 className="h-4 w-4 text-slate-600" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Share {folderName} With Team Members
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Optionally grant another company email ID direct access to the {folderName} folder in Google Drive.
          </p>
        </div>

        <div className="px-6 py-5">
          <form
            onSubmit={handleShareSubmit}
            className="flex flex-wrap items-center gap-3"
          >
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="teammate@company.com"
              aria-label="Team member email to share folder with"
              className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <select
              value={shareRole}
              onChange={(e) =>
                setShareRole(e.target.value as 'writer' | 'reader')
              }
              aria-label="Folder permission role"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="writer">Editor</option>
              <option value="reader">Viewer</option>
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Share Folder
            </button>
          </form>
          {shareError && (
            <p className="mt-2 text-xs text-red-600">{shareError}</p>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-medium text-slate-500">
              Current Access ({folderName})
            </h3>
            {isLoadingMembers ? (
              <p className="mt-2 text-xs text-slate-400">Loading members...</p>
            ) : folderMembers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Only the Drive account owner currently has access.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {folderMembers.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">
                        {member.emailAddress || member.displayName || member.type}
                      </span>
                      {member.displayName && member.emailAddress && (
                        <span className="ml-2 text-slate-500">
                          · {member.displayName}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-500 capitalize">
                      {member.role === 'writer' ? 'editor' : member.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
