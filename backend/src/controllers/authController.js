import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import userModel from '../models/usermodel.js';
import transporter from "../config/nodemailer.js";
import { WELCOME_EMAIL_TEMPLATE, EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';
import { sendLoginSuccessEmail } from '../utils/loginAlert.js';

const sendWelcomeEmail = async (name, email, role) => {
    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: '🎉 Welcome to The Caravan Chronicle!',
        html: WELCOME_EMAIL_TEMPLATE
            .replace("{{name}}", name)
            .replace("{{email}}", email)
            .replace("{{role}}", role)
    };
    await transporter.sendMail(mailOptions);
};

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
            department: user.department
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


const setTokenCookies = (res, accessToken, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const commonOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
        domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
    };
    
    res.cookie('accessToken', accessToken, {
        ...commonOptions,
        maxAge: 4 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
        ...commonOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

const clearAuthCookies = (res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const clearOptions = {
        path: '/',
        domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
    };
    
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
};


export const sendSignupOtp = async (req, res) => {
    const { email, password, role, name, state, district, department } = req.body;

    if (!email || !password || !role || !name) {
        return res.json({
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
        return res.json({
            success: false,
            message: 'State, district, and department are required for staff'
        });
    }
     if (role === 'admin' && (!state || !district)) {
        return res.json({
            success: false,
            message: 'State and district are required for admin'
        });
    }
  

    try {
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            name,
            email,
            password: hashedPassword,
            role,
            isAccountVerified: false,
            verifyOtp: otp,
            verifyOtpExpireAt: Date.now() + 15 * 60 * 1000
        };

        if (role === 'staff') {
            userData.state = state;
            userData.district = district;
            userData.department = department;
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
            subject: '🔐 Verify Your Caravan Chronicle Account',
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
        return res.json({
            success: false,
            message: error.message
        });
    }
};

export const verifySignupOtp = async (req, res) => {
    const { tempUserId, otp } = req.body;

    if (!tempUserId || !otp) {
        return res.json({
            success: false,
            message: 'User ID and OTP are required'
        });
    }

    try {
        const user = await userModel.findById(tempUserId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Account already Exists and verified'
            });
        }

        if (user.verifyOtp !== otp) {
            return res.json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({
                success: false,
                message: 'OTP expired. Please request a new one'
            });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

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

        if (process.env.NODE_ENV !== 'production') {
            response.dev_tokens = {
                accessToken,
                refreshToken,
                note: "⚠️ Tokens in response are for DEVELOPMENT testing only. In production, use cookies."
            };
        }

        return res.json(response);

    } catch (error) {
        return res.json({
            success: false,
            message: error.message
        });
    }
};

export const resendSignupOtp = async (req, res) => {
    const { tempUserId } = req.body;

    if (!tempUserId) {
        return res.json({
            success: false,
            message: 'User ID is required'
        });
    }

    try {
        const user = await userModel.findById(tempUserId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Account already verified'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 15 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: '🔐 Verify Your Caravan Chronicle Account',
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
        return res.json({
            success: false,
            message: error.message
        });
    }
};

export const sendLoginOtp = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.json({
            success: false,
            message: 'Email, password and role are required'
        });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user || user.role !== role) {
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Please verify your account first',
                needsVerification: true,
                tempUserId: user._id
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        const hashedOtp = await bcrypt.hash(otp, 10);

        user.verifyOtp = hashedOtp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: '🔐 Login OTP – Caravan Chronicle',
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
        return res.json({
            success: false,
            message: error.message
        });
    }
};

export const verifyLoginOtp = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.json({
            success: false,
            message: 'User ID and OTP are required'
        });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.loginOtpExpireAt < Date.now()) {
            return res.json({
            success: false,
            message: 'OTP expired'
        });
        }

        if (!user.verifyOtp || user.verifyOtpExpireAt < Date.now()) {
            return res.json({
                success: false,
                message: 'OTP expired'
            });
        }

        const isValidOtp = await bcrypt.compare(otp, user.verifyOtp);

        if (!isValidOtp) {
            return res.json({
                success: false,
                message: 'Invalid OTP'
            });
        }


        user.verifyOtp = "";
        user.verifyOtpExpireAt = 0;
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

        if (process.env.NODE_ENV !== 'production') {
            response.dev_tokens = {
                accessToken,
                refreshToken,
                note: '⚠️ Dev only — tokens via cookies in production'
            };
        }
        await sendLoginSuccessEmail({
            email: user.email,
            name: user.name,
            ip: req.ip
        });

        return res.json(response);

    } catch (error) {
        return res.json({
            success: false,
            message: error.message
        });
    }
};

export const resendLoginOtp = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.json({
            success: false,
            message: 'User ID is required'
        });
    }

    try {
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isAccountVerified) {
            return res.json({
                success: false,
                message: 'Account not verified'
            });
        }

        if (
            user.loginOtpExpireAt &&
            user.loginOtpExpireAt > Date.now() - 60 * 1000
        ) {
            return res.json({
                success: false,
                message: 'Please wait before requesting a new OTP'
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hashedOtp = await bcrypt.hash(otp, 10);

        user.loginOtp = hashedOtp;
        user.loginOtpExpireAt = Date.now() + 10 * 60 * 1000;
        await user.save();

        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: '🔐 Login OTP – Caravan Chronicle',
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
        return res.json({
            success: false,
            message: error.message
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
        return res.json({ 
            success: false, 
            message: e.message 
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

        const newAccessToken = generateAccessToken(user._id, user.role);

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/',
            domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
            maxAge: 4 * 60 * 60 * 1000
        });

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
                success: false, 
                message: "User not found" 
            });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "🔑 Reset Your Caravan Chronicle Password",
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
        return res.json({ 
            success: false, 
            message: e.message 
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ 
                success: false, 
                message: "User not found" 
            });
        }

        if (user.resetOtp !== otp || user.resetOtpExpireAt < Date.now()) {
            return res.json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
        await user.save();

        return res.json({
            success: true,
            message: "Password reset successful",
        });
    } catch (e) {
        return res.json({ 
            success: false, 
            message: e.message 
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
        res.json({ 
            success: false, 
            message: error.message 
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
            message: error.message
        });
    }
};