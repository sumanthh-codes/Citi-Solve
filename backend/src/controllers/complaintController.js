
import complaintModel from '../models/complaintModel.js';
import mongoose from 'mongoose';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

const VALID_CATEGORIES = ['roads', 'power', 'sanitation', 'water', 'other'];

const GEMINI_MODEL = 'gemini-2.5-flash';

// =========================
// CATEGORY LABELS FOR AI
// =========================
const CATEGORY_LABELS = {
  roads:      'roads and infrastructure issues showing an actual problem such as potholes, damaged roads, broken footpaths, blocked roads, unsafe construction debris, or road flooding',
  power:      'power and electricity issues showing an actual problem such as broken streetlights, fallen electric poles, exposed wires, sparking equipment, or damaged public electrical infrastructure',
  sanitation: 'sanitation and pollution issues showing an actual problem such as overflowing bins, garbage dumps, sewage overflow, dirty public areas, stagnant dirty water, or visible waste pollution',
  water:      'water supply or water pollution issues showing an actual problem such as burst pipes, leakage, flooding, dirty/stagnant polluted water, contaminated public water, or visible water shortage impact',
  other:      'general civic issues showing an actual public problem or hazard, not a clean normal scene'
};

const CATEGORY_REJECTION_EXAMPLES = {
  roads: 'Reject clean roads, normal streets, vehicles, selfies, buildings, or landscapes where no road damage/blockage/hazard is visible.',
  power: 'Reject normal lights, normal electrical appliances, clean buildings, or scenes where no damaged public electrical issue is visible.',
  sanitation: 'Reject clean places, normal bins, household items, food, selfies, or scenes where no garbage, sewage, dirt, or pollution issue is visible.',
  water: 'Reject clean drinking water, water bottles, glasses of water, clean taps, normal rivers/lakes/pools, or any water image with no leakage, flooding, contamination, shortage, or public issue.',
  other: 'Reject selfies, food, animals, clean scenery, normal objects, or anything that does not show a real civic complaint issue.'
};

// =========================
// GEMINI IMAGE VERIFICATION
// =========================
const verifyImageWithGemini = async (imageBuffer, mimeType, category) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return {
        decision: 'warn',
        matches: true,
        confidence: 50,
        reason: 'AI validation is unavailable because the Gemini API key is missing.'
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const base64Image = imageBuffer.toString('base64');
    const categoryLabel = CATEGORY_LABELS[category] || 'civic issue';

    const prompt = `You are a complaint image verifier for a civic issue reporting platform.

The user selected the complaint category: "${category}" which covers: ${categoryLabel}.

Look at this image and answer ONLY with a JSON object in this exact format (no extra text):
{
  "isCivicIssue": true or false,
  "matchesCategory": true or false,
  "confidence": a number from 0 to 100,
  "reason": "one short sentence explaining why"
}

Rules:
- "isCivicIssue" = true only if the image shows a visible public civic issue, damage, pollution, hazard, leakage, blockage, contamination, or infrastructure problem.
- "isCivicIssue" = false if the image is clean/normal, unrelated, decorative, personal, private indoor content, or does not show a real complaint-worthy public issue.
- "matchesCategory" = true only if the visible civic issue belongs to the selected category.
- "matchesCategory" = false if the image shows a civic issue but it clearly belongs to another category.
- Do not accept an image just because it contains an object related to the category. It must show a complaint-worthy problem.
- Category-specific rejection rule: ${CATEGORY_REJECTION_EXAMPLES[category] || CATEGORY_REJECTION_EXAMPLES.other}
- For the "other" category, any real visible civic issue is acceptable, but clean normal scenes are not acceptable.
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
    const isCivicIssue =
      parsed.isCivicIssue === true ||
      String(parsed.isCivicIssue).trim().toLowerCase() === 'true';
    const matchesCategory =
      parsed.matchesCategory === true ||
      String(parsed.matchesCategory).trim().toLowerCase() === 'true';
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence)));
    const safeConfidence = Number.isFinite(confidence) ? confidence : 50;
    const reason = parsed.reason || 'Gemini returned an unclear validation result.';

    if (!isCivicIssue) {
      return {
        decision: 'block',
        isCivicIssue,
        matchesCategory,
        confidence: safeConfidence,
        reason: reason || 'The image does not show a real civic complaint issue.'
      };
    }

    if (!matchesCategory && safeConfidence >= 70) {
      return {
        decision: 'block',
        isCivicIssue,
        matchesCategory,
        confidence: safeConfidence,
        reason: reason || 'The image shows a civic issue, but it does not match the selected category.'
      };
    }

    if (safeConfidence < 30) {
      return { decision: 'block', isCivicIssue, matchesCategory, confidence: safeConfidence, reason };
    }

    if (!matchesCategory || safeConfidence <= 70) {
      return { decision: 'warn', isCivicIssue, matchesCategory, confidence: safeConfidence, reason };
    }

    return { decision: 'allow', isCivicIssue, matchesCategory, confidence: safeConfidence, reason };
  } catch (err) {
    logger.error('Gemini verification error:', err.message);
    return {
      decision: 'warn',
      matches: true,
      confidence: 50,
      reason: 'AI validation could not be completed. Please make sure the image shows the actual issue.'
    };
  }
};

export const submitComplaint = async (req, res) => {
  const uploadedUrls = [];
  const aiWarnings = [];
  
  try {
    // Field validation (title/description/category/state/district/pincode/
    // landmark/comment) is handled by the validateComplaintSubmit middleware.
    const { title, description, category, state, district, landmark, pincode } = req.body;
    const citizenId = req.userId;

    if (!citizenId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.files && req.files.length > 0) {
      // Work off a single filtered list everywhere below — dropping empty /
      // buffer-less parts — so validation, AI checks, and upload all agree on
      // exactly which files are being processed.
      const files = req.files.filter((f) => f && f.buffer && f.size > 0);

      if (files.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 5 images allowed'
        });
      }

      // Every file must be an image (check all, not just the first).
      for (const file of files) {
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({
            success: false,
            error: 'Only image files are allowed'
          });
        }
      }

      // =========================
      // GEMINI CATEGORY VERIFICATION
      // Verify EVERY uploaded image matches the selected category before we
      // upload anything — otherwise a user could attach one valid image and
      // sneak unrelated ones past the check. Block on the first failure.
      // =========================
      for (const file of files) {
        const aiResult = await verifyImageWithGemini(file.buffer, file.mimetype, category);
        logger.debug('AI verification result:', aiResult);

        if (aiResult.decision === 'block') {
          return res.status(400).json({
            success: false,
            error: `An image does not match the selected category "${category}". ${aiResult.reason} Please upload images that show the actual issue.`,
            aiCheck: { failed: true, confidence: aiResult.confidence, reason: aiResult.reason }
          });
        }

        if (aiResult.decision === 'warn') {
          aiWarnings.push({
            confidence: aiResult.confidence,
            reason: aiResult.reason
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
      warning: aiWarnings[0] || null,
      complaint 
    });
    
  } catch (error) {

    for (const url of uploadedUrls) {
      try {
        await deleteFromCloudinary(url);
      } catch (cleanupError) {
        logger.error('Image cleanup failed:', cleanupError);
      }
    }
    
    logger.error('Submit complaint error:', error);
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
    logger.error('Get complaint error:', error);
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
    logger.error('Get complaints error:', error);
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
    logger.error('Get citizen analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Something went wrong. Please try again later.' 
    });
  }
};