const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  date: { 
    type: Date, // Store as Date for proper handling
    required: true 
  },
  startTime: { 
    type: String, 
    required: true,
    match: /^((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AP]M))$/ // Validate 12-hour format
  },
  endTime: { 
    type: String, 
    required: true,
    match: /^((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AP]M))$/ // Validate 12-hour format
  },
  purpose: { 
    type: String, 
    required: true, 
    trim: true 
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    default: 1 // Default to 1 for backward compatibility
  },
  bookedBy: [{
    name: { type: String, trim: true, required: true },
    enrollment: { type: String, trim: true, required: true },
    email: { 
      type: String, 
      trim: true, 
      required: true,
      match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Please provide a valid email'] // Validate email format
    },
    phone: { 
      type: String, 
      trim: true, 
      required: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please provide a valid phone number (10-15 digits)'] // Basic phone validation
    },
    bookedAt: { type: Date, default: Date.now }
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Helper method to format date as YYYY-MM-DD in UTC and compute status
slotSchema.methods.toJSON = function () {
  const slot = this.toObject();
  slot.date = this.date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
  slot.status = (slot.bookedBy?.length || 0) >= slot.capacity ? 'booked' : 'available'; // Dynamic status
  slot.bookedBy = slot.bookedBy || []; // Ensure bookedBy is always an array
  return slot;
};

module.exports = mongoose.model('Slot', slotSchema);