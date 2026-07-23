import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },

  email: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },

  password: { 
    type: String, 
    default: null
  },

  googleId: {
    type: String,
    default: null,
    index: true
  },

  authProvider: {
    type: String,
    enum: ['local', 'google', 'local_google'],
    default: 'local'
  },

  role: {
    type: String, 
    enum: ['admin', 'staff', 'citizen'], 
    default: 'citizen'  
  },
    
  state: { 
    type: String, 
    required: function() { return this.role === 'staff' || this.role=='admin'; }  
  },

  district: { 
    type: String, 
    required: function() { return this.role === 'staff' || this.role=='admin'; }  
  },

  department: {
    type: String,
    enum: ['roads', 'power', 'sanitation', 'water', 'other'],
    required: function() { return this.role === 'staff'; }
  },

  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },

  approvalReviewedAt: {
    type: Date,
    default: null
  },

  approvalReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null
  },

  verifyOtp: {
    type: String,
    default: ""
  },

  verifyOtpExpireAt: {
    type: Number,
    default: 0
  },

  // Number of consecutive wrong email-verification OTP guesses. Reset when a
  // new OTP is issued or on success; used to lock out brute-force attempts.
  verifyOtpAttempts: {
    type: Number,
    default: 0
  },

  // Login OTP is a separate concern from email verification, so it gets its
  // own fields to avoid one flow clobbering the other's OTP/expiry/attempts.
  loginOtp: {
    type: String,
    default: ""
  },

  loginOtpExpireAt: {
    type: Number,
    default: 0
  },

  loginOtpAttempts: {
    type: Number,
    default: 0
  },

  resetOtp: {
    type: String,
    default: ""
  },

  resetOtpExpireAt: {
    type: Number,
    default: 0
  },

  // Number of consecutive wrong password-reset OTP guesses.
  resetOtpAttempts: {
    type: Number,
    default: 0
  },

  isAccountVerified: {
    type: Boolean,
    default: false
  },

  refreshToken: {
    type: String,
    default: null,
    index: true
  },
  
}, { timestamps: true });

// Auto-expire accounts that never completed email verification, so abandoned
// signups don't squat the unique email forever. The partial filter means only
// unverified accounts are ever expired — verified users are never touched.
userSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 24 * 60 * 60,
    partialFilterExpression: { isAccountVerified: false }
  }
);

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const userModel = mongoose.model('user', userSchema);

export default userModel;