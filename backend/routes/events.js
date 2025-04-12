const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Slot = require('../models/Slot');
const { auth, adminAuth } = require('../middleware/auth');

// GET all events (public - only published events)
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all published events for public'); // Debug log
    const events = await Event.find({ published: true }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all events (admin - all events, published or not)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    console.log('Fetching all events for admin'); // Debug log
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single event by ID (public - must be published)
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, published: true });
    if (!event) {
      return res.status(404).json({ message: 'Event not found or not published' });
    }
    res.json(event);
  } catch (err) {
    console.error('Error fetching event:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create a new event (admin only)
router.post('/', adminAuth, async (req, res) => {
  const { name, description, published } = req.body;
  
  if (!name || !description) {
    console.log('Missing required fields:', { name, description });
    return res.status(400).json({ message: 'Name and description are required' });
  }
  
  try {
    console.log('Creating new event:', { name, description, published });
    const event = new Event({
      name,
      description,
      published: published !== undefined ? published : true, // Default to true if not provided
      createdBy: req.user.id
    });
        
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error('Error creating event:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update an event (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  const { name, description, published } = req.body;
  
  try {
    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Update fields if provided
    if (name) event.name = name;
    if (description) event.description = description;
    if (typeof published === 'boolean') event.published = published; // Only update if explicitly provided
    
    await event.save();
    res.json(event);
  } catch (err) {
    console.error('Error updating event:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE an event and all associated slots (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Delete all slots associated with this event
    await Slot.deleteMany({ eventId: req.params.id });
        
    // Delete the event
    await event.deleteOne();
        
    res.json({ message: 'Event and associated slots removed' });
  } catch (err) {
    console.error('Error deleting event:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;