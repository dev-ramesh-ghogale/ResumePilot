import React, { useEffect, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { AttachmentFilterMode, AutomationRule } from '../types/automation';
import { normalizeKeywordString } from '../lib/formatters';

interface RuleSettingsPanelProps {
  rule: AutomationRule;
  onSaveRule: (next: AutomationRule) => void;
}

const DEFAULT_RULE: AutomationRule = {
  keyword: 'resume',
  intervalMinutes: 5,
  lookbackDays: 7,
  attachmentFilter: 'documents',
  autoDownloadLocal: false,
  isPollingActive: true,
};

export const RuleSettingsPanel: React.FC<RuleSettingsPanelProps> = ({
  rule,
  onSaveRule,
}) => {
  const [keyword, setKeyword] = useState(rule.keyword);
  const [intervalMinutes, setIntervalMinutes] = useState(rule.intervalMinutes);
  const [lookbackDays, setLookbackDays] = useState(rule.lookbackDays);
  const [attachmentFilter, setAttachmentFilter] =
    useState<AttachmentFilterMode>(rule.attachmentFilter);
  const [autoDownloadLocal, setAutoDownloadLocal] = useState(
    rule.autoDownloadLocal
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setKeyword(rule.keyword);
    setIntervalMinutes(rule.intervalMinutes);
    setLookbackDays(rule.lookbackDays);
    setAttachmentFilter(rule.attachmentFilter);
    setAutoDownloadLocal(rule.autoDownloadLocal);
  }, [rule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedKeyword = normalizeKeywordString(keyword);
    setKeyword(cleanedKeyword);
    onSaveRule({
      ...rule,
      keyword: cleanedKeyword,
      intervalMinutes,
      lookbackDays,
      attachmentFilter,
      autoDownloadLocal,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleReset = () => {
    setKeyword(DEFAULT_RULE.keyword);
    setIntervalMinutes(DEFAULT_RULE.intervalMinutes);
    setLookbackDays(DEFAULT_RULE.lookbackDays);
    setAttachmentFilter(DEFAULT_RULE.attachmentFilter);
    setAutoDownloadLocal(DEFAULT_RULE.autoDownloadLocal);
    onSaveRule({
      ...DEFAULT_RULE,
      isPollingActive: rule.isPollingActive,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Mail Rule & Polling Schedule
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Define which incoming emails are captured and how often your mailbox is checked.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
        {/* Subject Keywords */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <label
              htmlFor="subject-keyword"
              className="block text-sm font-medium text-slate-900"
            >
              Subject Line Keywords
            </label>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Case-insensitive keywords matched against incoming email subjects. Separate multiple keywords with a comma (e.g., resume, cv, application).
            </p>
          </div>
          <div className="md:col-span-7">
            <input
              id="subject-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="resume, cv, application"
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Polling Interval */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <span className="block text-sm font-medium text-slate-900">
              Check Interval
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              How frequently Gmail is scanned while your workspace is open.
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
              {[1, 5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setIntervalMinutes(mins)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors tabular-nums whitespace-nowrap shrink-0 ${
                    intervalMinutes === mins
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lookback Window */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <span className="block text-sm font-medium text-slate-900">
              Mail Search Window
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Scan emails received within this recent timeframe (duplicates are always skipped).
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { label: 'Last 24 hours', days: 1 },
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setLookbackDays(opt.days)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    lookbackDays === opt.days
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Attachment Filter */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <span className="block text-sm font-medium text-slate-900">
              Attachment Filter
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Choose whether to save document files only or every attachment on matching emails.
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAttachmentFilter('documents')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  attachmentFilter === 'documents'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Documents (.pdf, .doc, .docx, .txt)
              </button>
              <button
                type="button"
                onClick={() => setAttachmentFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  attachmentFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Attachments
              </button>
            </div>
          </div>
        </div>

        {/* Optional Local Copy */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <label
              htmlFor="local-copy-toggle"
              className="block text-sm font-medium text-slate-900"
            >
              Local Browser Copy
            </label>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              In addition to saving to Google Drive, automatically trigger a local download in your browser.
            </p>
          </div>
          <div className="md:col-span-7">
            <label className="inline-flex cursor-pointer items-center gap-3">
              <input
                id="local-copy-toggle"
                type="checkbox"
                checked={autoDownloadLocal}
                onChange={(e) => setAutoDownloadLocal(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-slate-700">
                Also save a copy to my Downloads folder
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                <Check className="h-3.5 w-3.5" />
                <span>Rule updated</span>
              </span>
            )}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Save Rule
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
