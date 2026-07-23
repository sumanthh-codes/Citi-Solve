import { logger } from '../utils/logger.js';

// Fail fast on missing critical configuration, and warn on missing optional
// integrations. Called once at startup (server.js) so a misconfigured deploy
// crashes loudly on cold start instead of failing deep inside a request — or,
// worse, running with a missing secret.

// Without these the app cannot function correctly or securely.
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

// Missing any of these only disables the related feature (Google login, AI image
// check, email, CORS origin, image uploads) — so warn, don't crash.
const OPTIONAL = [
    'FRONT_END_URL',
    'GOOGLE_CLIENT_ID',
    'GEMINI_API_KEY',
    'SMTP_USER',
    'SMTP_PASS',
    'SENDER_EMAIL',
    'CLOUDINARY_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

export const validateEnv = () => {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }

    const missingOptional = OPTIONAL.filter((key) => !process.env[key]);
    if (missingOptional.length) {
        logger.warn(
            `Optional env vars not set (related features disabled): ${missingOptional.join(', ')}`
        );
    }
};

export default validateEnv;
