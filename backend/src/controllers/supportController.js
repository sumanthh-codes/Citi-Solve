import supportModel from '../models/supportModel.js';
import transporter from "../config/nodemailer.js";
export const submitSupportMessage = async (req, res) => {
  try {
    const { subject, category, message } = req.body;
    const user = req.user;

    const support = await supportModel.create({
      subject,
      category,
      message,
      sender: user._id,
      senderRole: user.role, 
      status: 'pending'
    });
    const adminEmail = 'citisolveotp@gmail.com';
    

  const mailOptions = {
        to: adminEmail,
      subject: `New Support Message: ${subject}`,
      html: `
        <h2>New Support Message Received</h2>
        <p><strong>From:</strong> ${user.name} (${user.email})</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <br>
        <p><em>Reply directly to ${user.email} to respond.</em></p>
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