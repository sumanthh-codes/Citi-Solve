import jwt from 'jsonwebtoken';
import userModel from '../models/usermodel.js';
export const staffAuth = async (req, res, next) => {
    try {
        let token = req.cookies.accessToken;
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); 
            }
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login again'
            });
        }


        const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
          if (decoded.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Staff only.'
            });
        }
        
        const user = await userModel.findById(decoded.id).select('-password -refreshToken');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Please login again'
            });
        }
        
        if (!user.isAccountVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first',
                needsVerification: true
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
        
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};