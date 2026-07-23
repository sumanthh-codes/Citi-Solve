// ============================================
// routes/complaintRoutes.js (Citizen) - FIXED
// ============================================
import express from 'express';
import mongoose from 'mongoose';
import { 
  submitComplaint, 
  getComplaintById, 
  getMyCitizensComplaints,
  getCitizenAnalytics,
} from '../controllers/complaintController.js';

import { citizenAuth } from '../middleware/citizen.js';
import { upload, validateUploadedImages } from '../middleware/upload.js';
import { complaintSubmitLimiter } from '../middleware/rateLimiter.js';
import { validateComplaintSubmit } from '../middleware/validators.js';

const complaintRouter = express.Router();

// ============================================
// MIDDLEWARE: MongoDB ID Validator
// ============================================
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid complaint ID format',
      error: 'INVALID_MONGODB_ID',
      providedId: id,
      hint: 'MongoDB ID must be a 24-character hexadecimal string'
    });
  }
  
  next();
};

// ============================================
// MIDDLEWARE: Prevent ?id= in query params
// ============================================
const preventQueryId = (req, res, next) => {
  if (req.query.id) {
    return res.status(400).json({
      success: false,
      message: "Invalid route format. Don't use ?id= in the URL",
      hint: "Use /:id instead of ?id=xxx",
      correctExample: req.path.includes('analytics') 
        ? `/api/complaints/${req.query.id}`
        : req.path.includes('my-complaints')
        ? `/api/complaints/${req.query.id}`
        : `/api/complaints/${req.query.id}`
    });
  }
  next();
};

// Apply authentication to all routes
complaintRouter.use(citizenAuth);

// ============================================
// COMPLAINT ROUTES
// CRITICAL: Specific routes BEFORE :id routes!
// ============================================

// Analytics - MUST come before /:id
complaintRouter.get('/analytics/all', getCitizenAnalytics);

// Get my complaints - MUST come before /:id
complaintRouter.get('/my-complaints', preventQueryId, getMyCitizensComplaints);

// Submit complaint with image upload
complaintRouter.post(
  '/submit',
  complaintSubmitLimiter,
  upload.array('images', 5),
  validateUploadedImages,
  validateComplaintSubmit,
  submitComplaint
);

// Get single complaint - MUST be LAST
complaintRouter.get('/:id', validateObjectId, getComplaintById);

// ============================================
// 404 HANDLER
// ============================================
complaintRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Complaint route not found",
    requestedPath: req.path,
    method: req.method,
    hint: "Check the API documentation for valid routes"
  });
});

export default complaintRouter;