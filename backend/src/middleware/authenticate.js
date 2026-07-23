import jwt from 'jsonwebtoken';
import userModel from '../models/usermodel.js';
import { logger } from '../utils/logger.js';

// Single source of truth for authentication + authorization middleware.
// Previously this logic was copy-pasted across auth.js / citizen.js / staff.js /
// admin.js. It's now decomposed into small, composable guards that each role's
// middleware chains together (see citizen.js / staff.js / admin.js / auth.js).

// Pull the access token from the httpOnly cookie, or a Bearer header fallback.
const extractToken = (req) => {
    if (req.cookies?.accessToken) return req.cookies.accessToken;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
    return null;
};

// Core authentication: verify the JWT, load the user, attach to req.
// Role / verification / approval are enforced by the separate guards below so
// each route composes exactly the checks it needs.
export const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login again'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id).select('-password -refreshToken');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Please login again'
            });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token expired. Please refresh token',
                expired: true
            });
        }
        logger.error('AUTH ERROR:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Restrict to one or more roles (checks the JWT role claim).
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. ${roles.join(' or ')} only.`
        });
    }
    next();
};

// Require a verified email.
export const requireVerified = (req, res, next) => {
    if (!req.user?.isAccountVerified) {
        return res.status(403).json({
            success: false,
            message: 'Please verify your email first',
            needsVerification: true
        });
    }
    next();
};

// Require an approved staff account. Non-staff pass through, since approvalStatus
// defaults to 'approved' for citizens/admins.
export const requireApproved = (req, res, next) => {
    if ((req.user?.approvalStatus || 'approved') !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Your staff registration must be approved before you can access the staff portal.',
            approvalStatus: req.user?.approvalStatus || 'pending'
        });
    }
    next();
};

// Attach the admin's jurisdiction to the request for downstream filtering.
export const attachAdminLocation = (req, res, next) => {
    req.state = req.user.state;
    req.district = req.user.district;
    next();
};
