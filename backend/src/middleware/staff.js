import { authenticate, requireRole, requireVerified, requireApproved } from './authenticate.js';

// Authenticated + verified + approved staff.
export const staffAuth = [authenticate, requireRole('staff'), requireVerified, requireApproved];
