/**
 * Security Rules Specification Verification Tests (Dirty Dozen)
 * Run with @firebase/rules-unit-testing against Firestore Emulator if configured.
 */

export const DIRTY_DOZEN_CASES = [
  '1. Unauthenticated read on /allowed_users -> PERMISSION_DENIED',
  '2. Non-admin list on /allowed_users without email filter -> PERMISSION_DENIED',
  '3. Non-admin get on another user allowlist doc -> PERMISSION_DENIED',
  '4. Non-admin self-authorization create on /allowed_users -> PERMISSION_DENIED',
  '5. Unverified admin email spoofing (email_verified: false) -> PERMISSION_DENIED',
  '6. Shadow field injection on /allowed_users create -> PERMISSION_DENIED',
  '7. Non-admin creating /access_requests/{otherUid} -> PERMISSION_DENIED',
  '8. Non-admin creating /access_requests with status=approved -> PERMISSION_DENIED',
  '9. Non-admin updating dismissed /access_requests -> PERMISSION_DENIED',
  '10. Forged createdAt timestamp != request.time -> PERMISSION_DENIED',
  '11. Overlength or invalid document ID injection -> PERMISSION_DENIED',
  '12. Non-admin write to /admins -> PERMISSION_DENIED',
] as const;
