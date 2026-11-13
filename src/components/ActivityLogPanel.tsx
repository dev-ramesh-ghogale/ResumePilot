import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Trash2,
} from 'lucide-react';
import { SyncLogEntry } from '../types/automation';
import { formatTimestamp } from '../lib/formatters';

interface ActivityLogPanelProps {
  logs: SyncLogEntry[];
  onClearLogs: () => void;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  logs,
  onClearLogs,
}) => {
  const renderStatus = (status: SyncLogEntry['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Attention</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Error</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Info className="h-3.5 w-3.5" />
            <span>Checked</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Automation Activity Log
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Chronological history of scheduled 5-minute checks and manual runs.
          </p>
        </div>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Log</span>
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
            No check runs recorded yet
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Activity entries appear here every time Gmail is checked for resume attachments.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map((entry) => (
            <div key={entry.id} className="px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {renderStatus(entry.status)}
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-medium text-slate-700">
                    {entry.trigger === 'scheduled' ? 'Scheduled Check' : 'Manual Check'}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs text-slate-500 tabular-nums">
                  <span>{entry.matchedCount} matched</span>
                  <span aria-hidden="true">/</span>
                  <span>{entry.uploadedCount} saved</span>
                  {entry.skippedCount > 0 && (
                    <>
                      <span aria-hidden="true">/</span>
                      <span>{entry.skippedCount} skipped</span>
                    </>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-sm text-slate-800">{entry.message}</p>

              {entry.details && entry.details.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                  {entry.details.map((line, idx) => (
                    <li key={idx} className="font-mono">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
