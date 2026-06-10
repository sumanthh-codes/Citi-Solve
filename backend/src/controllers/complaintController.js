
import complaintModel from '../models/complaintModel.js';
import mongoose from 'mongoose';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const VALID_CATEGORIES = ['roads', 'power', 'sanitation', 'water', 'other'];

// =========================
// CATEGORY LABELS FOR AI
// =========================
const CATEGORY_LABELS = {
  roads:      'roads and infrastructure issues (potholes, damaged roads, broken footpaths, construction debris)',
  power:      'power and electricity issues (broken streetlights, fallen electric poles, exposed wires)',
  sanitation: 'sanitation and garbage issues (overflowing bins, garbage dumps, sewage overflow, dirty areas)',
  water:      'water supply issues (burst pipes, water leakage, flooded roads due to water, water shortage)',
  other:      'general civic issues (any public infrastructure problem)'
};

// =========================
// GEMINI IMAGE VERIFICATION
// =========================
const verifyImageWithGemini = async (imageBuffer, mimeType, category) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const base64Image = imageBuffer.toString('base64');
    const categoryLabel = CATEGORY_LABELS[category] || 'civic issue';

    const prompt = `You are a complaint image verifier for a civic issue reporting platform.

The user selected the complaint category: "${category}" which covers: ${categoryLabel}.

Look at this image and answer ONLY with a JSON object in this exact format (no extra text):
{
  "matches": true or false,
  "confidence": a number from 0 to 100,
  "reason": "one short sentence explaining why"
}

Rules:
- "matches" = true if the image clearly shows a civic/infrastructure problem related to the category
- "matches" = false if the image is completely unrelated (e.g., a selfie, food, animal) 
- For the "other" category, any civic issue image is acceptable
- If the image is unclear or ambiguous, give confidence between 30-60
- Screenshots, photos, downloaded images are all valid — judge only the CONTENT`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } }
    ]);

    const responseText = result.response.text().trim();
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      matches: parsed.matches ?? true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      reason: parsed.reason || ''
    };
  } catch (err) {
    console.error('Gemini verification error:', err.message);
    // On AI failure, allow submission (don't block users due to AI errors)
    return { matches: true, confidence: 50, reason: 'AI check skipped' };
  }
};

export const submitComplaint = async (req, res) => {
  const uploadedUrls = [];
  
  try {
    const { title, description, category, state, district, landmark, pincode,comment } = req.body;
    const citizenId = req.userId;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }
    if (!category) {
      return res.status(400).json({ success: false, error: 'Category is required' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid category. Must be one of: roads, power, sanitation, water, other` 
      });
    }
    if (!state?.trim()) {
      return res.status(400).json({ success: false, error: 'State is required' });
    }
    if (!district?.trim()) {
      return res.status(400).json({ success: false, error: 'District is required' });
    }
    if (!pincode?.trim()) {
      return res.status(400).json({ success: false, error: 'Pincode is required' });
    }
    
    // Validate pincode format
    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pincode must be exactly 6 digits' 
      });
    }
    if (comment && comment.trim().length > 500) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comment cannot exceed 500 characters' 
      });
    }
    
    if (!citizenId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (req.files && req.files.length > 0) {

  const files = (req.files || []).filter(
  f => f && f.buffer && f.size > 0
);

if (files.length > 5) {
  return res.status(400).json({
    success: false,
    error: 'Maximum 5 images allowed'
  });
}

  for (const file of req.files) {
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed'
      });
    }
  }

  // =========================
  // GEMINI CATEGORY VERIFICATION
  // Verify the first image matches the selected category before uploading
  // =========================
  const firstFile = files[0];
  if (firstFile) {
    const aiResult = await verifyImageWithGemini(firstFile.buffer, firstFile.mimetype, category);
    console.log('AI verification result:', aiResult);

    if (!aiResult.matches && aiResult.confidence < 40) {
      return res.status(400).json({
        success: false,
        error: `Image does not match the selected category "${category}". ${aiResult.reason} Please upload an image that shows the actual issue.`,
        aiCheck: { failed: true, confidence: aiResult.confidence, reason: aiResult.reason }
      });
    }
  }

  // Upload all images to Cloudinary
  for (const file of files) {
    const url = await uploadToCloudinary(file.buffer, 'complaints');
    uploadedUrls.push(url);
  }
}

    

    const complaint = await complaintModel.create({
      title: title.trim(),
      description: description.trim(),
      category: category,
      state: state.trim(),
      district: district.trim(),
      landmark: landmark?.trim() || '',
      pincode: pincode.trim(),
      images: uploadedUrls,
      citizen: citizenId,
      status: 'pending'
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Complaint submitted successfully',
      complaint 
    });
    
  } catch (error) {

    for (const url of uploadedUrls) {
      try {
        await deleteFromCloudinary(url);
      } catch (cleanupError) {
        console.error('Image cleanup failed:', cleanupError);
      }
    }
    
    console.error('Submit complaint error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        error: messages.join(', ') 
      });
    }
    
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const citizenId = req.userId;
    
    const complaint = await complaintModel
      .findOne({ _id: id, citizen: citizenId })
      .populate('assignedTo', 'name email state district')
      .populate('citizen', 'name email');
    
    if (!complaint) {
      return res.status(404).json({ 
        success: false, 
        error: 'Complaint not found' 
      });
    }
    
    res.json({ success: true, complaint });
    
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const getMyCitizensComplaints = async (req, res) => {
  try {
    const citizenId = req.userId;
    const { status = 'all', category = 'all', search, page = 1, limit = 10 } = req.query;

    const query = { citizen: citizenId };
    if (status !== 'all') {
      const validStatuses = ['pending', 'assigned', 'in-progress', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: all, ${validStatuses.join(', ')}`
        });
      }
      query.status = status;
    }

    if (category !== 'all') {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: all, ${VALID_CATEGORIES.join(', ')}`
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
        .populate('assignedTo', 'name email state district')
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
    console.error('Get complaints error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again later.' });
  }
};


export const getCitizenAnalytics = async (req, res) => {
  try {
    const citizenId = req.userId;

    if (!citizenId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

 
    const query = { citizen: new mongoose.Types.ObjectId(citizenId) };

    const statusDistribution = await complaintModel.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const categoryBreakdown = await complaintModel.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: '$category', 
          count: { $sum: 1 } 
        } 
      }
    ]);
    console.log('citizenId:', citizenId);
    console.log('Raw statusDistribution:', statusDistribution);
    console.log('Raw categoryBreakdown:', categoryBreakdown);


    const [total, resolved, inProgress, pending, assigned, rejected] = await Promise.all([
      complaintModel.countDocuments(query),
      complaintModel.countDocuments({ ...query, status: 'resolved' }),
      complaintModel.countDocuments({ ...query, status: 'in-progress' }),
      complaintModel.countDocuments({ ...query, status: 'pending' }),
      complaintModel.countDocuments({ ...query, status: 'assigned' }),
      complaintModel.countDocuments({ ...query, status: 'rejected' }),
    ]);


    const allStatuses = ['pending', 'assigned', 'in-progress', 'resolved', 'rejected'];
    const statusMap = {};
    statusDistribution.forEach(item => {
      statusMap[item._id] = item.count;
    });
    const formattedStatus = allStatuses.map(status => ({
      status,
      count: statusMap[status] || 0
    }));

    const allCategories = ['roads', 'power', 'sanitation', 'water', 'other'];
    const categoryMap = {};
    categoryBreakdown.forEach(item => {
      categoryMap[item._id] = item.count;
    });
    const formattedCategory = allCategories.map(category => ({
      category,
      count: categoryMap[category] || 0
    }));

    console.log('Formatted status:', formattedStatus);
    console.log('Formatted category:', formattedCategory);

    res.json({
      success: true,
      analytics: {
        statusDistribution: formattedStatus,
        categoryBreakdown: formattedCategory,
        summary: {
          total,
          resolved,
          inProgress,
          pending,
          assigned,
          rejected
        }
      }
    });

  } catch (error) {
    console.error('Get citizen analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Something went wrong. Please try again later.' 
    });
  }
};