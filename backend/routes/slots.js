const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');
const Event = require('../models/Event');
const { adminAuth } = require('../middleware/auth');

// Helper function to convert 24-hour time to 12-hour format
const convertTo12Hour = (time24) => {
  const [hours, minutes] = time24.split(':');
  const hourNum = parseInt(hours, 10);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum % 12 || 12; // Convert 0 or 12 to 12
  return `${hour12}:${minutes} ${period}`;
};

// Helper function to normalize date to UTC
const normalizeDate = (dateStr) => {
  const date = new Date(dateStr);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

// GET all slots (public)
router.get('/', async (req, res) => {
  try {
    const slots = await Slot.find().populate('eventId', 'name description published');
    res.json(slots);
  } catch (err) {
    console.error('Error fetching slots:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET slots by event ID
router.get('/event/:eventId', async (req, res) => {
  try {
    const slots = await Slot.find({ eventId: req.params.eventId }).populate('eventId', 'name description published');
    res.json(slots);
  } catch (err) {
    console.error('Error fetching slots by event:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single slot by ID
router.get('/:id', async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id).populate('eventId', 'name description published');
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.json(slot);
  } catch (err) {
    console.error('Error fetching slot:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create a new slot (admin only)
router.post('/', adminAuth, async (req, res) => {
  let { eventId, date, startTime, endTime, purpose, capacity } = req.body;

  if (!eventId || !date || !startTime || !endTime || !purpose || !capacity) {
    return res.status(400).json({ message: 'All fields are required, including capacity' });
  }

  if (!Number.isInteger(capacity) || capacity < 1) {
    return res.status(400).json({ message: 'Capacity must be a positive integer' });
  }

  try {
    // Verify that the event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Normalize date to UTC
    date = normalizeDate(date);

    // Convert times to 12-hour format if they’re in 24-hour format
    startTime = convertTo12Hour(startTime);
    endTime = convertTo12Hour(endTime);

    // Create the slot
    const slot = new Slot({ 
      eventId, 
      date, 
      startTime, 
      endTime, 
      purpose,
      capacity,
      bookedBy: [], // Initialize as empty array
      createdBy: req.user.id
    });
    
    await slot.save();
    
    // Populate the event details before returning
    const populatedSlot = await Slot.findById(slot._id).populate('eventId', 'name description published');
    res.status(201).json(populatedSlot);
  } catch (err) {
    console.error('Error creating slot:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update a slot (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  let { date, startTime, endTime, purpose, capacity, status } = req.body;

  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    // Update slot fields if provided
    if (date) slot.date = normalizeDate(date);
    if (startTime) slot.startTime = convertTo12Hour(startTime);
    if (endTime) slot.endTime = convertTo12Hour(endTime);
    if (purpose) slot.purpose = purpose;
    if (capacity !== undefined) {
      if (!Number.isInteger(capacity) || capacity < 1) {
        return res.status(400).json({ message: 'Capacity must be a positive integer' });
      }
      if (slot.bookedBy.length > capacity) {
        return res.status(400).json({ message: `Cannot set capacity to ${capacity}. There are already ${slot.bookedBy.length} bookings.` });
      }
      slot.capacity = capacity;
    }
    // Allow status to be updated manually (e.g., for admin overrides)
    if (status && ['available', 'booked'].includes(status)) {
      // No direct status field in schema; status is computed
      // If admin sets status to 'available' and there are bookings, warn
      if (status === 'available' && slot.bookedBy.length > 0) {
        return res.status(400).json({ message: 'Cannot set status to available with existing bookings' });
      }
    }

    await slot.save();
    
    // Return the updated slot with populated event details
    const updatedSlot = await Slot.findById(slot._id).populate('eventId', 'name description published');
    res.json(updatedSlot);
  } catch (err) {
    console.error('Error updating slot:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a slot (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    await slot.deleteOne();
    res.json({ message: 'Slot removed successfully' });
  } catch (err) {
    console.error('Error deleting slot:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST book a slot (no authentication required)
router.post('/:id/book', async (req, res) => {
  const { name, email, enrollment, phone } = req.body;

  // Validate input fields
  if (!name || !email || !enrollment || !phone) {
    return res.status(400).json({ message: 'Name, email, enrollment, and phone are required' });
  }

  // Validate email format
  const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // Validate phone format
  const phoneRegex = /^\+?[\d\s-]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Please provide a valid phone number (10-15 digits)' });
  }

  try {
    const slot = await Slot.findById(req.params.id).populate('eventId', 'name description published');
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    // Check if event is published
    if (!slot.eventId?.published) {
      return res.status(403).json({ message: 'Cannot book slot for unpublished event' });
    }

    // Check if slot is full
    if (slot.bookedBy.length >= slot.capacity) {
      return res.status(400).json({ message: 'Slot is already full' });
    }

    // Check for duplicate enrollment
    if (slot.bookedBy.some(booking => booking.enrollment === enrollment)) {
      return res.status(400).json({ message: 'This enrollment ID is already booked for this slot' });
    }

    // Check for duplicate email
    if (slot.bookedBy.some(booking => booking.email === email)) {
      return res.status(400).json({ message: 'This email is already booked for this slot' });
    }

    // Check for duplicate phone
    if (slot.bookedBy.some(booking => booking.phone === phone)) {
      return res.status(400).json({ message: 'This phone number is already booked for this slot' });
    }

    // Add new booking
    slot.bookedBy.push({
      name: name.trim(),
      email: email.trim(),
      enrollment: enrollment.trim(),
      phone: phone.trim(),
      bookedAt: new Date()
    });

    await slot.save();

    // Return updated slot with populated event details
    const updatedSlot = await Slot.findById(slot._id).populate('eventId', 'name description published');
    res.json(updatedSlot);
  } catch (err) {
    console.error('Error booking slot:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Slot not found' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT cancel a booking (admin only)
router.put('/:id/cancel', adminAuth, async (req, res) => {
  const { enrollment } = req.body;

  if (!enrollment) {
    return res.status(400).json({ message: 'Enrollment ID is required to cancel a booking' });
  }

  try {
    const slot = await Slot.findById(req.params.id).populate('eventId', 'name description published');
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    // Find and remove the booking
    const bookingIndex = slot.bookedBy.findIndex(booking => booking.enrollment === enrollment);
    if (bookingIndex === -1) {
      return res.status(404).json({ message: 'Booking not found for this enrollment ID' });
    }

    slot.bookedBy.splice(bookingIndex, 1);

    await slot.save();

    // Return updated slot with populated event details
    const updatedSlot = await Slot.findById(slot._id).populate('eventId', 'name description published');
    res.json(updatedSlot);
  } catch (err) {
    console.error('Error canceling booking:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;