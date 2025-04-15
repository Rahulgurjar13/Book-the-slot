import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  ExternalLink,
  AlertCircle,
  X,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

const AdminPanel = () => {
  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, booked: 0 });
  const [newEvent, setNewEvent] = useState({ name: '', description: '' });
  const [editEvent, setEditEvent] = useState(null);
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '', endTime: '', purpose: '', capacity: 1 });
  const [editSlot, setEditSlot] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeDay, setActiveDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [weekStartDate, setWeekStartDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchSlotData, setBatchSlotData] = useState({
    startDate: '',
    endDate: '',
    daysOfWeek: [],
    startTime: '',
    endTime: '',
    purpose: '',
    capacity: 1
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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
          axios.get(`${apiUrl}/events`, { headers: { 'x-auth-token': token } }),
          axios.get(`${apiUrl}/slots`, { headers: { 'x-auth-token': token } }),
        ]);
        setEvents(eventsRes.data || []);
        setSlots(slotsRes.data || []);
        if (eventsRes.data?.length > 0) setSelectedEvent(eventsRes.data[0]._id);
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        setActiveDay(today);
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

    // Polling for real-time slot updates
    const interval = setInterval(async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      try {
        const slotsRes = await axios.get(`${apiUrl}/slots`, { headers: { 'x-auth-token': token } });
        setSlots(slotsRes.data || []);
      } catch (error) {
        console.error('Polling error:', error.response?.data || error.message);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [navigate]);

  useEffect(() => {
    if (!selectedEvent) return;
    const eventSlots = slots.filter((slot) => slot.eventId?._id === selectedEvent);
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
    const start = new Date(weekStartDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
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
    if (!slots.length || !activeDay) return [];
    const weekDates = getWeekDates();
    const targetDate = weekDates.find(date => date.toLocaleDateString('en-US', { weekday: 'long' }) === day);
    if (!targetDate) return [];

    const targetDateString = targetDate.toISOString().split('T')[0];
    return slots
      .filter(
        (slot) =>
          slot.eventId?._id === selectedEvent &&
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

  const handleEditEvent = async (e) => {
    e.preventDefault();
    if (!editEvent?.name || !editEvent?.description) {
      showNotification('Please fill in all event fields', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await axios.put(`${apiUrl}/events/${editEvent._id}`, editEvent, {
        headers: { 'x-auth-token': token },
      });
      setEvents(events.map((evt) => (evt._id === editEvent._id ? res.data : evt)));
      setEditEvent(null);
      showNotification('Event updated successfully!');
    } catch (error) {
      console.error('Edit event error:', error.response?.data || error.message);
      showNotification(
        `Failed to update event: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      await axios.delete(`${apiUrl}/events/${eventToDelete._id}`, {
        headers: { 'x-auth-token': token },
      });
      setEvents(events.filter((evt) => evt._id !== eventToDelete._id));
      setSlots(slots.filter((slot) => slot.eventId?._id !== eventToDelete._id));
      if (selectedEvent === eventToDelete._id) setSelectedEvent(null);
      showNotification('Event deleted successfully!');
      setEventToDelete(null);
    } catch (error) {
      console.error('Delete event error:', error.response?.data || error.message);
      showNotification(
        `Failed to delete event: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleTogglePublish = async (eventId, currentStatus) => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await axios.put(
        `${apiUrl}/events/${eventId}`,
        { published: !currentStatus },
        { headers: { 'x-auth-token': token } }
      );
      setEvents(events.map((evt) => (evt._id === eventId ? res.data : evt)));
      showNotification(`Event ${!currentStatus ? 'published' : 'unpublished'} successfully! This only changes visibility, not deletion.`);
    } catch (error) {
      console.error('Toggle publish error:', error.response?.data || error.message);
      showNotification(
        `Failed to toggle publish: ${error.response?.data?.message || 'Unknown error'}`,
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
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime || !newSlot.purpose || newSlot.capacity < 1) {
      showNotification('Please fill in all slot fields with valid values', 'error');
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
      setNewSlot({ date: '', startTime: '', endTime: '', purpose: '', capacity: 1 });
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

  const handleCreateBatchSlots = async (e) => {
    e.preventDefault();
    if (!selectedEvent) {
      showNotification('Please select an event first', 'error');
      return;
    }

    const { startDate, endDate, daysOfWeek, startTime, endTime, purpose, capacity } = batchSlotData;
    if (!startDate || !endDate || daysOfWeek.length === 0 || !startTime || !endTime || !purpose || capacity < 1) {
      showNotification('Please fill in all batch slot fields with valid values', 'error');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const slotDates = [];
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (daysOfWeek.includes(dayName)) slotDates.push(new Date(date));
      }

      const newSlots = [];
      for (const date of slotDates) {
        const dateString = date.toISOString().split('T')[0];
        const slotData = { date: dateString, startTime, endTime, purpose, capacity, eventId: selectedEvent };
        const res = await axios.post(`${apiUrl}/slots`, slotData, { headers: { 'x-auth-token': token } });
        newSlots.push(res.data);
      }

      setSlots([...slots, ...newSlots]);
      setIsCreatingBatch(false);
      setBatchSlotData({ startDate: '', endDate: '', daysOfWeek: [], startTime: '', endTime: '', purpose: '', capacity: 1 });
      showNotification(`Successfully created ${newSlots.length} slots!`);
    } catch (error) {
      console.error('Create batch slots error:', error.response?.data || error.message);
      showNotification(
        `Failed to create batch slots: ${error.response?.data?.message || 'Unknown error'}`,
        'error'
      );
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDayOfWeekToggle = (day) => {
    const { daysOfWeek } = batchSlotData;
    setBatchSlotData({
      ...batchSlotData,
      daysOfWeek: daysOfWeek.includes(day) ? daysOfWeek.filter(d => d !== day) : [...daysOfWeek, day]
    });
  };

  const handleEditSlot = async (e) => {
    e.preventDefault();
    if (!editSlot) return;
    if (!editSlot.date || !editSlot.startTime || !editSlot.endTime || !editSlot.purpose || editSlot.capacity < 1) {
      showNotification('Please fill in all slot fields with valid values', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    // Exclude status from payload
    const { status, bookedBy, eventId, ...payload } = editSlot;
    try {
      const res = await axios.put(`${apiUrl}/slots/${editSlot._id}`, payload, {
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
      const matchesEvent = !selectedEvent || slot.eventId?._id === selectedEvent;
      const searchString = `${new Date(slot.date).toLocaleDateString()} ${slot.startTime} ${slot.endTime} ${slot.status} ${slot.purpose} ${slot.capacity}`.toLowerCase();
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

  const LoadingSpinner = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700">Loading...</p>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex h-screen bg-gray-50">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-indigo-800 text-white transition-all duration-300 ease-in-out ${isMobile && !sidebarOpen ? 'hidden' : ''}`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${!sidebarOpen && 'hidden'}`}>Admin Panel</h1>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1 rounded-md hover:bg-indigo-700"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`flex items-center w-full py-3.5 px-4 ${activeSection === 'dashboard' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
          >
            <LayoutDashboard size={20} />
            {sidebarOpen && <span className="ml-3">Dashboard</span>}
          </button>
          <button
            onClick={() => setActiveSection('events')}
            className={`flex items-center w-full py-3.5 px-4 ${activeSection === 'events' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
          >
            <Calendar size={20} />
            {sidebarOpen && <span className="ml-3">Events</span>}
          </button>
          <button
            onClick={() => setActiveSection('slots')}
            className={`flex items-center w-full py-3.5 px-4 ${activeSection === 'slots' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
          >
            <CalendarIcon size={20} />
            {sidebarOpen && <span className="ml-3">Slots</span>}
          </button>
          <div className="mt-auto pt-20">
            <a 
              href="/" 
              className="flex items-center w-full py-3.5 px-4 hover:bg-indigo-700" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink size={20} />
              {sidebarOpen && <span className="ml-3">Public Booking</span>}
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center w-full py-3.5 px-4 hover:bg-indigo-700"
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="ml-3">Logout</span>}
            </button>
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center">
              {isMobile && (
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="mr-4 p-2 rounded-md text-gray-500 hover:bg-gray-100"
                >
                  {sidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-800">
                {activeSection === 'dashboard' && 'Admin Dashboard'}
                {activeSection === 'events' && 'Events Management'}
                {activeSection === 'slots' && 'Slot Management'}
              </h1>
            </div>
            <div className="flex items-center">
              {selectedEvent && currentEvent.name && (
                <span className="hidden md:inline-block mr-4 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                  {currentEvent.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {notification && (
          <div
            className={`fixed top-4 right-4 max-w-sm p-4 rounded-md shadow-lg z-50 animate-slideIn ${
              notification.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'error' ? (
                <AlertCircle className="mr-2" size={20} />
              ) : (
                <CheckCircle className="mr-2" size={20} />
              )}
              <p className="flex-1">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)} 
                className="ml-4 text-gray-600 hover:text-gray-800"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {activeSection === 'dashboard' && (
            <section className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Event for Overview</label>
                <select
                  value={selectedEvent || ''}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="" disabled>Select an event</option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.name} - {event.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500 hover:shadow-lg transition">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Total Slots</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                  <div className="mt-2 text-sm text-gray-500">For {currentEvent.name || 'selected event'}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 hover:shadow-lg transition">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Available Slots</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.available}</p>
                  <div className="mt-2 text-sm text-green-500">Ready to be booked</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500 hover:shadow-lg transition">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Booked Slots</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.booked}</p>
                  <div className="mt-2 text-sm text-purple-500">By users</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium mb-4">Events Overview</h3>
                {events.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setActiveSection('events')}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                        Create Event
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event) => {
                      const eventSlots = slots.filter((slot) => slot.eventId?._id === event._id);
                      const availableCount = eventSlots.filter((s) => s.status === 'available').length;
                      return (
                        <div
                          key={event._id}
                          onClick={() => handleEventCardClick(event._id)}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transform hover:-translate-y-1 transition-all duration-200"
                        >
                          <h4 className="font-medium text-gray-800">{event.name}</h4>
                          <p className="text-sm text-gray-500 mb-3">{event.description}</p>
                          <div className="flex justify-between text-sm">
                            <span>Total: {eventSlots.length} slots</span>
                            <span className="text-green-600">{availableCount} available</span>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditEvent(event);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                            >
                              <Edit size={16} className="mr-1" /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDelete(event);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                            >
                              <Trash2 size={16} className="mr-1" /> Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePublish(event._id, event.published);
                              }}
                              className={`text-sm font-medium flex items-center ${
                                event.published ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'
                              }`}
                            >
                              {event.published ? (
                                <>
                                  <EyeOff size={16} className="mr-1" /> Unpublish (Keep Event)
                                </>
                              ) : (
                                <>
                                  <Eye size={16} className="mr-1" /> Publish
                                </>
                              )}
                            </button>
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
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-medium mb-4">Create New Event</h3>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                      <input
                        type="text"
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter event description"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Event
                    </button>
                  </div>
                </form>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Existing Events</h3>
                {events.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <p className="text-gray-500">No events created yet. Create your first event above.</p>
                  </div>
                ) : (
                  <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Slots</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {events.map((event) => {
                          const eventSlots = slots.filter((slot) => slot.eventId?._id === event._id);
                          const availableCount = eventSlots.filter((s) => s.status === 'available').length;
                          return (
                            <tr key={event._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">{event.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{event.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{eventSlots.length}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{availableCount}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${event.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {event.published ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditEvent(event)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setEventToDelete(event)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => handleTogglePublish(event._id, event.published)}
                                    className={event.published ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'}
                                  >
                                    {event.published ? 'Unpublish (Keep Event)' : 'Publish'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedEvent(event._id);
                                      setActiveSection('slots');
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Manage Slots
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection === 'slots' && (
            <section className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
                <select
                  value={selectedEvent || ''}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="" disabled>Select an event</option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.name} - {event.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Create New Slot</h3>
                  <button
                    onClick={() => setIsCreatingBatch(!isCreatingBatch)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {isCreatingBatch ? 'Create Individual Slot' : 'Create Multiple Slots'}
                  </button>
                </div>

                {!isCreatingBatch ? (
                  <form onSubmit={handleCreateSlot} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={newSlot.date}
                          onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={newSlot.startTime}
                          onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={newSlot.endTime}
                          onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                        <input
                          type="text"
                          value={newSlot.purpose}
                          onChange={(e) => setNewSlot({ ...newSlot, purpose: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Meeting, Consultation"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                        <input
                          type="number"
                          value={newSlot.capacity}
                          onChange={(e) => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Number of people"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
                      >
                        <Plus size={16} className="mr-2" />
                        Create Slot
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCreateBatchSlots} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={batchSlotData.startDate}
                          onChange={(e) => setBatchSlotData({ ...batchSlotData, startDate: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={batchSlotData.endDate}
                          onChange={(e) => setBatchSlotData({ ...batchSlotData, endDate: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                      <div className="flex flex-wrap gap-2">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayOfWeekToggle(day)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                              batchSlotData.daysOfWeek.includes(day)
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            } border`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={batchSlotData.startTime}
                          onChange={(e) => setBatchSlotData({ ...batchSlotData, startTime: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={batchSlotData.endTime}
                          onChange={(e) => setBatchSlotData({ ...batchSlotData, endTime: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                        <input
                          type="text"
                          value={batchSlotData.purpose}
                          onChange={(e) => setBatchSlotData({ ...batchSlotData, purpose: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Meeting, Consultation"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                        <input
                          type="number"
                          value={batchSlotData.capacity}
                          onChange={(e) => setBatchSlotData({ ...batchSlotData, capacity: parseInt(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Number of people"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
                      >
                        <Plus size={16} className="mr-2" />
                        Create Batch Slots
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Weekly Schedule</h3>
                  <div className="flex space-x-2">
                    <button onClick={goToPreviousWeek} className="p-1 rounded-md hover:bg-gray-100" aria-label="Previous week">
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={goToCurrentWeek} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                      Today
                    </button>
                    <button onClick={goToNextWeek} className="p-1 rounded-md hover:bg-gray-100" aria-label="Next week">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {weekDates.map((date, index) => {
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isActive = dayName === activeDay;
                    const isDateToday = isToday(date);
                    return (
                      <button
                        key={index}
                        onClick={() => setActiveDay(dayName)}
                        className={`p-2 text-center rounded-md ${
                          isActive ? 'bg-indigo-100 text-indigo-800 font-medium border border-indigo-300' : 'hover:bg-gray-100'
                        } ${isDateToday ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''}`}
                      >
                        <div className="text-xs text-gray-500">{dayName.substring(0, 3)}</div>
                        <div className={`text-sm ${isDateToday ? 'font-bold' : ''}`}>{formattedDate}</div>
                      </button>
                    );
                  })}
                </div>

                {activeDay && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      {`Slots for ${activeDay}, ${weekDates.find((date) => date.toLocaleDateString('en-US', { weekday: 'long' }) === activeDay)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                    </h4>
                    <div className="space-y-2">
                      {getSlotsForDay(activeDay).length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-gray-300 rounded-md">
                          <p className="text-gray-500">No slots created for this day</p>
                          <button
                            onClick={() => {
                              const date = weekDates.find((date) => date.toLocaleDateString('en-US', { weekday: 'long' }) === activeDay);
                              setNewSlot({ ...newSlot, date: date ? date.toISOString().split('T')[0] : '' });
                              setActiveSection('slots');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Create slot for this day
                          </button>
                        </div>
                      ) : (
                        getSlotsForDay(activeDay).map((slot) => (
                          <div
                            key={slot._id}
                            className={`flex items-center justify-between p-3 rounded-md ${
                              slot.status === 'available' ? 'bg-green-50 border border-green-200' : 'bg-purple-50 border border-purple-200'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                              <div className="text-sm text-gray-600">{slot.purpose}</div>
                              <div className="text-xs mt-1">
                                <span className={`px-2 py-0.5 rounded-full ${slot.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                  {slot.status}
                                </span>
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                                  Capacity: {slot.capacity}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button onClick={() => setEditSlot(slot)} className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => setSlotToDelete(slot)} className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-4 md:space-y-0">
                  <h3 className="text-lg font-medium">All Slots</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search slots..."
                        className="pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                      />
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Statuses</option>
                      <option value="available">Available</option>
                      <option value="booked">Booked</option>
                    </select>
                  </div>
                </div>

                {filteredSlots.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-300 rounded-md">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No slots found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || filterStatus !== 'all' ? 'Try adjusting your search or filter' : 'Get started by creating a new slot'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked By</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSlots.map((slot) => (
                          <tr key={slot._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(slot.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.startTime} - {slot.endTime}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.purpose}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${slot.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                {slot.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{slot.capacity}</td>
                            <td className="px-6 py-4 text-sm">
                              {slot.bookedBy && slot.bookedBy.length > 0 ? (
                                <div>
                                  {slot.bookedBy.map((user, index) => (
                                    <div key={index} className="mb-2">
                                      <span className="block font-medium">{user.name || 'Unknown'}</span>
                                      <span className="block text-xs text-gray-500">Email: {user.email || 'N/A'}</span>
                                      <span className="block text-xs text-gray-500">Enrollment: {user.enrollment || 'N/A'}</span>
                                      <span className="block text-xs text-gray-500">Phone: {user.phone || 'N/A'}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500">No users booked</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <button onClick={() => setEditSlot(slot)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                <button onClick={() => setSlotToDelete(slot)} className="text-red-600 hover:text-red-900">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {editEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Event</h3>
            <form onSubmit={handleEditEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  value={editEvent.name}
                  onChange={(e) => setEditEvent({ ...editEvent, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter event name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editEvent.description}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter event description"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditEvent(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-red-500 mr-3" size={24} />
              <h3 className="text-lg font-medium">Confirm Deletion</h3>
            </div>
            <p className="mb-6">
              Are you sure you want to delete the event <strong>{eventToDelete.name}</strong>? This will also delete all associated slots. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
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
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Slot</h3>
            <form onSubmit={handleEditSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editSlot.date.split('T')[0]}
                  onChange={(e) => setEditSlot({ ...editSlot, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editSlot.startTime}
                    onChange={(e) => setEditSlot({ ...editSlot, startTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editSlot.endTime}
                    onChange={(e) => setEditSlot({ ...editSlot, endTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={editSlot.purpose}
                  onChange={(e) => setEditSlot({ ...editSlot, purpose: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={editSlot.capacity}
                  onChange={(e) => setEditSlot({ ...editSlot, capacity: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min={editSlot.bookedBy?.length || 1}
                  required
                />
              </div>
              {editSlot.bookedBy && editSlot.bookedBy.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booked By</label>
                  <div className="p-2 border border-gray-300 rounded-md bg-gray-50">
                    {editSlot.bookedBy.map((user, index) => (
                      <div key={index} className="text-sm mb-2">
                        <span className="block font-medium">{user.name || 'Unknown'}</span>
                        <span className="block text-xs text-gray-500">Email: {user.email || 'N/A'}</span>
                        <span className="block text-xs text-gray-500">Enrollment: {user.enrollment || 'N/A'}</span>
                        <span className="block text-xs text-gray-500">Phone: {user.phone || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditSlot(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {slotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-red-500 mr-3" size={24} />
              <h3 className="text-lg font-medium">Confirm Deletion</h3>
            </div>
            <p className="mb-6">
              Are you sure you want to delete this slot on <strong>{formatDate(slotToDelete.date)}</strong> from{' '}
              <strong>{slotToDelete.startTime} to {slotToDelete.endTime}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
    </div>
  );
};

export default AdminPanel;