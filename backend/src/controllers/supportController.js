import supportModel from '../models/supportModel.js';
import transporter from "../config/nodemailer.js";

const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const submitSupportMessage = async (req, res) => {
  try {
    const { subject, category, message } = req.body;
    const user = req.user;

    // ✅ Input validation
    if (!subject || !category || !message) {
      return res.status(400).json({ success: false, error: 'Subject, category, and message are required' });
    }
    if (subject.trim().length > 200) {
      return res.status(400).json({ success: false, error: 'Subject cannot exceed 200 characters' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ success: false, error: 'Message cannot exceed 2000 characters' });
    }
    const validCategories = ['Technical Issue', 'Account Problem', 'Complaint Not Assigned', 'Complaint Status Query', 'Feature Request', 'Feedback', 'Workload Concern', 'Escalation', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category selected' });
    }

    const support = await supportModel.create({
      subject: subject.trim(),
      category,
      message: message.trim(),
      sender: user._id,
      senderRole: user.role, 
      status: 'pending'
    });
    const adminEmail = process.env.ADMIN_EMAIL || 'citisolveotp@gmail.com';

  const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: adminEmail,
      subject: `New Support Message: ${escapeHtml(subject)}`,
      html: `
        <h2>New Support Message Received</h2>
        <p><strong>From:</strong> ${escapeHtml(user.name)} (${escapeHtml(user.email)})</p>
        <p><strong>Category:</strong> ${escapeHtml(category)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message)}</p>
        <br>
        <p><em>Reply directly to ${escapeHtml(user.email)} to respond.</em></p>
      `
    };
    await transporter.sendMail(mailOptions);
    
    res.status(201).json({ 
      success: true, 
      message: 'Support message sent successfully. Admin will respond via email.',
      support 
    });
  } catch (error) {
    console.error('Submit support message error:', error);
    res.status(400).json({ success: false, error: 'Unable to send support message. Please try again.' });
  }
};
