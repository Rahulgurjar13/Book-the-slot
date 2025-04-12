const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  }, // Stored as plain text as requested
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  lastLogin: { 
    type: Date 
  },
  name: { 
    type: String, 
    trim: true 
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);