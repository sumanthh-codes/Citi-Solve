import { body, validationResult } from 'express-validator';

export const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail({ gmail_remove_subaddress: false })
        .withMessage('Invalid email format'),
    body('password')
        .isLength({ min: 5 })
        .withMessage('Password must be at least 5 characters'),
    body('role')
        .isIn(['staff','citizen', 'admin'])
        .withMessage('Invalid role'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];

export const validateSignup = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2-50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail({ gmail_remove_subaddress: false })
        .withMessage('Invalid email'),
    body('password')
        .isLength({ min: 5 })
        .withMessage('Password must be at least 5 characters'),
    body('role')
        .isIn(['staff','citizen'])
        .withMessage('Invalid role'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];