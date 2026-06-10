
import express from 'express';
import mongoose from 'mongoose';
import {
  getAdminDashboard,
  getDepartmentWorkload,
  getAllComplaints,
  getComplaintById,
  getAvailableStaffForComplaint,
  assignComplaintToStaff,
  getAllStaff,
  getStaffById,
  updateStaffApproval,
  getAllDepartments,
  getAllUsers,
  getUserById,
  deleteUser
} from '../controllers/adminController.js';
import { adminAuth} from '../middleware/admin.js'; 

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

const adminRouter = express.Router();
adminRouter.use(adminAuth);
adminRouter.get('/dashboard', getAdminDashboard);
adminRouter.get('/department-workload', getDepartmentWorkload);
adminRouter.get('/complaints',preventQueryId, getAllComplaints);
adminRouter.get('/complaints/:id', validateObjectId, getComplaintById);
adminRouter.get('/complaints/:id/available-staff', validateObjectId, getAvailableStaffForComplaint);
adminRouter.post('/complaints/:id/assign', validateObjectId, assignComplaintToStaff);
adminRouter.get('/staff', preventQueryId, getAllStaff);
adminRouter.get('/staff/:id', validateObjectId, getStaffById);
adminRouter.put('/staff/:id/approval', validateObjectId, updateStaffApproval);
adminRouter.get('/departments',getAllDepartments);
adminRouter.get('/users', preventQueryId,getAllUsers);
adminRouter.get('/users/:id', validateObjectId, getUserById);

adminRouter.delete('/users/:id',validateObjectId, deleteUser);

export default adminRouter;