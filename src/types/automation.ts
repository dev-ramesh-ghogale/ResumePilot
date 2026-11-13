export type AttachmentFilterMode = 'documents' | 'all';

export interface AutomationRule {
  keyword: string;
  intervalMinutes: number;
  lookbackDays: number;
  attachmentFilter: AttachmentFilterMode;
  autoDownloadLocal: boolean;
  isPollingActive: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  createdTime?: string;
  webViewLink?: string;
}

export interface SavedResumeFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
  description?: string;
  appProperties?: {
    gmailMessageId?: string;
    attachmentKey?: string;
  };
  // Enriched metadata from description or local cache
  sender?: string;
  subject?: string;
  emailDate?: string;
}

export interface GmailAttachmentPart {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  inlineData?: string;
}

export interface MatchedGmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  internalDate: number;
  snippet: string;
  attachments: GmailAttachmentPart[];
}

export type LogStatus = 'success' | 'info' | 'warning' | 'error';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  trigger: 'scheduled' | 'manual';
  status: LogStatus;
  scannedCount: number;
  matchedCount: number;
  uploadedCount: number;
  skippedCount: number;
  message: string;
  details?: string[];
}

export interface SyncStats {
  totalScans: number;
  totalEmailsScanned: number;
  lastCheckedAt: string | null;
}

export interface CompanyProfile {
  companyName: string;
}

export interface DriveFolderMember {
  id: string;
  emailAddress?: string;
  displayName?: string;
  role: string;
  type: string;
}

export interface AllowedUserRecord {
  id: string;
  email: string;
  companyName?: string;
  notes?: string;
  status: 'active' | 'revoked';
  addedBy: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AccessRequestRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
  status: 'pending' | 'approved' | 'dismissed';
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type WorkspaceTab =
  | 'overview'
  | 'folder'
  | 'rules'
  | 'company'
  | 'admin'
  | 'logs';
