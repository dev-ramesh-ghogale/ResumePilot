import React, { useMemo, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { AccessRequestRecord, AllowedUserRecord } from '../types/automation';
import { formatShortDate } from '../lib/formatters';

interface AdminPanelProps {
  adminEmail: string;
  allowedUsers: AllowedUserRecord[];
  accessRequests: AccessRequestRecord[];
  onGrantUser: (params: {
    email: string;
    companyName: string;
    notes: string;
  }) => Promise<void>;
  onToggleUserStatus: (user: AllowedUserRecord) => Promise<void>;
  onRemoveUser: (user: AllowedUserRecord) => Promise<void>;
  onApproveRequest: (req: AccessRequestRecord) => Promise<void>;
  onDismissRequest: (requestId: string) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  adminEmail,
  allowedUsers,
  accessRequests,
  onGrantUser,
  onToggleUserStatus,
  onRemoveUser,
  onApproveRequest,
  onDismissRequest,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addedBanner, setAddedBanner] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>(
    'all'
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmRemoveTarget, setConfirmRemoveTarget] =
    useState<AllowedUserRecord | null>(null);

  const handleCopyEmail = async (id: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const pendingRequests = useMemo(
    () => accessRequests.filter((r) => r.status === 'pending'),
    [accessRequests]
  );

  const activeCount = useMemo(
    () => allowedUsers.filter((u) => u.status === 'active').length,
    [allowedUsers]
  );

  const revokedCount = useMemo(
    () => allowedUsers.filter((u) => u.status === 'revoked').length,
    [allowedUsers]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allowedUsers.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.companyName && u.companyName.toLowerCase().includes(q)) ||
        (u.notes && u.notes.toLowerCase().includes(q))
      );
    });
  }, [allowedUsers, searchQuery, statusFilter]);

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@') || cleaned.length > 120) {
      setFormError('Enter a valid Gmail or Google Workspace email ID.');
      return;
    }
    setFormError(null);
    setIsAdding(true);
    try {
      await onGrantUser({
        email: cleaned,
        companyName: newCompany.trim(),
        notes: newNotes.trim(),
      });
      setNewEmail('');
      setNewCompany('');
      setNewNotes('');
      setAddedBanner(`Granted workspace access to ${cleaned}.`);
      setTimeout(() => setAddedBanner(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to authorize Gmail ID.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Summary Strip */}
      <section className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Administrator</p>
          <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">
            {adminEmail}
          </p>
          <p className="mt-1 text-xs text-slate-500">Owner access control</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Active Gmail IDs</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-green-700">Permitted to sync Drive</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Suspended IDs</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {revokedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Blocked from tool</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Pending Requests</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {pendingRequests.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Awaiting your approval</p>
        </div>
      </section>

      {/* Authorize New Gmail ID */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-blue-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Allow Specific Gmail ID
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Authorized users sign in with their own Gmail ID and save resumes to their own Google Drive.
          </p>
        </div>

        <form onSubmit={handleGrantSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <label
                htmlFor="allow-email-input"
                className="block text-xs font-medium text-slate-700"
              >
                Customer Gmail ID
              </label>
              <input
                id="allow-email-input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="hr@clientcompany.com"
                maxLength={120}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="allow-company-input"
                className="block text-xs font-medium text-slate-700"
              >
                Company Name (Optional)
              </label>
              <input
                id="allow-company-input"
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Acme Corp"
                maxLength={100}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="allow-notes-input"
                className="block text-xs font-medium text-slate-700"
              >
                Plan / Notes (Optional)
              </label>
              <input
                id="allow-notes-input"
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Paid annual license"
                maxLength={240}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-xs text-red-600">{formError}</p>
          )}

          {addedBanner && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-green-700">
              <Check className="h-3.5 w-3.5" />
              <span>{addedBanner}</span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              While the project is in Google Testing mode, also list approved Gmail IDs under{' '}
              <a
                href="https://console.cloud.google.com/auth/audience?project=gen-lang-client-0873358819"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
              >
                <span>Google Cloud Test Users</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              .
            </p>
            <button
              type="submit"
              disabled={isAdding}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAdding ? 'Granting...' : 'Grant Access'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pending Access Requests */}
      {pendingRequests.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Pending Access Requests ({pendingRequests.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Users who signed in and requested access to ResumeCollector.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {req.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {req.displayName}
                    {req.companyName ? ` · ${req.companyName}` : ''}
                    {req.createdAt
                      ? ` · Requested ${formatShortDate(req.createdAt)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={async () => {
                      setBusyId(req.id);
                      try {
                        await onDismissRequest(req.id);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={async () => {
                      setBusyId(req.id);
                      try {
                        await onApproveRequest(req);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorized Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Authorized Customer Accounts
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage which Gmail IDs are permitted to use the application.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email or company..."
                aria-label="Search authorized accounts"
                className="w-52 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['all', 'active', 'revoked'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            {allowedUsers.length === 0
              ? 'No customer Gmail IDs added yet. Use the form above to grant access.'
              : 'No authorized Gmail IDs match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pl-6 pr-3">Gmail ID</th>
                  <th className="px-3 py-2.5">Company</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Updated</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="h-11 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="py-2.5 pl-6 pr-3">
                      <div className="font-medium text-slate-900">{u.email}</div>
                      {u.notes && (
                        <div className="text-xs text-slate-500">{u.notes}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">
                      {u.companyName || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                          <Ban className="h-3.5 w-3.5" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatShortDate(u.updatedAt || u.createdAt)}
                    </td>
                    <td className="py-2.5 pl-3 pr-6 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(u.id, u.email)}
                          title="Copy Gmail ID"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
                        >
                          {copiedId === u.id ? (
                            <>
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-green-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={async () => {
                            setBusyId(u.id);
                            try {
                              await onToggleUserStatus(u);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          {u.status === 'active' ? 'Suspend' : 'Restore'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => setConfirmRemoveTarget(u)}
                          title="Remove Gmail ID from allowlist"
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal to Remove Authorized User */}
      {confirmRemoveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Remove Gmail ID from allowlist
              </h3>
              <button
                type="button"
                onClick={() => setConfirmRemoveTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Remove{' '}
              <span className="font-medium text-slate-900">
                {confirmRemoveTarget.email}
              </span>{' '}
              from the authorized list? They will immediately lose access to the tool.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRemoveTarget(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmRemoveTarget.id}
                onClick={async () => {
                  const target = confirmRemoveTarget;
                  setBusyId(target.id);
                  try {
                    await onRemoveUser(target);
                    setConfirmRemoveTarget(null);
                  } finally {
                    setBusyId(null);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Remove Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
