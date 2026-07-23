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

// Complaint responses use an `error` key (not `message`), so this handler
// matches that shape. Runs after multer has populated req.body for the
// multipart/form-data submit request.
const sendFirstError = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    next();
};

export const validateComplaintSubmit = [
    body('title')
        .trim().notEmpty().withMessage('Title is required')
        .bail().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('description')
        .trim().notEmpty().withMessage('Description is required')
        .bail().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
    body('category')
        .notEmpty().withMessage('Category is required')
        .bail().isIn(['roads', 'power', 'sanitation', 'water', 'other'])
        .withMessage('Invalid category. Must be one of: roads, power, sanitation, water, other'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('district').trim().notEmpty().withMessage('District is required'),
    body('pincode')
        .trim().notEmpty().withMessage('Pincode is required')
        .bail().matches(/^\d{6}$/).withMessage('Pincode must be exactly 6 digits'),
    body('landmark')
        .optional({ checkFalsy: true }).trim()
        .isLength({ max: 200 }).withMessage('Landmark cannot exceed 200 characters'),
    body('comment')
        .optional({ checkFalsy: true }).trim()
        .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
    sendFirstError
];