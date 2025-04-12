import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AdminPanel = () => {
  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, booked: 0 });
  const [newEvent, setNewEvent] = useState({ name: '', description: '' });
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '', endTime: '', purpose: '' });
  const [editSlot, setEditSlot] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeDay, setActiveDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [weekStartDate, setWeekStartDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        localStorage.removeItem('token');
        showNotification('Session expired. Please log in again.', 'error');
        navigate('/login');
        return;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('token');
      showNotification('Invalid token. Please log in again.', 'error');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      try {
        const [eventsRes, slotsRes] = await Promise.all([
          axios.get(`${apiUrl}/events`, {
            headers: { 'x-auth-token': token },
          }),
          axios.get(`${apiUrl}/slots`, {
            headers: { 'x-auth-token': token },
          }),
        ]);
        setEvents(eventsRes.data);
        setSlots(slotsRes.data);
        if (eventsRes.data.length > 0) setSelectedEvent(eventsRes.data[0]._id);
      } catch (error) {
        console.error('Fetch error:', error.response?.data || error.message);
        showNotification(`Failed to fetch data: ${error.response?.data?.message || 'Unknown error'}`, 'error');
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (!selectedEvent) return;
    const eventSlots = slots.filter((slot) => slot.eventId._id === selectedEvent);
    const availableSlots = eventSlots.filter((slot) => slot.status === 'available').length;
    const bookedSlots = eventSlots.filter((slot) => slot.status !== 'available').length;
    setStats({
      total: eventSlots.length,
      available: availableSlots,
      booked: bookedSlots,
    });
  }, [slots, selectedEvent]);

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getWeekDates = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const goToPreviousWeek = () => {
    const newStartDate = new Date(weekStartDate);
    newStartDate.setDate(newStartDate.getDate() - 7);
    setWeekStartDate(newStartDate);
  };

  const goToNextWeek = () => {
    const newStartDate = new Date(weekStartDate);
    newStartDate.setDate(newStartDate.getDate() + 7);
    setWeekStartDate(newStartDate);
  };

  const goToCurrentWeek = () => {
    setWeekStartDate(new Date());
    setActiveDay(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  };

  const getSlotsForDay = (day) => {
    if (!slots.length) return [];
    const weekStart = new Date(weekStartDate);
    const targetDate = new Date(weekStart);
    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    const targetDateString = targetDate.toISOString().split('T')[0];
    return slots
      .filter(
        (slot) =>
          slot.eventId._id === selectedEvent &&
          new Date(slot.date).toISOString().split('T')[0] === targetDateString
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.description) {
      showNotification('Please fill in all event fields', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await axios.post(`${apiUrl}/events`, newEvent, {
        headers: { 'x-auth-token': token },
      });
      setEvents([...events, res.data]);
      setNewEvent({ name: '', description: '' });
      setSelectedEvent(res.data._id);
      showNotification('Event created successfully!');
    } catch (error) {
      console.error('Create event error:', error.response?.data || error.message);
      showNotification(
        `Failed to create event: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!selectedEvent) {
      showNotification('Please select an event first', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await axios.post(
        `${apiUrl}/slots`,
        { ...newSlot, eventId: selectedEvent },
        { headers: { 'x-auth-token': token } }
      );
      setSlots([...slots, res.data]);
      setNewSlot({ date: '', startTime: '', endTime: '', purpose: '' });
      showNotification('Slot created successfully!');
    } catch (error) {
      console.error('Create slot error:', error.response?.data || error.message);
      showNotification(
        `Failed to create slot: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleEditSlot = async (e) => {
    e.preventDefault();
    if (!editSlot) return;

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await axios.put(`${apiUrl}/slots/${editSlot._id}`, editSlot, {
        headers: { 'x-auth-token': token },
      });
      setSlots(slots.map((slot) => (slot._id === editSlot._id ? res.data : slot)));
      setEditSlot(null);
      showNotification('Slot updated successfully!');
    } catch (error) {
      console.error('Edit slot error:', error.response?.data || error.message);
      showNotification(
        `Failed to update slot: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return;

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      await axios.delete(`${apiUrl}/slots/${slotToDelete._id}`, {
        headers: { 'x-auth-token': token },
      });
      setSlots(slots.filter((slot) => slot._id !== slotToDelete._id));
      showNotification('Slot deleted successfully!');
      setSlotToDelete(null);
    } catch (error) {
      console.error('Delete slot error:', error.response?.data || error.message);
      showNotification(
        `Failed to delete slot: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const getFilteredSlots = () => {
    return slots.filter((slot) => {
      const slotDate = new Date(slot.date);
      const day = slotDate.toLocaleDateString('en-US', { weekday: 'long' });
      const matchesDay = !activeDay || day === activeDay;
      const matchesEvent = !selectedEvent || slot.eventId._id === selectedEvent;
      const searchString = `${new Date(slot.date).toLocaleDateString()} ${slot.startTime} ${slot.endTime} ${slot.status} ${slot.purpose}`.toLowerCase();
      const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'available' && slot.status === 'available') ||
        (filterStatus === 'booked' && slot.status !== 'available');
      return matchesDay && matchesEvent && matchesSearch && matchesStatus;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleEventCardClick = (eventId) => {
    setSelectedEvent(eventId);
    setActiveSection('slots');
  };

  const filteredSlots = getFilteredSlots();
  const currentEvent = events.find((event) => event._id === selectedEvent) || {};
  const weekDates = getWeekDates();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <a href="/" className="text-blue-600 hover:text-blue-500" target="_blank" rel="noopener noreferrer">
              View Public Booking
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {notification && (
        <div
          className={`fixed top-4 right-4 max-w-sm p-4 rounded-md shadow-lg z-50 ${
            notification.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}
        >
          <div className="flex justify-between items-center">
            <p>{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-4 text-gray-600 hover:text-gray-800">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['dashboard', 'events', 'slots'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-1 py-4 font-medium border-b-2 ${
                  activeSection === section
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {activeSection === 'dashboard' && (
            <section>
              <h2 className="text-xl font-semibold mb-6">Overview</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Event for Overview</label>
                <select
                  value={selectedEvent || ''}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>
                    Select an event
                  </option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.name} - {event.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Total Slots</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Available Slots</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.available}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Booked Slots</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.booked}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium mb-4">Events Overview</h3>
                {events.length === 0 ? (
                  <p className="text-gray-500">No events created yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event) => {
                      const eventSlots = slots.filter((slot) => slot.eventId._id === event._id);
                      const availableCount = eventSlots.filter((s) => s.status === 'available').length;
                      return (
                        <div
                          key={event._id}
                          onClick={() => handleEventCardClick(event._id)}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer"
                        >
                          <h4 className="font-medium text-gray-800">{event.name}</h4>
                          <p className="text-sm text-gray-500 mb-3">{event.description}</p>
                          <div className="flex justify-between text-sm">
                            <span>Total: {eventSlots.length} slots</span>
                            <span className="text-green-600">{availableCount} available</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
          {activeSection === 'events' && (
            <section>
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6">Events Management</h2>
                <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
                  <h3 className="text-lg font-medium mb-4">Create New Event</h3>
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                        <input
                          type="text"
                          value={newEvent.name}
                          onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter event name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter event description"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Create Event
                    </button>
                  </form>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium mb-4">Existing Events</h3>
                  {events.length === 0 ? (
                    <p className="text-gray-500">No events created yet</p>
                  ) : (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Slots
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {events.map((event) => {
                            const eventSlots = slots.filter((slot) => slot.eventId._id === event._id);
                            const availableCount = eventSlots.filter((slot) => slot.status === 'available').length;
                            return (
                              <tr key={event._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {event.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {event.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="font-medium">{eventSlots.length}</span> total
                                  <span className="ml-2 text-green-600">({availableCount} available)</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                  <button
                                    onClick={() => {
                                      setSelectedEvent(event._id);
                                      setActiveSection('slots');
                                    }}
                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    Manage Slots
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {activeSection === 'slots' && (
            <section>
              <h2 className="text-xl font-semibold mb-6">Slot Management</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
                <select
                  value={selectedEvent || ''}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>
                    Select an event
                  </option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.name} - {event.description}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEvent && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
                    <h3 className="text-lg font-medium mb-4">Create Slot for {currentEvent.name}</h3>
                    <form onSubmit={handleCreateSlot} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={newSlot.date}
                          onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={newSlot.startTime}
                          onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={newSlot.endTime}
                          onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                        <div className="flex">
                          <input
                            type="text"
                            value={newSlot.purpose}
                            onChange={(e) => setNewSlot({ ...newSlot, purpose: e.target.value })}
                            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Purpose of the slot"
                            required
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex flex-col md:flex-row justify-between mb-4">
                        <h3 className="text-lg font-medium mb-2 md:mb-0">Manage Slots for {currentEvent.name}</h3>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            placeholder="Search slots..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-auto p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Slots</option>
                            <option value="available">Available</option>
                            <option value="booked">Booked</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={goToPreviousWeek}
                            className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            ← Previous Week
                          </button>
                          <button
                            onClick={goToCurrentWeek}
                            className="p-2 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200"
                          >
                            Current Week
                          </button>
                          <button
                            onClick={goToNextWeek}
                            className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Next Week →
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-6">
                        {weekDates.map((date, index) => {
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                          const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const isCurrentDay = isToday(date);
                          const slotsCount = getSlotsForDay(dayName).length;
                          return (
                            <div
                              key={index}
                              onClick={() => setActiveDay(dayName)}
                              className={`p-3 text-center rounded-lg cursor-pointer ${
                                activeDay === dayName
                                  ? 'bg-blue-100 border-2 border-blue-500'
                                  : isCurrentDay
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-white border border-gray-200'
                              } hover:bg-blue-50 transition`}
                            >
                              <div className="font-medium">{dayName.slice(0, 3)}</div>
                              <div className="text-sm text-gray-500">{formattedDate}</div>
                              <div
                                className={`mt-1 text-xs font-medium ${
                                  slotsCount > 0 ? 'text-green-600' : 'text-gray-400'
                                }`}
                              >
                                {slotsCount} {slotsCount === 1 ? 'slot' : 'slots'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {activeDay && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                          <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-lg font-medium">
                              Slots for {activeDay} -{' '}
                              {formatDate(
                                weekDates.find((d) => d.toLocaleDateString('en-US', { weekday: 'long' }) === activeDay)
                              )}
                            </h3>
                          </div>
                          <div className="p-4">
                            {getSlotsForDay(activeDay).length === 0 ? (
                              <p className="text-center text-gray-500 py-4">No slots available for {activeDay}</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {getSlotsForDay(activeDay).map((slot) => (
                                  <div
                                    key={slot._id}
                                    className={`border rounded-lg p-4 ${
                                      slot.status === 'available'
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-purple-200 bg-purple-50'
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {slot.startTime} - {slot.endTime}
                                        </p>
                                        <p className="text-sm text-gray-600">{slot.purpose}</p>
                                        {slot.status === 'booked' && slot.bookedBy && (
                                          <div className="mt-2 text-sm text-gray-600">
                                            <p>
                                              <span className="font-medium">Booked by:</span> {slot.bookedBy.name}
                                            </p>
                                            <p>
                                              <span className="font-medium">Enrollment:</span> {slot.bookedBy.enrollment}
                                            </p>
                                            <p>
                                              <span className="font-medium">Email:</span> {slot.bookedBy.email}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center mt-3 sm:mt-0">
                                        <span
                                          className={`mr-4 px-2 py-1 text-xs font-semibold rounded-full ${
                                            slot.status === 'available'
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-purple-100 text-purple-800'
                                          }`}
                                        >
                                          {slot.status.toUpperCase()}
                                        </span>
                                        <button
                                          onClick={() => setEditSlot(slot)}
                                          className="text-blue-600 hover:text-blue-800 mr-3"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => setSlotToDelete(slot)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Booking System Admin Panel. All rights reserved.
          </p>
        </div>
      </footer>

      {slotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this slot? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSlot}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Slot</h3>
            <form onSubmit={handleEditSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editSlot.date}
                  onChange={(e) => setEditSlot({ ...editSlot, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={editSlot.startTime}
                  onChange={(e) => setEditSlot({ ...editSlot, startTime: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={editSlot.endTime}
                  onChange={(e) => setEditSlot({ ...editSlot, endTime: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={editSlot.purpose}
                  onChange={(e) => setEditSlot({ ...editSlot, purpose: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditSlot(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;