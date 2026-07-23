import { authenticate, requireRole, requireVerified, attachAdminLocation } from './authenticate.js';

// Authenticated + verified admin, with jurisdiction (state/district) on req.
export const adminAuth = [authenticate, requireRole('admin'), requireVerified, attachAdminLocation];
