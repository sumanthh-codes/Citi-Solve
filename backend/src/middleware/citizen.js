import { authenticate, requireRole, requireVerified } from './authenticate.js';

// Authenticated + verified citizen.
export const citizenAuth = [authenticate, requireRole('citizen'), requireVerified];
