export function formatFileSize(sizeStr?: string | number): string {
  if (sizeStr === undefined || sizeStr === null || sizeStr === '') return '—';
  const bytes = typeof sizeStr === 'number' ? sizeStr : Number(sizeStr);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatTimestamp(isoOrDate?: string | null): string {
  if (!isoOrDate) return 'Never';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatShortDate(isoOrDate?: string | null): string {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseSenderDisplay(rawFrom?: string): { name: string; email: string } {
  if (!rawFrom) return { name: 'Unknown Sender', email: '' };
  const match = rawFrom.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  return { name: rawFrom.trim(), email: '' };
}

export function getFileKindLabel(filename: string, mimeType?: string): 'PDF' | 'Word' | 'Text' | 'File' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'PDF';
  if (
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    mimeType?.includes('word') ||
    mimeType?.includes('officedocument')
  ) {
    return 'Word';
  }
  if (lower.endsWith('.txt') || lower.endsWith('.rtf') || mimeType?.startsWith('text/')) {
    return 'Text';
  }
  return 'File';
}

export function parseSearchKeywords(raw?: string): string[] {
  if (!raw) return ['resume'];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const cleaned = part.replace(/"/g, '').trim();
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(cleaned);
    }
  }
  return result.length > 0 ? result : ['resume'];
}

export function normalizeKeywordString(raw?: string): string {
  return parseSearchKeywords(raw).join(', ');
}
