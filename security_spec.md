# Security Specification — ResumeCollector Access Control

## 1. Data Invariants
1. Only the verified administrator (`dev.ramesh.ghogale@gmail.com` with `email_verified == true`, or a trusted record in `/admins/{uid}`) may create, update, delete, or list all entries in `/allowed_users` and `/access_requests`.
2. Non-admin users may ONLY read (`get` or `list` restricted by `resource.data.email == request.auth.token.email.lower()`) their own `/allowed_users` entry and their own `/access_requests/{request.auth.uid}` entry. They can never enumerate or view other users' emails (PII isolation).
3. Non-admin users can NEVER write to `/allowed_users` or `/admins`, preventing self-authorization or privilege escalation.
4. Non-admin users can only create `/access_requests/{request.auth.uid}` with `status == 'pending'`, `uid == request.auth.uid`, `email == request.auth.token.email.lower()`, and `createdAt == request.time`, `updatedAt == request.time`. Once `status` becomes `'approved'` or `'dismissed'`, non-admins cannot mutate it (terminal state locking).
5. All document IDs (`allowedUserId`, `userId`, `adminId`) must satisfy `isValidId` (`^[a-zA-Z0-9_\\-]+$`, bounded length).
6. All strings enforce explicit `.size()` bounds; all timestamps enforce `request.time`; no unvalidated shadow fields are allowed (`hasOnly` on create + `affectedKeys().hasOnly` + `isValid*` on update).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated read on `/allowed_users`** (`auth: null`) -> `PERMISSION_DENIED`.
2. **Non-admin list all `/allowed_users` without matching email filter** -> `PERMISSION_DENIED`.
3. **Non-admin `get` on another user's `/allowed_users/{otherHexId}`** -> `PERMISSION_DENIED`.
4. **Non-admin self-authorization create on `/allowed_users/{ownHexId}`** -> `PERMISSION_DENIED`.
5. **Email spoofing attack (`email: 'dev.ramesh.ghogale@gmail.com'`, `email_verified: false`)** -> `PERMISSION_DENIED`.
6. **Shadow field injection on `/allowed_users` create (`{ ..., isSuperAdmin: true }`)** -> `PERMISSION_DENIED`.
7. **Non-admin creating `/access_requests/{otherUid}` (identity spoofing)** -> `PERMISSION_DENIED`.
8. **Non-admin creating `/access_requests/{ownUid}` with `status: 'approved'` (state shortcutting)** -> `PERMISSION_DENIED`.
9. **Non-admin updating `/access_requests/{ownUid}` to set `status: 'approved'` after dismissal (terminal state lock)** -> `PERMISSION_DENIED`.
10. **Admin creating `/allowed_users/{id}` with forged client timestamp (`createdAt != request.time`)** -> `PERMISSION_DENIED`.
11. **Admin creating `/allowed_users/{1MB_poison_id}` (ID poisoning)** -> `PERMISSION_DENIED`.
12. **Non-admin writing to `/admins/{ownUid}` (privilege escalation)** -> `PERMISSION_DENIED`.
