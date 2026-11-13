import {
  AttachmentFilterMode,
  DriveFolder,
  GmailAttachmentPart,
  MatchedGmailMessage,
  SavedResumeFile,
} from '../types/automation';
import { parseSearchKeywords } from './formatters';

export class AuthExpiredError extends Error {
  constructor(message = 'Your Google session has expired. Please reconnect to continue.') {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'rtf',
  'txt',
  'odt',
  'pages',
]);

async function apiFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new AuthExpiredError();
  }

  return res;
}

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : '';
}

export function isAllowedAttachment(filename: string, mode: AttachmentFilterMode): boolean {
  if (mode === 'all') return true;
  const ext = getFileExtension(filename);
  return DOCUMENT_EXTENSIONS.has(ext);
}

export function base64UrlToStandardBase64(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  return pad === 0 ? base64 : base64 + '='.repeat(4 - pad);
}

export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const standard = base64UrlToStandardBase64(base64Url);
  const binary = atob(standard);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function triggerBlobDownload(bytes: Uint8Array, mimeType: string, filename: string): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: mimeType || 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Recursively traverse Gmail MIME payload to locate all attachments
function extractAttachmentsFromPayload(
  payload: any,
  acc: GmailAttachmentPart[] = []
): GmailAttachmentPart[] {
  if (!payload) return acc;

  if (payload.filename && payload.filename.trim().length > 0 && payload.body) {
    if (payload.body.attachmentId || payload.body.data) {
      acc.push({
        attachmentId: payload.body.attachmentId || '',
        filename: payload.filename.trim(),
        mimeType: payload.mimeType || 'application/octet-stream',
        size: payload.body.size || 0,
        inlineData: payload.body.data,
      });
    }
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      extractAttachmentsFromPayload(part, acc);
    }
  }

  return acc;
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, target: string): string {
  if (!headers) return '';
  const match = headers.find((h) => h.name.toLowerCase() === target.toLowerCase());
  return match?.value ?? '';
}

export async function searchMatchingMessages(
  token: string,
  keyword: string,
  lookbackDays: number
): Promise<{ totalListed: number; matched: MatchedGmailMessage[] }> {
  const keywords = parseSearchKeywords(keyword);
  const formattedTerms = keywords.map((kw) =>
    kw.includes(' ') ? `"${kw}"` : kw
  );
  const subjectClause =
    formattedTerms.length === 1
      ? `subject:${formattedTerms[0]}`
      : `subject:(${formattedTerms.join(' OR ')})`;

  const queryParts = [subjectClause, 'has:attachment'];
  if (lookbackDays > 0) {
    queryParts.push(`newer_than:${lookbackDays}d`);
  }

  const q = encodeURIComponent(queryParts.join(' '));
  const listRes = await apiFetch(`${GMAIL_API}/messages?q=${q}&maxResults=30`, token);

  if (!listRes.ok) {
    const errBody = await listRes.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Gmail search failed (${listRes.status})`);
  }

  const listData = await listRes.json();
  const messageRefs: Array<{ id: string; threadId: string }> = listData.messages || [];

  if (messageRefs.length === 0) {
    return { totalListed: 0, matched: [] };
  }

  const matched: MatchedGmailMessage[] = [];
  const lowerKeywords = keywords.map((kw) => kw.toLowerCase());

  // Fetch details in bounded batches of 5 to avoid rate limits
  for (let i = 0; i < messageRefs.length; i += 5) {
    const batch = messageRefs.slice(i, i + 5);
    const details = await Promise.all(
      batch.map(async (ref) => {
        const msgRes = await apiFetch(
          `${GMAIL_API}/messages/${ref.id}?format=full`,
          token
        );
        if (!msgRes.ok) return null;
        return msgRes.json();
      })
    );

    for (const msg of details) {
      if (!msg) continue;
      const headers = msg.payload?.headers;
      const subject = getHeader(headers, 'Subject') || '(No Subject)';
      const from = getHeader(headers, 'From') || 'Unknown Sender';
      const date = getHeader(headers, 'Date') || '';

      // Confirm at least one keyword appears in the subject line
      const lowerSubject = subject.toLowerCase();
      if (!lowerKeywords.some((kw) => lowerSubject.includes(kw))) continue;

      const attachments = extractAttachmentsFromPayload(msg.payload);
      if (attachments.length === 0) continue;

      matched.push({
        id: msg.id,
        threadId: msg.threadId,
        subject,
        from,
        date,
        internalDate: Number(msg.internalDate || Date.now()),
        snippet: msg.snippet || '',
        attachments,
      });
    }
  }

  return {
    totalListed: messageRefs.length,
    matched,
  };
}

export async function fetchGmailAttachmentData(
  token: string,
  messageId: string,
  part: GmailAttachmentPart
): Promise<string> {
  if (part.inlineData) {
    return part.inlineData;
  }
  if (!part.attachmentId) {
    throw new Error(`Missing attachment ID for ${part.filename}`);
  }

  const res = await apiFetch(
    `${GMAIL_API}/messages/${messageId}/attachments/${part.attachmentId}`,
    token
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to download attachment ${part.filename}`
    );
  }

  const data = await res.json();
  if (!data.data) {
    throw new Error(`Attachment ${part.filename} returned empty data.`);
  }
  return data.data;
}

export async function verifyGoogleTokenIdentity(token: string): Promise<{
  gmailEmail: string;
  driveEmail: string;
}> {
  const [gmailRes, driveRes] = await Promise.all([
    apiFetch(`${GMAIL_API}/profile`, token),
    apiFetch(`${DRIVE_API}/about?fields=user(emailAddress,displayName)`, token),
  ]);

  if (!gmailRes.ok) {
    const errBody = await gmailRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to verify Gmail account (${gmailRes.status})`
    );
  }
  if (!driveRes.ok) {
    const errBody = await driveRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to verify Google Drive account (${driveRes.status})`
    );
  }

  const gmailData = await gmailRes.json();
  const driveData = await driveRes.json();

  return {
    gmailEmail: (gmailData.emailAddress || '').trim().toLowerCase(),
    driveEmail: (driveData.user?.emailAddress || '').trim().toLowerCase(),
  };
}

export async function listDriveFolders(token: string): Promise<DriveFolder[]> {
  const q = encodeURIComponent(
    "'root' in parents and 'me' in owners and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const res = await apiFetch(
    `${DRIVE_API}/files?q=${q}&spaces=drive&includeItemsFromAllDrives=false&supportsAllDrives=false&fields=files(id,name,createdTime,webViewLink,owners(emailAddress,me))&orderBy=name&pageSize=100`,
    token
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to list Drive folders (${res.status})`);
  }

  const data = await res.json();
  const files: any[] = data.files || [];
  return files.filter(
    (f) => !Array.isArray(f.owners) || f.owners.some((o: any) => o.me === true)
  );
}

export async function createDriveFolder(
  token: string,
  folderName: string,
  parentId = 'root'
): Promise<DriveFolder> {
  const trimmed = folderName.trim() || 'resume';
  const res = await apiFetch(
    `${DRIVE_API}/files?fields=id,name,createdTime,webViewLink`,
    token,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: trimmed,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to create Drive folder (${res.status})`);
  }

  return res.json();
}

export async function ensureDefaultFolder(
  token: string,
  existingFolders?: DriveFolder[]
): Promise<DriveFolder> {
  const folders = existingFolders ?? (await listDriveFolders(token));
  const exactMatch = folders.find((f) => f.name === 'resume');
  if (exactMatch) {
    return exactMatch;
  }
  const caseInsensitiveMatch = folders.find(
    (f) => f.name.toLowerCase() === 'resume'
  );
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }
  return createDriveFolder(token, 'resume', 'root');
}

function parseSavedDescription(description?: string): {
  sender?: string;
  subject?: string;
  emailDate?: string;
} {
  if (!description) return {};
  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed === 'object') {
      return {
        sender: parsed.sender,
        subject: parsed.subject,
        emailDate: parsed.emailDate,
      };
    }
  } catch {
    // Legacy or plain text description
  }
  return {};
}

export async function listFolderFiles(
  token: string,
  folderId: string
): Promise<SavedResumeFile[]> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and 'me' in owners and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
  );
  const res = await apiFetch(
    `${DRIVE_API}/files?q=${q}&spaces=drive&includeItemsFromAllDrives=false&supportsAllDrives=false&fields=files(id,name,mimeType,size,createdTime,webViewLink,description,appProperties,owners(emailAddress,me))&orderBy=createdTime desc&pageSize=100`,
    token
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to list files in folder (${res.status})`);
  }

  const data = await res.json();
  const files: SavedResumeFile[] = (data.files || [])
    .filter(
      (f: any) =>
        !Array.isArray(f.owners) || f.owners.some((o: any) => o.me === true)
    )
    .map((f: any) => {
      const meta = parseSavedDescription(f.description);
      return {
        ...f,
        ...meta,
      };
    });

  return files;
}

export async function uploadAttachmentToDrive(
  token: string,
  params: {
    folderId: string;
    filename: string;
    mimeType: string;
    base64UrlData: string;
    messageId: string;
    attachmentKey: string;
    subject: string;
    sender: string;
    emailDate: string;
  }
): Promise<SavedResumeFile> {
  const boundary = `-------resume_collector_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const standardBase64 = base64UrlToStandardBase64(params.base64UrlData);

  // Keep appProperties keys+values strictly under Drive's 124-byte UTF-8 limit
  const metadata = {
    name: params.filename,
    parents: [params.folderId],
    description: JSON.stringify({
      sender: params.sender,
      subject: params.subject,
      emailDate: params.emailDate,
      source: 'ResumeCollector',
    }),
    appProperties: {
      gmailMessageId: params.messageId.slice(0, 64),
      attachmentKey: params.attachmentKey.slice(0, 80),
    },
  };

  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${params.mimeType || 'application/octet-stream'}`,
    'Content-Transfer-Encoding: base64',
    '',
    standardBase64,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await apiFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,description,appProperties`,
    token,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to upload ${params.filename} to Drive (${res.status})`
    );
  }

  const created = await res.json();
  const meta = parseSavedDescription(created.description);
  return {
    ...created,
    ...meta,
  };
}

export async function downloadDriveFileLocally(
  token: string,
  fileId: string,
  filename: string
): Promise<void> {
  const res = await apiFetch(`${DRIVE_API}/files/${fileId}?alt=media`, token);
  if (!res.ok) {
    throw new Error(`Failed to download ${filename} from Google Drive`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const res = await apiFetch(`${DRIVE_API}/files/${fileId}`, token, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to delete file (${res.status})`);
  }
}

export async function listFolderPermissions(
  token: string,
  folderId: string
): Promise<
  Array<{
    id: string;
    emailAddress?: string;
    displayName?: string;
    role: string;
    type: string;
  }>
> {
  const res = await apiFetch(
    `${DRIVE_API}/files/${folderId}/permissions?fields=permissions(id,emailAddress,displayName,role,type)`,
    token
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to load folder sharing settings (${res.status})`
    );
  }
  const data = await res.json();
  return data.permissions || [];
}

export async function shareFolderWithEmail(
  token: string,
  folderId: string,
  email: string,
  role: 'writer' | 'reader' = 'writer'
): Promise<void> {
  const res = await apiFetch(
    `${DRIVE_API}/files/${folderId}/permissions?sendNotificationEmail=true`,
    token,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email.trim(),
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Failed to share folder with ${email} (${res.status})`
    );
  }
}
