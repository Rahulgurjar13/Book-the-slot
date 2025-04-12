const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');
const Event = require('../models/Event');
const { adminAuth } = require('../middleware/auth'); // Only keep adminAuth if needed for other routes

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
    const slots = await Slot.find().populate('eventId');
    res.json(slots);
  } catch (err) {
    console.error('Error fetching slots:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET slots by event ID
router.get('/event/:eventId', async (req, res) => {
  try {
    const slots = await Slot.find({ eventId: req.params.eventId }).populate('eventId');
    res.json(slots);
  } catch (err) {
    console.error('Error fetching slots by event:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single slot by ID
router.get('/:id', async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id).populate('eventId');
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
  let { eventId, date, startTime, endTime, purpose } = req.body;

  if (!eventId || !date || !startTime || !endTime || !purpose) {
    return res.status(400).json({ message: 'All fields are required' });
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
      status: 'available',
      createdBy: req.user.id
    });
    
    await slot.save();
    
    // Populate the event details before returning
    const populatedSlot = await Slot.findById(slot._id).populate('eventId');
    res.status(201).json(populatedSlot);
  } catch (err) {
    console.error('Error creating slot:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update a slot (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  let { date, startTime, endTime, purpose } = req.body;

  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    // Update the slot fields if provided
    if (date) slot.date = normalizeDate(date);
    if (startTime) slot.startTime = convertTo12Hour(startTime);
    if (endTime) slot.endTime = convertTo12Hour(endTime);
    if (purpose) slot.purpose = purpose;

    await slot.save();
    
    // Return the updated slot with populated event details
    const updatedSlot = await Slot.findById(slot._id).populate('eventId');
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
router.post('/:id/book', async (req, res) => { // Removed 'auth' middleware
  const { name, email, enrollment } = req.body;

  if (!name || !email || !enrollment) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    if (slot.status !== 'available') {
      return res.status(400).json({ message: 'Slot is not available' });
    }

    // Update slot status and booking details
    slot.status = 'booked';
    slot.bookedBy = { 
      name, 
      email, 
      enrollment,
      bookedAt: Date.now()
    };
    
    await slot.save();

    // Return updated slot with populated event details
    const updatedSlot = await Slot.findById(slot._id).populate('eventId');
    res.json(updatedSlot);
  } catch (err) {
    console.error('Error booking slot:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT cancel a booking (admin only)
router.put('/:id/cancel', adminAuth, async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    if (slot.status !== 'booked') {
      return res.status(400).json({ message: 'Slot is not booked' });
    }

    // Reset slot to available
    slot.status = 'available';
    slot.bookedBy = null;
    
    await slot.save();

    // Return updated slot with populated event details
    const updatedSlot = await Slot.findById(slot._id).populate('eventId');
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