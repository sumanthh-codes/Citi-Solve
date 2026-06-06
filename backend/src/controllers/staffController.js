
import mongoose from 'mongoose';
import complaintModel from '../models/complaintModel.js';
import userModel from '../models/usermodel.js';


export const getStaffDashboard = async (req, res) => {
  try {
    const staffId = req.userId;

    const [
      totalAssigned,
      assigned,
      inProgress,
      resolved,
      rejected
    ] = await Promise.all([
      complaintModel.countDocuments({ assignedTo: staffId }),
      complaintModel.countDocuments({ assignedTo: staffId, status: 'assigned' }),
      complaintModel.countDocuments({ assignedTo: staffId, status: 'in-progress' }),
      complaintModel.countDocuments({ assignedTo: staffId, status: 'resolved' }),
      complaintModel.countDocuments({ assignedTo: staffId, status: 'rejected' })
    ]);

    res.json({
      success: true,
      dashboard: {
        total: totalAssigned,       
        assigned,
        inProgress,
        resolved,
        rejected,
        active: assigned + inProgress
      }
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getMyAssignedComplaints = async (req, res) => {
  try {
    const staffId = req.userId;
    const {
      status = 'all',
      search,
      page = 1,
      limit = 10,
      sortBy = 'newest'
    } = req.query;

    const query = { assignedTo: staffId };

    if (status !== 'all') {
      const validStatuses = ['assigned', 'in-progress', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be: all, ${validStatuses.join(', ')}`
        });
      }
      query.status = status;
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
    const sortOption = sortBy === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const [complaints, total] = await Promise.all([
      complaintModel
        .find(query)
        .populate('citizen', 'name email')
        .populate('assignedBy', 'name email')
        .sort(sortOption)
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
    console.error('Get assigned complaints error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const advancedSearch = async (req, res) => {
  try {
    const staffId = req.userId;
    const {
      dateFrom,
      dateTo,
      status = 'all',
      keyword,
      page = 1,
      limit = 10
    } = req.body;

    const query = { assignedTo: staffId };

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    if (status !== 'all') {
      const validStatuses = ['assigned', 'in-progress', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be: all, ${validStatuses.join(', ')}`
        });
      }
      query.status = status;
    }

    if (keyword && keyword.trim()) {
      const sanitizedSearch = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    console.error('Advanced search error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getMyComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.userId;
    const complaint = await complaintModel
      .findOne({ 
        _id: id,
        assignedTo: staffId
      })
      .populate('citizen', 'name email phone state district')
      .populate('assignedBy', 'name email')
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found or not assigned to you'
      });
    }

    res.json({ success: true, complaint });
    
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.userId;
    const { status, comment, resolutionNote } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['in-progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: in-progress, resolved, or rejected'
      });
    }

    const complaint = await complaintModel.findOne({ 
      _id: id, 
      assignedTo: staffId 
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found or not assigned to you'
      });
    }

    if (['resolved', 'rejected'].includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify a resolved or rejected complaint'
      });
    }
    if (status === 'resolved') {
      if (!resolutionNote || !resolutionNote.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Resolution note is required when marking complaint as resolved'
        });
      }
      
      if (resolutionNote.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Resolution note must be at least 10 characters'
        });
      }
    }
    if (status === 'in-progress' && !complaint.startedAt) {
      complaint.startedAt = new Date();
    }

    complaint.status = status;
    
    if (comment && comment.trim()) {
      if (comment.trim().length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Comment cannot exceed 500 characters'
        });
      }
      complaint.comment = comment.trim();
    }

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      if (resolutionNote && resolutionNote.trim()) {
        if (resolutionNote.trim().length > 1000) {
          return res.status(400).json({
            success: false,
            error: 'Resolution note cannot exceed 1000 characters'
          });
        }
        complaint.resolutionNote = resolutionNote.trim();
      }
    }

    await complaint.save();

    const updatedComplaint = await complaintModel
      .findById(id)
      .populate('citizen', 'name email')
      .populate('assignedBy', 'name email');

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint: updatedComplaint
    });
    
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const contactAdmin = async (req, res) => {
  try {
    const staffId = req.userId;
    const { subject, category, message } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({
        success: false,
        error: 'Subject, category, and message are required'
      });
    }

    if (subject.trim().length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Subject cannot exceed 200 characters'
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot exceed 2000 characters'
      });
    }

    const validCategories = ['technical', 'workload', 'escalation', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be: technical, workload, escalation, or other'
      });
    }

    const staff = await userModel
      .findById(staffId)
      .select('name email department state district');

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff profile not found'
      });
    }

    console.log('Admin Contact Request:', {
      from: {
        id: staffId,
        name: staff.name,
        email: staff.email,
        department: staff.department,
        location: `${staff.district}, ${staff.state}`
      },
      subject: subject.trim(),
      category,
      message: message.trim(),
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Your message has been sent to the administrator. They will respond shortly.'
    });
    
  } catch (error) {
    console.error('Contact admin error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const staffId = req.userId;

    const staff = await userModel
      .findById(staffId)
      .select('-password -verifyOtp -resetOtp -refreshToken')
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff profile not found'
      });
    }

    const [assigned, inProgress, resolved, rejected, total] = await Promise.all([
      complaintModel.countDocuments({
        assignedTo: staffId,
        status: 'assigned'
      }),
      complaintModel.countDocuments({
        assignedTo: staffId,
        status: 'in-progress'
      }),
      complaintModel.countDocuments({
        assignedTo: staffId,
        status: 'resolved'
      }),
      complaintModel.countDocuments({
        assignedTo: staffId,
        status: 'rejected'
      }),
      complaintModel.countDocuments({
        assignedTo: staffId
      })
    ]);

    res.json({
      success: true,
      profile: {
        ...staff,
        stats: {
          assigned,
          inProgress,
          resolved,
          rejected,
          total,
          active: assigned + inProgress
        }
      }
    });
    
  } catch (error) {
    console.error('Get staff profile error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};