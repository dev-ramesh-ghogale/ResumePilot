import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Pause,
  Play,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  invalidateAccessToken,
  logout,
} from './lib/googleAuth';
import {
  ADMIN_EMAIL,
  approveAccessRequest,
  dismissAccessRequest,
  grantUserAccess,
  isAdminEmail,
  removeAllowedUser,
  setAllowedUserStatus,
  submitAccessRequest,
  subscribeAllAccessRequests,
  subscribeAllAllowedUsers,
  subscribeMyAccessRequest,
  subscribeUserAuthorization,
  testFirestoreConnection,
} from './lib/accessControl';
import {
  AuthExpiredError,
  base64UrlToUint8Array,
  createDriveFolder,
  deleteDriveFile,
  downloadDriveFileLocally,
  ensureDefaultFolder,
  fetchGmailAttachmentData,
  isAllowedAttachment,
  listDriveFolders,
  listFolderFiles,
  listFolderPermissions,
  searchMatchingMessages,
  shareFolderWithEmail,
  triggerBlobDownload,
  uploadAttachmentToDrive,
  verifyGoogleTokenIdentity,
} from './lib/workspaceApi';
import {
  formatCountdown,
  formatTimestamp,
  parseSearchKeywords,
} from './lib/formatters';
import {
  AccessRequestRecord,
  AllowedUserRecord,
  AutomationRule,
  CompanyProfile,
  DriveFolder,
  DriveFolderMember,
  SavedResumeFile,
  SyncLogEntry,
  SyncStats,
  WorkspaceTab,
} from './types/automation';
import { SignedOutView } from './components/SignedOutView';
import { AccessDeniedView } from './components/AccessDeniedView';
import { AdminPanel } from './components/AdminPanel';
import { ResumesTable } from './components/ResumesTable';
import { CloudFolderPanel } from './components/CloudFolderPanel';
import { RuleSettingsPanel } from './components/RuleSettingsPanel';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { CompanySetupPanel } from './components/CompanySetupPanel';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ConfirmShareModal } from './components/ConfirmShareModal';
import { CreateFolderModal } from './components/CreateFolderModal';

const DEFAULT_RULE: AutomationRule = {
  keyword: 'resume',
  intervalMinutes: 5,
  lookbackDays: 7,
  attachmentFilter: 'documents',
  autoDownloadLocal: false,
  isPollingActive: true,
};

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: '',
};

const DEFAULT_STATS: SyncStats = {
  totalScans: 0,
  totalEmailsScanned: 0,
  lastCheckedAt: null,
};

function storageKey(uid: string, suffix: string): string {
  return `rc_${uid}_${suffix}`;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  // Admin & Allowlist Access Control State
  const [accessStatus, setAccessStatus] = useState<
    'checking' | 'allowed' | 'denied' | 'revoked'
  >('checking');
  const [myAccessRequest, setMyAccessRequest] =
    useState<AccessRequestRecord | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUserRecord[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestRecord[]>(
    []
  );

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const [rule, setRule] = useState<AutomationRule>(DEFAULT_RULE);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(
    DEFAULT_COMPANY_PROFILE
  );
  const [verifiedIdentity, setVerifiedIdentity] = useState<{
    gmailEmail: string;
    driveEmail: string;
  } | null>(null);

  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [savedFiles, setSavedFiles] = useState<SavedResumeFile[]>([]);
  const [folderMembers, setFolderMembers] = useState<DriveFolderMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [stats, setStats] = useState<SyncStats>(DEFAULT_STATS);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    DEFAULT_RULE.intervalMinutes * 60
  );

  // Modals & row action state
  const [deleteTarget, setDeleteTarget] = useState<SavedResumeFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState<boolean>(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [sharePending, setSharePending] = useState<{
    email: string;
    role: 'writer' | 'reader';
  } | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Refs for stable scheduler & dedup access
  const syncLockRef = useRef<boolean>(false);
  const syncNoticeTimerRef = useRef<number | null>(null);
  const workspaceInitUidRef = useRef<string | null>(null);
  const accessStatusRef = useRef(accessStatus);
  const ruleRef = useRef<AutomationRule>(rule);
  const selectedFolderRef = useRef<DriveFolder | null>(selectedFolder);
  const userRef = useRef<User | null>(user);

  useEffect(() => {
    accessStatusRef.current = accessStatus;
  }, [accessStatus]);

  useEffect(() => {
    ruleRef.current = rule;
  }, [rule]);

  useEffect(() => {
    selectedFolderRef.current = selectedFolder;
  }, [selectedFolder]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const showSyncNotice = useCallback((message: string) => {
    if (syncNoticeTimerRef.current !== null) {
      window.clearTimeout(syncNoticeTimerRef.current);
    }
    setSyncNotice(message);
    syncNoticeTimerRef.current = window.setTimeout(() => {
      setSyncNotice(null);
      syncNoticeTimerRef.current = null;
    }, 5000);
  }, []);

  const appendLog = useCallback((uid: string, entry: SyncLogEntry) => {
    setLogs((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      localStorage.setItem(storageKey(uid, 'logs'), JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshFolderMembers = useCallback(
    async (driveToken: string, folderId: string) => {
      setIsLoadingMembers(true);
      try {
        const members = await listFolderPermissions(driveToken, folderId);
        setFolderMembers(members);
      } catch {
        setFolderMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    },
    []
  );

  const runSyncCycle = useCallback(
    async (
      trigger: 'scheduled' | 'manual',
      overrideFolder?: DriveFolder,
      overrideFiles?: SavedResumeFile[],
      silentIfEmpty = false
    ) => {
      if (syncLockRef.current) return;
      if (accessStatusRef.current !== 'allowed') return;
      const token = getAccessToken();
      const currentUser = userRef.current;
      const activeRule = ruleRef.current;

      if (!token || !currentUser) {
        setSessionExpired(true);
        if (trigger === 'manual') {
          setWorkspaceError(
            'Google session expired. Click Reconnect Google Account to run a check.'
          );
        }
        return;
      }

      syncLockRef.current = true;
      setIsSyncing(true);
      setWorkspaceError(null);
      if (activeRule.isPollingActive) {
        setSecondsRemaining(activeRule.intervalMinutes * 60);
      }

      try {
        let targetFolder = overrideFolder || selectedFolderRef.current;
        if (!targetFolder) {
          targetFolder = await ensureDefaultFolder(token);
          setSelectedFolder(targetFolder);
          selectedFolderRef.current = targetFolder;
          localStorage.setItem(
            storageKey(currentUser.uid, 'root_folder_id'),
            targetFolder.id
          );
        }

        // 1. Refresh current folder files (owned strictly by signed-in user)
        const existingFiles =
          overrideFiles ?? (await listFolderFiles(token, targetFolder.id));

        if (!overrideFiles) {
          setSavedFiles(existingFiles);
        }

        const existingKeys = new Set<string>();
        for (const f of existingFiles) {
          if (f.appProperties?.attachmentKey) {
            existingKeys.add(f.appProperties.attachmentKey);
          }
          if (f.appProperties?.gmailMessageId) {
            existingKeys.add(`${f.appProperties.gmailMessageId}:${f.name}`);
          }
        }

        // 2. Search Gmail for incoming messages with keyword in subject + attachments
        const { totalListed, matched } = await searchMatchingMessages(
          token,
          activeRule.keyword,
          activeRule.lookbackDays
        );

        let uploadedCount = 0;
        let skippedCount = 0;
        const uploadedNames: string[] = [];

        for (const msg of matched) {
          for (let idx = 0; idx < msg.attachments.length; idx++) {
            const part = msg.attachments[idx];
            if (!isAllowedAttachment(part.filename, activeRule.attachmentFilter)) {
              skippedCount++;
              continue;
            }

            // Bounded key (< 80 chars for Drive appProperties)
            const attachmentKey = `${msg.id}:${part.filename.slice(0, 48)}`.slice(
              0,
              78
            );
            const fallbackKey = `${msg.id}:${part.filename}`;

            if (existingKeys.has(attachmentKey) || existingKeys.has(fallbackKey)) {
              skippedCount++;
              continue;
            }

            // 3. Download attachment bytes from Gmail
            const base64UrlData = await fetchGmailAttachmentData(
              token,
              msg.id,
              part
            );

            // 4. Upload to selected Google Drive folder owned by the signed-in user
            const saved = await uploadAttachmentToDrive(token, {
              folderId: targetFolder.id,
              filename: part.filename,
              mimeType: part.mimeType,
              base64UrlData,
              messageId: msg.id,
              attachmentKey,
              subject: msg.subject,
              sender: msg.from,
              emailDate: msg.date,
            });

            existingKeys.add(attachmentKey);
            existingKeys.add(fallbackKey);
            uploadedCount++;
            uploadedNames.push(
              `${part.filename} (from "${msg.subject.slice(0, 50)}")`
            );

            // Optional local browser copy
            if (activeRule.autoDownloadLocal) {
              const bytes = base64UrlToUint8Array(base64UrlData);
              triggerBlobDownload(bytes, part.mimeType, part.filename);
            }

            // Optimistically prepend to file list
            setSavedFiles((prev) => [saved, ...prev]);
          }
        }

        const nowIso = new Date().toISOString();
        setStats((prev) => {
          const next: SyncStats = {
            totalScans: prev.totalScans + 1,
            totalEmailsScanned: prev.totalEmailsScanned + totalListed,
            lastCheckedAt: nowIso,
          };
          localStorage.setItem(
            storageKey(currentUser.uid, 'stats'),
            JSON.stringify(next)
          );
          return next;
        });

        const activeKeywords = parseSearchKeywords(activeRule.keyword);
        const summaryMsg =
          uploadedCount > 0
            ? `Saved ${uploadedCount} new resume ${
                uploadedCount === 1 ? 'attachment' : 'attachments'
              } to "root/${targetFolder.name}".`
            : matched.length > 0
            ? `Checked ${matched.length} matching ${
                matched.length === 1 ? 'email' : 'emails'
              }; all attachments were already saved.`
            : `No new emails found matching subject ${
                activeKeywords.length === 1 ? 'keyword' : 'keywords'
              } (${activeKeywords.join(', ')}).`;

        appendLog(currentUser.uid, {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: nowIso,
          trigger,
          status: uploadedCount > 0 ? 'success' : 'info',
          scannedCount: totalListed,
          matchedCount: matched.length,
          uploadedCount,
          skippedCount,
          message: summaryMsg,
          details: uploadedNames,
        });

        if (uploadedCount > 0 || (trigger === 'manual' && !silentIfEmpty)) {
          showSyncNotice(summaryMsg);
        }
      } catch (err: any) {
        if (err instanceof AuthExpiredError) {
          invalidateAccessToken();
          setSessionExpired(true);
          setRule((prev) => ({ ...prev, isPollingActive: false }));
          appendLog(currentUser.uid, {
            id: `${Date.now()}_auth`,
            timestamp: new Date().toISOString(),
            trigger,
            status: 'warning',
            scannedCount: 0,
            matchedCount: 0,
            uploadedCount: 0,
            skippedCount: 0,
            message: 'Google access session expired. Reconnect your account to resume checks.',
          });
        } else {
          const message = err?.message || 'Unable to complete mail check.';
          setWorkspaceError(message);
          appendLog(currentUser.uid, {
            id: `${Date.now()}_err`,
            timestamp: new Date().toISOString(),
            trigger,
            status: 'error',
            scannedCount: 0,
            matchedCount: 0,
            uploadedCount: 0,
            skippedCount: 0,
            message,
          });
        }
      } finally {
        syncLockRef.current = false;
        setIsSyncing(false);
      }
    },
    [appendLog, showSyncNotice]
  );

  const loadDriveWorkspace = useCallback(
    async (driveToken: string, uid: string, runInitialSync: boolean) => {
      const storageSuffix = 'root_folder_id';
      const savedFolderId = localStorage.getItem(storageKey(uid, storageSuffix));

      const allFolders = await listDriveFolders(driveToken);
      let activeFolder =
        (savedFolderId && allFolders.find((f) => f.id === savedFolderId)) ||
        null;

      let updatedFolders = allFolders;
      if (!activeFolder) {
        activeFolder = await ensureDefaultFolder(driveToken, allFolders);
        if (!allFolders.some((f) => f.id === activeFolder!.id)) {
          updatedFolders = [activeFolder, ...allFolders];
        }
      }

      setFolders(updatedFolders);
      setSelectedFolder(activeFolder);
      selectedFolderRef.current = activeFolder;
      localStorage.setItem(storageKey(uid, storageSuffix), activeFolder.id);

      const files = await listFolderFiles(driveToken, activeFolder.id);
      setSavedFiles(files);
      refreshFolderMembers(driveToken, activeFolder.id);
      setIsLoadingWorkspace(false);

      if (runInitialSync) {
        await runSyncCycle('manual', activeFolder, files, true);
      }
    },
    [refreshFolderMembers, runSyncCycle]
  );

  const initializeWorkspace = useCallback(
    async (token: string, uid: string) => {
      // Clear any previous session workspace data before loading the active user's Drive/Gmail
      setFolders([]);
      setSelectedFolder(null);
      selectedFolderRef.current = null;
      setSavedFiles([]);
      setFolderMembers([]);
      setVerifiedIdentity(null);
      setIsLoadingWorkspace(true);
      setWorkspaceError(null);
      setSessionExpired(false);

      // Load non-sensitive persisted user preferences & logs scoped to this uid
      const savedRule = loadJson<AutomationRule>(
        storageKey(uid, 'rule'),
        DEFAULT_RULE
      );
      const rawCompany = loadJson<{ companyName?: string }>(
        storageKey(uid, 'company'),
        DEFAULT_COMPANY_PROFILE
      );
      const savedCompany: CompanyProfile = {
        companyName: rawCompany?.companyName || '',
      };
      const savedLogs = loadJson<SyncLogEntry[]>(storageKey(uid, 'logs'), []);
      const savedStats = loadJson<SyncStats>(
        storageKey(uid, 'stats'),
        DEFAULT_STATS
      );

      setRule(savedRule);
      ruleRef.current = savedRule;
      setCompanyProfile(savedCompany);
      setSecondsRemaining(savedRule.intervalMinutes * 60);
      setLogs(savedLogs);
      setStats(savedStats);

      try {
        const expectedEmail = (userRef.current?.email || '').trim().toLowerCase();
        const identity = await verifyGoogleTokenIdentity(token);
        if (
          expectedEmail &&
          ((identity.gmailEmail && identity.gmailEmail !== expectedEmail) ||
            (identity.driveEmail && identity.driveEmail !== expectedEmail))
        ) {
          invalidateAccessToken();
          workspaceInitUidRef.current = null;
          setNeedsAuth(true);
          setAuthError(
            `Google session mismatch detected. Please sign in again as ${expectedEmail}.`
          );
          setIsLoadingWorkspace(false);
          return;
        }
        setVerifiedIdentity(identity);
        await loadDriveWorkspace(token, uid, true);
      } catch (err: any) {
        setIsLoadingWorkspace(false);
        if (err instanceof AuthExpiredError) {
          invalidateAccessToken();
          setSessionExpired(true);
        } else {
          setWorkspaceError(
            err?.message || 'Failed to load your Google Drive workspace.'
          );
        }
      }
    },
    [loadDriveWorkspace]
  );

  // Test Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = initAuth(
      (authedUser) => {
        setUser(authedUser);
        userRef.current = authedUser;
        setNeedsAuth(false);
        setAuthReady(true);
      },
      (existingUser) => {
        setUser(existingUser);
        userRef.current = existingUser;
        setNeedsAuth(true);
        setAuthReady(true);
        workspaceInitUidRef.current = null;
        setAccessStatus('checking');
      }
    );
    return () => unsub();
  }, []);

  // Role & allowlist authorization listener + Admin subscriptions
  useEffect(() => {
    if (!authReady || needsAuth || !user || !user.email) {
      return;
    }

    const token = getAccessToken();
    const isAdmin = isAdminEmail(user.email);

    if (isAdmin) {
      setAccessStatus('allowed');
      accessStatusRef.current = 'allowed';

      if (token && workspaceInitUidRef.current !== user.uid) {
        workspaceInitUidRef.current = user.uid;
        initializeWorkspace(token, user.uid);
      }

      const unsubUsers = subscribeAllAllowedUsers(
        (list) => setAllowedUsers(list),
        (err) => setWorkspaceError(err.message)
      );
      const unsubReqs = subscribeAllAccessRequests(
        (reqs) => setAccessRequests(reqs),
        (err) => setWorkspaceError(err.message)
      );

      return () => {
        unsubUsers();
        unsubReqs();
      };
    }

    // Non-admin user: verify allowlist status in Firestore in real time
    setAccessStatus('checking');
    const unsubAuthz = subscribeUserAuthorization(
      user.email,
      (record) => {
        if (record && record.status === 'active') {
          setAccessStatus('allowed');
          accessStatusRef.current = 'allowed';
          const activeToken = getAccessToken();
          if (activeToken && workspaceInitUidRef.current !== user.uid) {
            workspaceInitUidRef.current = user.uid;
            initializeWorkspace(activeToken, user.uid);
          }
        } else if (record && record.status === 'revoked') {
          setAccessStatus('revoked');
          accessStatusRef.current = 'revoked';
          workspaceInitUidRef.current = null;
        } else {
          setAccessStatus('denied');
          accessStatusRef.current = 'denied';
          workspaceInitUidRef.current = null;
        }
      },
      (err) => {
        setWorkspaceError(err.message);
        setAccessStatus('denied');
      }
    );

    const unsubMyReq = subscribeMyAccessRequest(
      user.uid,
      (req) => setMyAccessRequest(req),
      () => {}
    );

    return () => {
      unsubAuthz();
      unsubMyReq();
    };
  }, [authReady, needsAuth, user, initializeWorkspace]);

  // 1-second ticker driving the 5-minute polling countdown
  useEffect(() => {
    if (
      needsAuth ||
      sessionExpired ||
      accessStatus !== 'allowed' ||
      !rule.isPollingActive ||
      !selectedFolder
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (syncLockRef.current) return;
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          runSyncCycle('scheduled');
          return ruleRef.current.intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    needsAuth,
    sessionExpired,
    accessStatus,
    rule.isPollingActive,
    rule.intervalMinutes,
    selectedFolder,
    runSyncCycle,
  ]);

  const handleSignIn = async (
    forceConsent = false,
    loginHint?: string | null
  ) => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const previousUid = userRef.current?.uid || null;
      const { user: signedInUser, accessToken } = await googleSignIn(
        forceConsent,
        loginHint
      );
      workspaceInitUidRef.current = null;
      if (previousUid && previousUid !== signedInUser.uid) {
        setFolders([]);
        setSelectedFolder(null);
        selectedFolderRef.current = null;
        setSavedFiles([]);
        setFolderMembers([]);
        setVerifiedIdentity(null);
        setAccessStatus('checking');
        accessStatusRef.current = 'checking';
      }
      setUser(signedInUser);
      userRef.current = signedInUser;
      setNeedsAuth(false);
      setSessionExpired(false);
      if (
        (!previousUid || previousUid === signedInUser.uid) &&
        (accessStatusRef.current === 'allowed' ||
          isAdminEmail(signedInUser.email))
      ) {
        workspaceInitUidRef.current = signedInUser.uid;
        await initializeWorkspace(accessToken, signedInUser.uid);
      }
    } catch (err: any) {
      setAuthError(
        err?.message ||
          'Sign-in was cancelled or required Gmail/Drive permissions were not granted.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    workspaceInitUidRef.current = null;
    setUser(null);
    userRef.current = null;
    setNeedsAuth(true);
    setSessionExpired(false);
    setAccessStatus('checking');
    accessStatusRef.current = 'checking';
    setMyAccessRequest(null);
    setAllowedUsers([]);
    setAccessRequests([]);
    setActiveTab('overview');
    setVerifiedIdentity(null);
    setFolders([]);
    setSelectedFolder(null);
    selectedFolderRef.current = null;
    setSavedFiles([]);
    setFolderMembers([]);
    setLogs([]);
    setStats(DEFAULT_STATS);
    setCompanyProfile(DEFAULT_COMPANY_PROFILE);
    setWorkspaceError(null);
  };

  const handleSwitchAccount = async () => {
    await handleSignOut();
    await handleSignIn(false, null);
  };

  const handleSaveCompanyProfile = (nextProfile: CompanyProfile) => {
    setCompanyProfile(nextProfile);
    if (user) {
      localStorage.setItem(
        storageKey(user.uid, 'company'),
        JSON.stringify(nextProfile)
      );
    }
  };

  const handleConfirmShare = async () => {
    if (!sharePending || !selectedFolder) return;
    const driveToken = getAccessToken();
    if (!driveToken) {
      setSessionExpired(true);
      setSharePending(null);
      return;
    }

    setIsSharing(true);
    try {
      await shareFolderWithEmail(
        driveToken,
        selectedFolder.id,
        sharePending.email,
        sharePending.role
      );
      showSyncNotice(
        `Shared "root/${selectedFolder.name}" with ${sharePending.email}.`
      );
      await refreshFolderMembers(driveToken, selectedFolder.id);
      setSharePending(null);
    } catch (err: any) {
      setWorkspaceError(
        err?.message || `Failed to share folder with ${sharePending.email}.`
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveRule = (nextRule: AutomationRule) => {
    setRule(nextRule);
    ruleRef.current = nextRule;
    setSecondsRemaining(nextRule.intervalMinutes * 60);
    if (user) {
      localStorage.setItem(
        storageKey(user.uid, 'rule'),
        JSON.stringify(nextRule)
      );
    }
  };

  const handleTogglePolling = () => {
    const nextRule = { ...rule, isPollingActive: !rule.isPollingActive };
    setRule(nextRule);
    ruleRef.current = nextRule;
    if (nextRule.isPollingActive) {
      setSecondsRemaining(nextRule.intervalMinutes * 60);
    }
    if (user) {
      localStorage.setItem(
        storageKey(user.uid, 'rule'),
        JSON.stringify(nextRule)
      );
    }
  };

  const handleSelectFolder = async (folder: DriveFolder) => {
    const token = getAccessToken();
    if (!token) {
      setSessionExpired(true);
      return;
    }
    setSelectedFolder(folder);
    selectedFolderRef.current = folder;
    if (user) {
      localStorage.setItem(storageKey(user.uid, 'root_folder_id'), folder.id);
    }
    setIsLoadingWorkspace(true);
    try {
      const files = await listFolderFiles(token, folder.id);
      setSavedFiles(files);
      refreshFolderMembers(token, folder.id);
    } catch (err: any) {
      if (err instanceof AuthExpiredError) {
        invalidateAccessToken();
        setSessionExpired(true);
      } else {
        setWorkspaceError(err?.message || 'Failed to load folder contents.');
      }
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    const token = getAccessToken();
    if (!token) {
      setSessionExpired(true);
      setCreateFolderOpen(false);
      return;
    }
    setIsCreatingFolder(true);
    try {
      const created = await createDriveFolder(token, name, 'root');
      setFolders((prev) => [created, ...prev]);
      setSelectedFolder(created);
      selectedFolderRef.current = created;
      if (user) {
        localStorage.setItem(storageKey(user.uid, 'root_folder_id'), created.id);
      }
      setSavedFiles([]);
      refreshFolderMembers(token, created.id);
      setCreateFolderOpen(false);
    } catch (err: any) {
      if (err instanceof AuthExpiredError) {
        invalidateAccessToken();
        setSessionExpired(true);
      } else {
        setWorkspaceError(err?.message || 'Failed to create Drive folder.');
      }
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDownloadLocal = async (file: SavedResumeFile) => {
    const token = getAccessToken();
    if (!token) {
      setSessionExpired(true);
      return;
    }
    setDownloadingId(file.id);
    try {
      await downloadDriveFileLocally(token, file.id, file.name);
    } catch (err: any) {
      if (err instanceof AuthExpiredError) {
        invalidateAccessToken();
        setSessionExpired(true);
      } else {
        setWorkspaceError(err?.message || `Failed to download ${file.name}.`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const token = getAccessToken();
    if (!token) {
      setSessionExpired(true);
      setDeleteTarget(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDriveFile(token, deleteTarget.id);
      setSavedFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      if (err instanceof AuthExpiredError) {
        invalidateAccessToken();
        setSessionExpired(true);
      } else {
        setWorkspaceError(
          err?.message || `Failed to delete ${deleteTarget.name}.`
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    if (user) {
      localStorage.removeItem(storageKey(user.uid, 'logs'));
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (needsAuth || !user) {
    return (
      <SignedOutView
        onSignIn={() => handleSignIn(false, user?.email)}
        onSwitchAccount={user ? handleSwitchAccount : undefined}
        isSigningIn={isSigningIn}
        authError={authError}
        existingEmail={user?.email}
      />
    );
  }

  const isAdmin = isAdminEmail(user.email);

  if (accessStatus === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>Verifying workspace permissions...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin && accessStatus !== 'allowed') {
    return (
      <AccessDeniedView
        userEmail={user.email || ''}
        displayName={user.displayName || ''}
        isRevoked={accessStatus === 'revoked'}
        existingRequest={myAccessRequest}
        onSubmitRequest={async (companyName) => {
          await submitAccessRequest({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email || 'User',
            companyName,
          });
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'folder',
      label: 'Cloud Folder',
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      id: 'rules',
      label: 'Rule & Schedule',
      icon: <SlidersHorizontal className="h-4 w-4" />,
    },
    {
      id: 'company',
      label: 'Company Setup',
      icon: <Building2 className="h-4 w-4" />,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as WorkspaceTab,
            label: 'Admin Panel',
            icon: <Shield className="h-4 w-4" />,
          },
        ]
      : []),
    {
      id: 'logs',
      label: 'Activity Log',
      icon: <Activity className="h-4 w-4" />,
    },
  ];

  const tabTitles: Record<WorkspaceTab, string> = {
    overview: 'Overview',
    folder: 'Cloud Folder',
    rules: 'Rule & Schedule',
    company: 'Company Setup',
    admin: 'Admin Panel',
    logs: 'Activity Log',
  };

  const activeStorageOwnerEmail =
    verifiedIdentity?.driveEmail || user.email || '';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex">
        <div>
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              ResumeCollector
            </span>
          </div>

          <nav className="space-y-1 p-4" aria-label="Workspace navigation">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Connected User Profile & Sign Out */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                referrerPolicy="no-referrer"
                className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-900">
                {user.displayName || 'Google Account'}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 flex w-64 flex-col justify-between bg-white shadow-xl">
            <div>
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
                <span className="font-display text-base font-bold text-slate-900">
                  ResumeCollector
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="space-y-1 p-3">
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="border-t border-slate-200 p-4">
              <p className="truncate text-xs font-medium text-slate-900">
                {user.email}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Workspace Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">
                {companyProfile.companyName || 'Workspace'}
              </span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <h1 className="truncate font-display font-semibold text-slate-900">
                {tabTitles[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Countdown Text */}
            <div className="hidden items-center gap-2 text-xs text-slate-600 sm:flex">
              {sessionExpired ? (
                <span className="font-medium text-red-700">Session expired</span>
              ) : rule.isPollingActive ? (
                <>
                  <span>Next check in</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {formatCountdown(secondsRemaining)}
                  </span>
                </>
              ) : (
                <span className="font-medium text-amber-700">
                  Auto-check paused
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleTogglePolling}
              disabled={sessionExpired}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {rule.isPollingActive ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => runSyncCycle('manual')}
              disabled={isSyncing || sessionExpired}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>{isSyncing ? 'Checking...' : 'Check Now'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-5 py-6 lg:px-8">
          {/* Session Expired Reconnect Banner */}
          {sessionExpired && (
            <div
              role="alert"
              className="flex flex-col justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Google access token expired
                  </p>
                  <p className="mt-0.5 text-xs text-red-700">
                    Google Workspace sessions expire after 1 hour. Reconnect your account to resume 5-minute mail checks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSignIn(false, user.email)}
                disabled={isSigningIn}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isSigningIn ? 'Reconnecting...' : 'Reconnect Google Account'}
              </button>
            </div>
          )}

          {/* Error Banner */}
          {workspaceError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-800"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{workspaceError}</span>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceError(null)}
                className="rounded p-1 text-red-500 hover:bg-red-100"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* New Resume Saved Notice */}
          {syncNotice && (
            <div
              role="status"
              className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-green-900"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <span>{syncNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncNotice(null)}
                className="rounded p-1 text-green-600 hover:bg-green-100"
                aria-label="Dismiss notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Active Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4-Column Flat KPI Strip */}
              <section className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500">
                    Resumes Saved
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                    {savedFiles.length}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    root/{selectedFolder?.name || 'resume'} · {activeStorageOwnerEmail}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500">
                    Subject Filter
                  </p>
                  <p className="mt-1.5 truncate font-display text-xl font-semibold text-slate-900">
                    {parseSearchKeywords(rule.keyword).join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {rule.attachmentFilter === 'documents'
                      ? 'Documents (.pdf, .doc, .docx)'
                      : 'All attachment types'}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500">
                    Check Schedule
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                    Every {rule.intervalMinutes}m
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      rule.isPollingActive
                        ? 'text-green-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {rule.isPollingActive
                      ? `Active · Next in ${formatCountdown(secondsRemaining)}`
                      : 'Paused'}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-slate-500">
                    Last Checked
                  </p>
                  <p className="mt-1.5 font-mono text-sm font-medium text-slate-900 tabular-nums">
                    {formatTimestamp(stats.lastCheckedAt)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 tabular-nums">
                    {stats.totalScans} {stats.totalScans === 1 ? 'run' : 'runs'} ·{' '}
                    {stats.totalEmailsScanned} emails matched query
                  </p>
                </div>
              </section>

              {/* Saved Resumes Table */}
              <ResumesTable
                files={savedFiles}
                isLoading={isLoadingWorkspace}
                isSyncing={isSyncing}
                folderName={`root/${selectedFolder?.name || 'resume'}`}
                onRunSync={() => runSyncCycle('manual')}
                onDownloadLocal={handleDownloadLocal}
                onRequestDelete={(file) => setDeleteTarget(file)}
                downloadingId={downloadingId}
              />
            </div>
          )}

          {activeTab === 'folder' && (
            <CloudFolderPanel
              folders={folders}
              selectedFolder={selectedFolder}
              files={savedFiles}
              isLoadingFiles={isLoadingWorkspace}
              isSyncing={isSyncing}
              downloadingId={downloadingId}
              onSelectFolder={handleSelectFolder}
              onOpenCreateFolder={() => setCreateFolderOpen(true)}
              onRunSync={() => runSyncCycle('manual')}
              onDownloadLocal={handleDownloadLocal}
              onRequestDelete={(file) => setDeleteTarget(file)}
            />
          )}

          {activeTab === 'rules' && (
            <RuleSettingsPanel rule={rule} onSaveRule={handleSaveRule} />
          )}

          {activeTab === 'company' && (
            <CompanySetupPanel
              primaryEmail={user.email || ''}
              verifiedGmailEmail={verifiedIdentity?.gmailEmail}
              verifiedDriveEmail={verifiedIdentity?.driveEmail}
              profile={companyProfile}
              keywords={rule.keyword}
              folderName={`root/${selectedFolder?.name || 'resume'}`}
              folderMembers={folderMembers}
              isLoadingMembers={isLoadingMembers}
              onSaveProfile={handleSaveCompanyProfile}
              onSaveKeywords={(nextKeywords) =>
                handleSaveRule({ ...rule, keyword: nextKeywords })
              }
              onRequestShareFolder={(email, role) =>
                setSharePending({ email, role })
              }
            />
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminPanel
              adminEmail={user.email || ADMIN_EMAIL}
              allowedUsers={allowedUsers}
              accessRequests={accessRequests}
              onGrantUser={async ({ email, companyName, notes }) => {
                await grantUserAccess({
                  email,
                  companyName,
                  notes,
                  adminEmail: user.email || ADMIN_EMAIL,
                });
              }}
              onToggleUserStatus={async (targetUser) => {
                await setAllowedUserStatus({
                  id: targetUser.id,
                  status: targetUser.status === 'active' ? 'revoked' : 'active',
                  adminEmail: user.email || ADMIN_EMAIL,
                });
              }}
              onRemoveUser={async (targetUser) => {
                await removeAllowedUser(targetUser.id);
              }}
              onApproveRequest={async (req) => {
                await approveAccessRequest({
                  request: req,
                  adminEmail: user.email || ADMIN_EMAIL,
                });
              }}
              onDismissRequest={async (requestId) => {
                await dismissAccessRequest(requestId);
              }}
            />
          )}

          {activeTab === 'logs' && (
            <ActivityLogPanel logs={logs} onClearLogs={handleClearLogs} />
          )}
        </main>
      </div>

      {/* Explicit Confirmation Modal for Drive File Deletion */}
      <ConfirmDeleteModal
        file={deleteTarget}
        folderName={`root/${selectedFolder?.name || 'resume'}`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      />

      {/* Explicit Confirmation Modal for Drive Folder Sharing */}
      <ConfirmShareModal
        isOpen={Boolean(sharePending)}
        email={sharePending?.email || ''}
        role={sharePending?.role || 'writer'}
        folderName={`root/${selectedFolder?.name || 'resume'}`}
        isSharing={isSharing}
        onConfirm={handleConfirmShare}
        onCancel={() => !isSharing && setSharePending(null)}
      />

      {/* New Cloud Folder Modal */}
      <CreateFolderModal
        isOpen={createFolderOpen}
        isCreating={isCreatingFolder}
        onCreate={handleCreateFolder}
        onClose={() => !isCreatingFolder && setCreateFolderOpen(false)}
      />
    </div>
  );
}
