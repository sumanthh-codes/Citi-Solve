

import mongoose from 'mongoose';
import complaintModel from '../models/complaintModel.js';
import userModel from '../models/usermodel.js';


export const getAdminDashboard = async (req, res) => {
  try {
    const { state, district } = req.user; 

    const [
      totalComplaints,
      pendingComplaints,
      assignedComplaints,
      inProgressComplaints,
      resolvedComplaints,
      rejectedComplaints,
      totalStaff,
      totalDepartments
    ] = await Promise.all([
      complaintModel.countDocuments({ state, district }),
      complaintModel.countDocuments({ state, district, status: 'pending' }),
      complaintModel.countDocuments({ state, district, status: 'assigned' }),
      complaintModel.countDocuments({ state, district, status: 'in-progress' }),
      complaintModel.countDocuments({ state, district, status: 'resolved' }),
      complaintModel.countDocuments({ state, district, status: 'rejected' }),
      userModel.countDocuments({ role: 'staff', state, district }),
      userModel.distinct('department', { role: 'staff', state, district }).then(arr => arr.length)
    ]);

    res.json({
      success: true,
      dashboard: {
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          assigned: assignedComplaints,
          inProgress: inProgressComplaints,
          resolved: resolvedComplaints,
          rejected: rejectedComplaints
        },
        users: {
          staff: totalStaff,
          departments: totalDepartments
        }
      }
    });
  } catch (error) {
    console.error('District admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getDepartmentWorkload = async (req, res) => {
  try {
    const { state, district } = req.user;

    const workload = await complaintModel.aggregate([
      { $match: { state, district } }, 
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          assigned: {
            $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { dept: '$_id', districtState: state, districtName: district },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$role', 'staff'] },
                    { $eq: ['$state', '$$districtState'] },
                    { $eq: ['$district', '$$districtName'] },
                    { $eq: ['$department', '$$dept'] }
                  ]
                }
              }
            }
          ],
          as: 'staff'
        }
      },
      {
        $project: {
          department: '$_id',
          total: 1,
          pending: 1,
          assigned: 1,
          inProgress: 1,
          resolved: 1,
          rejected: 1,
          staffCount: { $size: '$staff' },
          resolutionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      workload
    });
  } catch (error) {
    console.error('Department workload error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getAllComplaints = async (req, res) => {
 
  try {
    const { state, district } = req.user; 

    const {
      status = 'all',
      category = 'all',
      search,
      page = 1,
      limit = 10
    } = req.query;

    const query = { state, district };

    if (status !== 'all') {
      const validStatuses = ['pending', 'assigned', 'in-progress', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be: all, ${validStatuses.join(', ')}`
        });
      }
      query.status = status;
    }

    if (category !== 'all') {
      const validCategories = ['roads', 'power', 'sanitation', 'water', 'other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be: all, ${validCategories.join(', ')}`
        });
      }
      query.category = category;
    }

    if (search && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { landmark: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [complaints, total] = await Promise.all([
      complaintModel
        .find(query)
        .populate('citizen', 'name email')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      complaintModel.countDocuments(query)
    ]);

    res.json({
      success: true,
      complaints,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalComplaints: total
      }
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { state, district } = req.user;
    const { id } = req.params;

    const complaint = await complaintModel
      .findOne({ _id: id, state, district }) 
      .populate('citizen', 'name email phone state district')
      .populate('assignedTo', 'name email state district department')
      .populate('assignedBy', 'name email')
      .lean();
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found in your district'
      });
    }

    res.json({ success: true, complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const getAvailableStaffForComplaint = async (req, res) => {
  try {
    const { state, district } = req.user;
    const { id } = req.params;

    const complaint = await complaintModel.findOne({ _id: id, state, district });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found in your district'
      });
    }
    const availableStaff = await userModel
      .find({
        role: 'staff',
        state: state, 
        district: district, 
        department: complaint.category,
        isAccountVerified: true
      })
      .select('name email state district department')
      .lean();

    const staffWithWorkload = await Promise.all(
      availableStaff.map(async (staff) => {
        const [assigned, inProgress, resolved, rejected] = await Promise.all([
          complaintModel.countDocuments({ assignedTo: staff._id, status: 'assigned' }),
          complaintModel.countDocuments({ assignedTo: staff._id, status: 'in-progress' }),
          complaintModel.countDocuments({ assignedTo: staff._id, status: 'resolved' }),
          complaintModel.countDocuments({ assignedTo: staff._id, status: 'rejected' })
        ]);

        return {
          ...staff,
          workload: {
            assigned,
            inProgress,
            resolved,
            rejected,
            active: assigned + inProgress
          }
        };
      })
    );

    res.json({
      success: true,
      staff: staffWithWorkload,
      complaint: {
        state: complaint.state,
        district: complaint.district,
        category: complaint.category
      }
    });
  } catch (error) {
    console.error('Get available staff error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const assignComplaintToStaff = async (req, res) => {
  try {
    const { state, district } = req.user;
    const { id } = req.params;
    const { staffId } = req.body;
    const adminId = req.userId;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        error: 'Staff ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format'
      });
    }

    const complaint = await complaintModel.findOne({ _id: id, state, district });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found in your district'
      });
    }

    if (complaint.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot assign. Complaint is already ${complaint.status}`
      });
    }

    const staff = await userModel.findOne({
      _id: staffId,
      role: 'staff',
      isAccountVerified: true
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found or not verified'
      });
    }
    if (staff.state !== state || staff.district !== district || staff.department !== complaint.category) {
      return res.status(400).json({
        success: false,
        error: 'Staff must be in the same district and correct department',
        details: {
          complaint: { state, district, category: complaint.category },
          staff: { state: staff.state, district: staff.district, department: staff.department }
        }
      });
    }

    complaint.assignedTo = staffId;
    complaint.assignedBy = adminId;
    complaint.assignedAt = new Date();
    complaint.status = 'assigned';

    await complaint.save();

    const updatedComplaint = await complaintModel
      .findById(id)
      .populate('citizen', 'name email')
      .populate('assignedTo', 'name email state district department')
      .populate('assignedBy', 'name email');

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint: updatedComplaint
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getAllStaff = async (req, res) => {
  try {
    const { state, district } = req.user;

    const {
      department = 'all',
      search,
      page = 1,
      limit = 10
    } = req.query;
    const query = { role: 'staff', state, district };
    if (department !== 'all') query.department = department;

    if (search && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [staff, total] = await Promise.all([
      userModel
        .find(query)
        .select('-password -verifyOtp -resetOtp -refreshToken')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      userModel.countDocuments(query)
    ]);

    const staffWithWorkload = await Promise.all(
      staff.map(async (member) => {
        const [assigned, inProgress, resolved, rejected, total] = await Promise.all([
          complaintModel.countDocuments({ assignedTo: member._id, status: 'assigned' }),
          complaintModel.countDocuments({ assignedTo: member._id, status: 'in-progress' }),
          complaintModel.countDocuments({ assignedTo: member._id, status: 'resolved' }),
          complaintModel.countDocuments({ assignedTo: member._id, status: 'rejected' }),
          complaintModel.countDocuments({ assignedTo: member._id })
        ]);

        return {
          ...member,
          workload: {
            assigned,
            inProgress,
            resolved,
            rejected,
            total,
            active: assigned + inProgress
          }
        };
      })
    );

    res.json({
      success: true,
      staff: staffWithWorkload,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalStaff: total
      }
    });
  } catch (error) {
    console.error('Get all staff error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { state, district } = req.user;
    const { id } = req.params;

    const staff = await userModel
      .findOne({ _id: id, role: 'staff', state, district }) 
      .select('-password -verifyOtp -resetOtp -refreshToken')
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found in your district'
      });
    }

    const complaints = await complaintModel
      .find({ assignedTo: id })
      .populate('citizen', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      staff: {
        ...staff,
        recentComplaints: complaints
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 10
    } = req.query;

    const query = { role: 'citizen' };

    if (search && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [users, total] = await Promise.all([
      userModel
        .find(query)
        .select('-password -verifyOtp -resetOtp -refreshToken')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      userModel.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userModel
      .findOne({ _id: id, role: 'citizen' })
      .select('-password -verifyOtp -resetOtp -refreshToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Citizen not found'
      });
    }
    const complaints = await complaintModel
      .find({ citizen: id })
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ 
      success: true, 
      user: {
        ...user,
        complaints 
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await userModel.findOne({ _id: id, role: 'citizen' });
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Citizen not found'
      });
    }

    const deletedComplaints = await complaintModel.deleteMany({ citizen: id });
    await userModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Citizen deleted successfully',
      deletedComplaints: deletedComplaints.deletedCount 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getAllDepartments = async (req, res) => {
  try {
    const { state, district } = req.user;

    const departments = ['roads', 'power', 'sanitation', 'water', 'other'];
    
    const stats = await Promise.all(
      departments.map(async (dept) => {
        const [total, staff, pending, assigned, inProgress, resolved, rejected] = await Promise.all([
          complaintModel.countDocuments({ state, district, category: dept }),
          userModel.countDocuments({ role: 'staff', state, district, department: dept }),
          complaintModel.countDocuments({ state, district, category: dept, status: 'pending' }),
          complaintModel.countDocuments({ state, district, category: dept, status: 'assigned' }),
          complaintModel.countDocuments({ state, district, category: dept, status: 'in-progress' }),
          complaintModel.countDocuments({ state, district, category: dept, status: 'resolved' }),
          complaintModel.countDocuments({ state, district, category: dept, status: 'rejected' })
        ]);

        return {
          name: dept,
          displayName: dept.charAt(0).toUpperCase() + dept.slice(1),
          total,
          staff,
          pending,
          assigned,
          inProgress,
          resolved,
          rejected,
          resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0
        };
      })
    );

    res.json({
      success: true,
      departments: stats
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};