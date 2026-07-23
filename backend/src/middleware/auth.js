import { authenticate, requireApproved, requireRole } from './authenticate.js';

// Session endpoints (logout / is-authenticated / profile): must be authenticated,
// and (for staff) approved — but email verification is NOT required, so users can
// still reach these while unverified.
export const verifyToken = [authenticate, requireApproved];

// Re-exported for convenience; the canonical definition lives in authenticate.js.
export { requireRole };
