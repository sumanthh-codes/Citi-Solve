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

  verifyOtp: { 
    type: String, 
    default: "" 
  },
  
  verifyOtpExpireAt: { 
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

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const userModel = mongoose.model('user', userSchema);

export default userModel;