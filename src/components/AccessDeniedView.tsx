import React, { useState } from 'react';
import { CheckCircle2, Lock, LogOut, Send } from 'lucide-react';
import { AccessRequestRecord } from '../types/automation';

interface AccessDeniedViewProps {
  userEmail: string;
  displayName: string;
  isRevoked: boolean;
  existingRequest: AccessRequestRecord | null;
  onSubmitRequest: (companyName: string) => Promise<void>;
  onSignOut: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  userEmail,
  displayName,
  isRevoked,
  existingRequest,
  onSubmitRequest,
  onSignOut,
}) => {
  const [companyName, setCompanyName] = useState(
    existingRequest?.companyName || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitRequest(companyName);
    } catch {
      setError('Could not submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-8 px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ResumeCollector
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
            <Lock className="h-5 w-5" />
          </div>

          <h1 className="mt-5 font-display text-xl font-bold text-slate-900">
            {isRevoked
              ? 'Workspace access suspended'
              : 'Administrator permission required'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {isRevoked
              ? `Access for ${userEmail} has been suspended by the administrator. Mail checks and Google Drive syncing are disabled until access is restored.`
              : `You are signed in as ${displayName || userEmail} (${userEmail}), but this Gmail ID is not on the authorized customer list yet.`}
          </p>

          {!isRevoked && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              {existingRequest && existingRequest.status === 'pending' ? (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  <div>
                    <p className="font-medium">Access request sent</p>
                    <p className="mt-0.5 text-xs text-green-800">
                      Your request for {userEmail} is awaiting administrator approval. This screen unlocks automatically as soon as permission is granted.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="request-company-input"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Company / Organization Name (Optional)
                    </label>
                    <input
                      id="request-company-input"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Acme Hiring Team"
                      maxLength={100}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {isSubmitting ? 'Sending Request...' : 'Request Access'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{userEmail}</span>
          </div>
        </div>
      </main>
    </div>
  );
};
