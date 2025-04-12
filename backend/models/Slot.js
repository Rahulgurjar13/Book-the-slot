const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  date: { 
    type: Date, // Changed to Date type for proper handling
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
  status: { 
    type: String, 
    enum: ['available', 'booked'], 
    default: 'available' 
  },
  bookedBy: {
    name: { type: String, trim: true },
    enrollment: { type: String, trim: true },
    email: { type: String, trim: true },
    bookedAt: { type: Date }
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Helper method to format date as YYYY-MM-DD in UTC
slotSchema.methods.toJSON = function () {
  const slot = this.toObject();
  slot.date = this.date.toISOString().split('T')[0]; // Convert Date to string in YYYY-MM-DD
  return slot;
};

module.exports = mongoose.model('Slot', slotSchema);