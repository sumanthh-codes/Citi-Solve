import rateLimit from 'express-rate-limit';
import { sendTooManyLoginAttemptsEmail } from '../utils/loginAlert.js';

// NOTE: express-rate-limit uses an in-memory store by default, which does NOT
// persist across serverless (Vercel) lambda instances — so these IP limiters
// are a best-effort backstop only. The per-account OTP attempt counter in the
// user document (authController) is the serverless-safe brute-force defense.
const baseOptions = {
    standardHeaders: true,
    legacyHeaders: false
};

export const loginLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000,
    max: 10,
    handler: async (req, res) => {

        if (req.body?.email) {
            await sendTooManyLoginAttemptsEmail({
                email: req.body.email,
                name: 'User',
                ip: req.ip
            });
        }

        res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try later.'
        });
    }
});


export const otpLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many OTP requests. Please try again after 1 hour.'
    }
});

export const passwordResetLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many password reset attempts. Please try again later.'
    }
});

export const geocodeLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        error: 'Too many location requests. Please try again later.'
    }
});

export const complaintSubmitLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many complaint submissions. Please try again later.'
    }
});

export const supportSubmitLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many support messages. Please try again later.'
    }
});