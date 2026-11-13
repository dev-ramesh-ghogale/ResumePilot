import React from 'react';
import { ArrowRight, Clock, FolderCheck, MailSearch, ShieldCheck } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SignedOutViewProps {
  onSignIn: () => void;
  onSwitchAccount?: () => void;
  isSigningIn: boolean;
  authError: string | null;
  existingEmail?: string | null;
}

export const SignedOutView: React.FC<SignedOutViewProps> = ({
  onSignIn,
  onSwitchAccount,
  isSigningIn,
  authError,
  existingEmail,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            ResumeCollector
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#workflow"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#capabilities"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#permissions"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Permissions
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isSigningIn ? 'Connecting...' : 'Connect Account'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        {/* Hero Split */}
        <section className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-medium tracking-wide text-blue-700">
              Automated Gmail to Google Drive Pipeline
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl [text-wrap:balance]">
              Capture incoming resume attachments every 5 minutes.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              {existingEmail
                ? `Reconnect ${existingEmail} to resume checking incoming mail for "resume" in the subject line and saving attachments directly into ${existingEmail}'s Google Drive root/resume folder.`
                : 'Connect your Google account to automatically scan incoming mail every 5 minutes, filter messages containing "resume" in the subject line, and save their attachments straight to your Google Drive root/resume folder.'}
            </p>

            {authError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {authError}
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <GoogleSignInButton
                onClick={onSignIn}
                disabled={isSigningIn}
                label={
                  isSigningIn
                    ? 'Connecting to Google...'
                    : existingEmail
                    ? `Reconnect ${existingEmail}`
                    : 'Sign in with Google'
                }
              />
              {existingEmail && onSwitchAccount && (
                <button
                  type="button"
                  onClick={onSwitchAccount}
                  disabled={isSigningIn}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
                >
                  Use a different Google account
                </button>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>5-minute background polling</span>
              <span aria-hidden="true">·</span>
              <span>Read-only Gmail access</span>
              <span aria-hidden="true">·</span>
              <span>Saves to Drive root/resume</span>
            </div>
          </div>

          {/* Right Column: Clean Operational Pipeline Preview */}
          <div
            id="workflow"
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    Automation Pipeline
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Subject filter: &quot;resume&quot; · Interval: 5 minutes
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  05:00 cycle
                </span>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                <div className="flex items-start gap-4 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        01. Scheduled Mail Check
                      </p>
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        Every 5 min
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Polls your Gmail inbox on a steady 5-minute timer, with a manual Check Now trigger available anytime.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    <MailSearch className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        02. Subject Line & Attachment Match
                      </p>
                      <span className="font-mono text-xs text-slate-500">
                        subject:resume
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Inspects incoming messages for the keyword &quot;resume&quot; in the subject line and extracts PDF, Word, and document attachments.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                    <FolderCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        03. Save to Cloud Folder
                      </p>
                      <span className="font-mono text-xs text-blue-700">
                        Google Drive
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Uploads attachments straight into your selected Drive folder and skips duplicates already saved from earlier runs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Ready to configure after sign-in</span>
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
              >
                <span>Open workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Below-fold Feature Strip */}
        <section
          id="capabilities"
          className="mt-12 grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white md:grid-cols-3 md:divide-x md:divide-y-0"
        >
          <div className="p-6">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Duplicate Protection
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Each saved file records its source Gmail message ID so repeated 5-minute scans never create duplicate copies.
            </p>
          </div>
          <div className="p-6">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Customizable Keyword & Cadence
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Starts with &quot;resume&quot; every 5 minutes out of the box, with full control over subject keywords, file types, and folder targets.
            </p>
          </div>
          <div id="permissions" className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Scoped Permissions
              </h3>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Uses read-only Gmail access and Google Drive access to save files directly to your root/resume folder. Tokens stay strictly in browser memory during your active session.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
