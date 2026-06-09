
import express from 'express';
import mongoose from 'mongoose';
import { 
  getStaffDashboard, 
  getMyAssignedComplaints, 
  getMyComplaintById,
  updateComplaintStatus,
  getMyProfile,
  advancedSearch,
  contactAdmin
} from '../controllers/staffController.js';
import { staffAuth } from '../middleware/staff.js';


const staffRouter = express.Router();
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'INVALID_MONGODB_ID',
      providedId: id,
      hint: 'MongoDB ID must be a 24-character hexadecimal string'
    });
  }
  
  next();
};

const preventQueryId = (req, res, next) => {
  if (req.query.id) {
    return res.status(400).json({
      success: false,
      message: "Invalid route format. Don't use ?id= in the URL",
      hint: "Use /complaints/:id instead of /complaints?id=xxx",
      correctExample: `/api/staff/complaints/${req.query.id}`
    });
  }
  next();
};

staffRouter.use(staffAuth);
staffRouter.get('/dashboard', getStaffDashboard);

staffRouter.get('/profile', getMyProfile);
staffRouter.post('/contact-admin', contactAdmin);

staffRouter.post('/complaints/search/advanced', advancedSearch);

staffRouter.get('/complaints', preventQueryId, getMyAssignedComplaints);


staffRouter.put('/complaints/:id/status', validateObjectId, updateComplaintStatus);

staffRouter.get('/complaints/:id', validateObjectId, getMyComplaintById);
staffRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Staff route not found",
    requestedPath: req.path,
    method: req.method,
    hint: "Check the API documentation for valid routes"
  });
});

export default staffRouter;