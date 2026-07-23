import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import userModel from '../models/usermodel.js';
import transporter from "../config/nodemailer.js";
import { WELCOME_EMAIL_TEMPLATE, EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';
import { sendLoginSuccessEmail } from '../utils/loginAlert.js';
import { logger } from '../utils/logger.js';

const sendWelcomeEmail = async (name, email, role) => {
    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: '🎉 Welcome to CitiSolve!',
        html: WELCOME_EMAIL_TEMPLATE
            .replace("{{name}}", name)
            .replace("{{email}}", email)
            .replace("{{role}}", role)
    };
    await transporter.sendMail(mailOptions);
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Max consecutive wrong OTP guesses before the OTP is invalidated and the user
// must request a fresh one. This is the serverless-safe brute-force defense
// (persisted per-account in MongoDB, unlike the in-memory IP rate limiters).
const MAX_OTP_ATTEMPTS = 5;

const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: '240m' }
    );
};

const generateRefreshToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

const buildUserResponse = (user) => {
    const baseResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAccountVerified: user.isAccountVerified
    };

    if (user.role === 'staff') {
        return {
            ...baseResponse,
            state: user.state,
            district: user.district,
            department: user.department,
            approvalStatus: user.approvalStatus || 'approved'
        };
    }
    if (user.role ==='admin') {
        return {
            ...baseResponse,
            state: user.state,
            district: user.district,
        };
    }

    return baseResponse;
};


const ACCESS_TOKEN_MAX_AGE = 4 * 60 * 60 * 1000;      // 4 hours
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Single source of truth for auth cookie attributes. Every place that sets or
// clears an auth cookie MUST use this so the attributes match exactly —
// otherwise the browser treats a re-issued cookie as a different cookie (or
// won't send it cross-site). The app is served single-origin (frontend proxies
// /api/* to the backend via a Vercel rewrite in prod / Vite proxy in dev), so
// 'lax' is correct and also gives CSRF protection on cross-site top-level
// navigations. 'secure' is on in prod (HTTPS) and off in dev (http://localhost).
const authCookieOptions = (maxAge) => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        ...(isProduction && process.env.COOKIE_DOMAIN
            ? { domain: process.env.COOKIE_DOMAIN }
            : {}),
        ...(maxAge != null ? { maxAge } : {})
    };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, authCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', refreshToken, authCookieOptions(REFRESH_TOKEN_MAX_AGE));
};

const clearAuthCookies = (res) => {
    // clearCookie only removes the cookie if the attributes (path/domain/
    // sameSite/secure) match those it was set with, so reuse the same options.
    res.clearCookie('accessToken', authCookieOptions());
    res.clearCookie('refreshToken', authCookieOptions());
};


export const sendSignupOtp = async (req, res) => {
    const { email, password, role, name, state, district, department } = req.body;

    if (!email || !password || !role || !name) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    if (role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin accounts cannot be created through public signup'
        });
    }

    if (role === 'staff' && (!state || !district || !department)) {
        return res.status(400).json({
            success: false,
            message: 'State, district, and department are required for staff'
        });
    }

    try {
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            if (existingUser.isAccountVerified) {
                return res.status(409).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }
            // An unverified account is squatting this email (someone started
            // signup but never verified). Remove the stale record so this fresh
            // signup can proceed instead of being blocked forever.
            await userModel.deleteOne({ _id: existingUser._id });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(otp, 10);
        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            name,
            email,
            password: hashedPassword,
            role,
            isAccountVerified: false,
            verifyOtp: hashedOtp,
            verifyOtpExpireAt: Date.now() + 15 * 60 * 1000
        };

        if (role === 'staff') {
            userData.state = state;
            userData.district = district;
            userData.department = department;
            userData.approvalStatus = 'pending';
        }
        if(role==='admin'){
            userData.state = state;
            userData.district = district;
        }

        const tempUser = new userModel(userData);
        await tempUser.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: '🔐 Verify Your CitiSolve Account',
            html: EMAIL_VERIFY_TEMPLATE
                .replace("{{otp}}", otp)
                .replace("{{name}}", name)
                .replace("{{email}}", email)
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            success: true,
            message: 'OTP sent to your email',
            tempUserId: tempUser._id
        });

    } catch (error) {
        logger.error('Error in sendSignupOtp:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

export const verifySignupOtp = async (req, res) => {
    const { tempUserId, otp } = req.body;

    if (!tempUserId || !otp) {
        return res.status(400).json({
            success: false,
            message: 'User ID and OTP are required'
        });
    }

    try {
        const user = await userModel.findById(tempUserId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isAccountVerified) {
            return res.status(409).json({
                success: false,
                message: 'Account already Exists and verified'
            });
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new one'
            });
        }

        const isValidOtp = await bcrypt.compare(otp, user.verifyOtp);

        if (!isValidOtp) {
            user.verifyOtpAttempts = (user.verifyOtpAttempts || 0) + 1;

            if (user.verifyOtpAttempts >= MAX_OTP_ATTEMPTS) {
                user.verifyOtp = '';
                user.verifyOtpExpireAt = 0;
                user.verifyOtpAttempts = 0;
                await user.save();
                return res.status(429).json({
                    success: false,
                    message: 'Too many incorrect attempts. Please request a new OTP.'
                });
            }

            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
                attemptsRemaining: MAX_OTP_ATTEMPTS - user.verifyOtpAttempts
            });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;
        user.verifyOtpAttempts = 0;

        if (user.role === 'staff') {
            await user.save();
            clearAuthCookies(res);

            return res.json({
                success: true,
                requiresApproval: true,
                message: 'Your staff registration request has been submitted. You can log in after your district admin approves it.',
                user: buildUserResponse(user)
            });
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);

        user.refreshToken = refreshToken;
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        await sendWelcomeEmail(user.name, user.email, user.role);

        const response = {
            success: true,
            message: 'Account verified successfully',
            user: buildUserResponse(user)
        };

        return res.json(response);

    } catch (error) {
        logger.error('Error in verifySignupOtp:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

export const resendSignupOtp = async (req, res) => {
    const { tempUserId } = req.body;

    if (!tempUserId) {
        return res.status(400).json({
            success: false,
            message: 'User ID is required'
        });
    }

    try {
        const user = await userModel.findById(tempUserId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isAccountVerified) {
            return res.status(409).json({
                success: false,
                message: 'Account already verified'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(otp, 10);

        user.verifyOtp = hashedOtp;
        user.verifyOtpExpireAt = Date.now() + 15 * 60 * 1000;
        user.verifyOtpAttempts = 0;
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: '🔐 Verify Your CitiSolve Account',
            html: EMAIL_VERIFY_TEMPLATE
                .replace("{{otp}}", otp)
                .replace("{{name}}", user.name)
                .replace("{{email}}", user.email)
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            success: true,
            message: 'New OTP sent to your email'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

export const sendLoginOtp = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
        return res.status(400).json({
            success: false,
            message: 'Email, password and role are required'
        });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user || user.role !== role) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.isAccountVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your account is not verified. Please check your email for the verification OTP.',
                needsVerification: true
            });
        }

        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: 'This account uses Google Sign-In. Please continue with Google or reset your password.'
            });
        }

        if (user.role === 'staff' && (user.approvalStatus || 'approved') !== 'approved') {
            const message = user.approvalStatus === 'rejected'
                ? 'Your staff registration request was rejected. Please contact your district administrator.'
                : 'Your staff registration request is pending administrator approval.';
            return res.status(403).json({
                success: false,
                message,
                approvalStatus: user.approvalStatus || 'pending'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        const hashedOtp = await bcrypt.hash(otp, 10);

        user.loginOtp = hashedOtp;
        user.loginOtpExpireAt = Date.now() + 10 * 60 * 1000;
        user.loginOtpAttempts = 0;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: '🔐 Login OTP – CitiSolve',
            html: EMAIL_VERIFY_TEMPLATE
                .replace('{{otp}}', otp)
                .replace('{{name}}', user.name)
                .replace('{{email}}', user.email)
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            success: true,
            message: 'Login OTP sent to your email',
            userId: user._id
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            return res.status(500).json({
                success: false,
                message: 'Google Sign-In is not configured'
            });
        }

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Google credential is required'
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: clientId
        });

        const payload = ticket.getPayload();
        const email = payload?.email?.toLowerCase();
        const name = payload?.name || email?.split('@')[0] || 'Citizen';
        const googleId = payload?.sub;

        if (!email || !googleId || !payload.email_verified) {
            return res.status(401).json({
                success: false,
                message: 'Google account could not be verified'
            });
        }

        let user = await userModel.findOne({ email });

        if (user && user.role !== 'citizen') {
            return res.status(403).json({
                success: false,
                message: 'Please use normal login for staff or admin accounts'
            });
        }

        if (!user) {
            user = await userModel.create({
                name,
                email,
                googleId,
                authProvider: 'google',
                role: 'citizen',
                isAccountVerified: true
            });
        } else {
            user.googleId = user.googleId || googleId;
            user.authProvider = user.password ? 'local_google' : 'google';
            user.isAccountVerified = true;
            if (!user.name) user.name = name;
            await user.save();
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);

        user.refreshToken = refreshToken;
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        return res.json({
            success: true,
            message: 'Google login successful',
            user: buildUserResponse(user)
        });
    } catch (error) {
        logger.error('Google login error:', error);
        return res.status(401).json({
            success: false,
            message: 'Google login failed'
        });
    }
};

export const verifyLoginOtp = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({
            success: false,
            message: 'User ID and OTP are required'
        });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role === 'staff' && (user.approvalStatus || 'approved') !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your staff account is not approved for login.',
                approvalStatus: user.approvalStatus || 'pending'
            });
        }

        if (!user.loginOtp || user.loginOtpExpireAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });
        }

        const isValidOtp = await bcrypt.compare(otp, user.loginOtp);

        if (!isValidOtp) {
            user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;

            if (user.loginOtpAttempts >= MAX_OTP_ATTEMPTS) {
                user.loginOtp = "";
                user.loginOtpExpireAt = 0;
                user.loginOtpAttempts = 0;
                await user.save();
                return res.status(429).json({
                    success: false,
                    message: 'Too many incorrect attempts. Please request a new OTP.'
                });
            }

            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
                attemptsRemaining: MAX_OTP_ATTEMPTS - user.loginOtpAttempts
            });
        }


        user.loginOtp = "";
        user.loginOtpExpireAt = 0;
        user.loginOtpAttempts = 0;
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);

        user.refreshToken = refreshToken;
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        const response = {
            success: true,
            message: 'Login successful',
            user: buildUserResponse(user)
        };

        await sendLoginSuccessEmail({
            email: user.email,
            name: user.name,
            ip: req.ip
        });

        return res.json(response);

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

export const resendLoginOtp = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'User ID is required'
        });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isAccountVerified) {
            return res.status(403).json({
                success: false,
                message: 'Account not verified'
            });
        }

        if (user.role === 'staff' && (user.approvalStatus || 'approved') !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your staff account is not approved for login.',
                approvalStatus: user.approvalStatus || 'pending'
            });
        }

        if (user.loginOtpExpireAt && user.loginOtpExpireAt > Date.now() + 9 * 60 * 1000) {
            return res.status(429).json({
                success: false,
                message: 'Please wait before requesting a new OTP'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(otp, 10);

        user.loginOtp = hashedOtp;
        user.loginOtpExpireAt = Date.now() + 10 * 60 * 1000;
        user.loginOtpAttempts = 0;
        await user.save();

        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: '🔐 Login OTP – CitiSolve',
            html: EMAIL_VERIFY_TEMPLATE
                .replace('{{otp}}', otp)
                .replace('{{name}}', user.name)
                .replace('{{email}}', user.email)
        });

        return res.json({
            success: true,
            message: 'New login OTP sent to email'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};


export const logout = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - No user ID'
            });
        }
        
        await userModel.findByIdAndUpdate(req.userId, { refreshToken: null });
        clearAuthCookies(res);
        
        return res.json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (e) {
        return res.status(500).json({ 
            success: false, 
            message: 'Something went wrong. Please try again later.' 
        });
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await userModel.findById(decoded.id);
        
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        if (user.role === 'staff' && (user.approvalStatus || 'approved') !== 'approved') {
            user.refreshToken = null;
            await user.save();
            clearAuthCookies(res);
            return res.status(403).json({
                success: false,
                message: 'Your staff account is not approved for access.'
            });
        }

        const newAccessToken = generateAccessToken(user._id, user.role);

        res.cookie('accessToken', newAccessToken, authCookieOptions(ACCESS_TOKEN_MAX_AGE));

        res.json({
            success: true,
            message: 'Access token refreshed'
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Refresh token expired. Please login again'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

export const sendResetOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({
                success: true,
                message: 'If this email is registered, you will receive an OTP shortly. Didn\'t get it? Double-check your email address and try again.'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(otp, 10);

        user.resetOtp = hashedOtp;
        user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
        user.resetOtpAttempts = 0;
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "🔑 Reset Your CitiSolve Password",
            html: PASSWORD_RESET_TEMPLATE
                .replace("{{otp}}", otp)
                .replace("{{name}}", user.name)
                .replace("{{email}}", user.email)
        };

        await transporter.sendMail(mailOptions);

        return res.json({
            success: true,
            message: "Reset OTP sent to email",
        });
    } catch (e) {
        return res.status(500).json({ 
            success: false, 
            message: 'Something went wrong. Please try again later.' 
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid or expired OTP" 
            });
        }

        if (!user.resetOtp || user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        const isValidOtp = await bcrypt.compare(otp, user.resetOtp);

        if (!isValidOtp) {
            user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;

            if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
                user.resetOtp = "";
                user.resetOtpExpireAt = 0;
                user.resetOtpAttempts = 0;
                await user.save();
                return res.status(429).json({
                    success: false,
                    message: "Too many incorrect attempts. Please request a new OTP.",
                });
            }

            await user.save();
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
                attemptsRemaining: MAX_OTP_ATTEMPTS - user.resetOtpAttempts
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
        user.resetOtpAttempts = 0;
        await user.save();

        return res.json({
            success: true,
            message: "Password reset successful",
        });
    } catch (e) {
        return res.status(500).json({ 
            success: false, 
            message: 'Something went wrong. Please try again later.' 
        });
    }
};

export const isAuthenticated = async (req, res) => {
    try {
        return res.json({ 
            success: true,
            user: buildUserResponse(req.user)
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Something went wrong. Please try again later.' 
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - No user ID'
            });
        }
        
        const user = await userModel.findById(req.userId)
            .select('-password -refreshToken');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            user: buildUserResponse(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};