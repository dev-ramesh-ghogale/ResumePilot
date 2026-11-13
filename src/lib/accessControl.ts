import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './googleAuth';
import { AccessRequestRecord, AllowedUserRecord } from '../types/automation';

export const ADMIN_EMAIL = 'dev.ramesh.ghogale@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}

export function emailToHexId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timestampToIso(ts: unknown): string | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as any).toDate === 'function') {
    return (ts as any).toDate().toISOString();
  }
  return null;
}

// Validate connection to Firestore on application boot
export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Subscribe to a non-admin user's allowlist status in real time
export function subscribeUserAuthorization(
  email: string,
  onChange: (record: AllowedUserRecord | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const normalized = email.trim().toLowerCase();
  const path = 'allowed_users';
  const q = query(
    collection(db, path),
    where('email', '==', normalized),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onChange(null);
        return;
      }
      const d = snapshot.docs[0];
      const data = d.data();
      onChange({
        id: d.id,
        email: data.email,
        companyName: data.companyName || '',
        notes: data.notes || '',
        status: data.status,
        addedBy: data.addedBy,
        createdAt: timestampToIso(data.createdAt),
        updatedAt: timestampToIso(data.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

// Subscribe to the current user's own access request status
export function subscribeMyAccessRequest(
  uid: string,
  onChange: (request: AccessRequestRecord | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `access_requests/${uid}`;
  return onSnapshot(
    doc(db, 'access_requests', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data();
      onChange({
        id: snapshot.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        companyName: data.companyName || '',
        status: data.status,
        createdAt: timestampToIso(data.createdAt),
        updatedAt: timestampToIso(data.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function submitAccessRequest(params: {
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
}): Promise<void> {
  const normalizedEmail = params.email.trim().toLowerCase().slice(0, 120);
  const cleanName = (params.displayName || normalizedEmail).trim().slice(0, 100);
  const cleanCompany = (params.companyName || '').trim().slice(0, 100);
  const path = `access_requests/${params.uid}`;

  try {
    const ref = doc(db, 'access_requests', params.uid);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        displayName: cleanName,
        companyName: cleanCompany,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: params.uid,
        email: normalizedEmail,
        displayName: cleanName,
        companyName: cleanCompany,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Admin-only listeners and mutations
export function subscribeAllAllowedUsers(
  onChange: (users: AllowedUserRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'allowed_users';
  const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: AllowedUserRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          email: data.email,
          companyName: data.companyName || '',
          notes: data.notes || '',
          status: data.status,
          addedBy: data.addedBy,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      onChange(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeAllAccessRequests(
  onChange: (requests: AccessRequestRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'access_requests';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: AccessRequestRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          companyName: data.companyName || '',
          status: data.status,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      onChange(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function grantUserAccess(params: {
  email: string;
  companyName?: string;
  notes?: string;
  adminEmail: string;
}): Promise<void> {
  const normalized = params.email.trim().toLowerCase().slice(0, 120);
  const docId = emailToHexId(normalized);
  const path = `allowed_users/${docId}`;
  const cleanCompany = (params.companyName || '').trim().slice(0, 100);
  const cleanNotes = (params.notes || '').trim().slice(0, 240);
  const cleanAdmin = params.adminEmail.trim().toLowerCase().slice(0, 120);

  try {
    const ref = doc(db, 'allowed_users', docId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        status: 'active',
        companyName: cleanCompany,
        notes: cleanNotes,
        addedBy: cleanAdmin,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        email: normalized,
        companyName: cleanCompany,
        notes: cleanNotes,
        status: 'active',
        addedBy: cleanAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function setAllowedUserStatus(params: {
  id: string;
  status: 'active' | 'revoked';
  adminEmail: string;
}): Promise<void> {
  const path = `allowed_users/${params.id}`;
  try {
    await updateDoc(doc(db, 'allowed_users', params.id), {
      status: params.status,
      addedBy: params.adminEmail.trim().toLowerCase().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeAllowedUser(id: string): Promise<void> {
  const path = `allowed_users/${id}`;
  try {
    await deleteDoc(doc(db, 'allowed_users', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function approveAccessRequest(params: {
  request: AccessRequestRecord;
  adminEmail: string;
}): Promise<void> {
  await grantUserAccess({
    email: params.request.email,
    companyName: params.request.companyName,
    notes: `Approved request from ${params.request.displayName}`,
    adminEmail: params.adminEmail,
  });

  const reqPath = `access_requests/${params.request.id}`;
  try {
    await updateDoc(doc(db, 'access_requests', params.request.id), {
      status: 'approved',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, reqPath);
  }
}

export async function dismissAccessRequest(requestId: string): Promise<void> {
  const reqPath = `access_requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'access_requests', requestId), {
      status: 'dismissed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, reqPath);
  }
}
