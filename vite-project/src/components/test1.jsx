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
  Menu,
  Clock,
  BarChart
} from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchSlotData, setBatchSlotData] = useState({
    startDate: '',
    endDate: '',
    daysOfWeek: [],
    startTime: '',
    endTime: '',
    purpose: ''
  });
  const [showAnalytics, setShowAnalytics] = useState(false); // Added state for analytics modal
  const [showSettings, setShowSettings] = useState(false);   // Added state for settings modal
  const [settings, setSettings] = useState({                 // Added default settings state
    defaultSlotDuration: 30,
    bufferTime: 15,
    businessHours: { start: '09:00', end: '17:00' },
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    notifications: { email: true, sms: false }
  });
  const navigate = useNavigate();

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Authenticate and fetch data
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
        
        // Set today as active day
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
  }, [navigate]);

  // Calculate stats when slots or selected event changes
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

  const handleCreateBatchSlots = async (e) => {
    e.preventDefault();
    if (!selectedEvent) {
      showNotification('Please select an event first', 'error');
      return;
    }

    const { startDate, endDate, daysOfWeek, startTime, endTime, purpose } = batchSlotData;
    
    if (!startDate || !endDate || daysOfWeek.length === 0 || !startTime || !endTime || !purpose) {
      showNotification('Please fill in all batch slot fields', 'error');
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
        if (daysOfWeek.includes(dayName)) {
          slotDates.push(new Date(date));
        }
      }
      
      const newSlots = [];
      for (const date of slotDates) {
        const dateString = date.toISOString().split('T')[0];
        const slotData = {
          date: dateString,
          startTime,
          endTime,
          purpose,
          eventId: selectedEvent
        };
        
        const res = await axios.post(
          `${apiUrl}/slots`,
          slotData,
          { headers: { 'x-auth-token': token } }
        );
        newSlots.push(res.data);
      }
      
      setSlots([...slots, ...newSlots]);
      setIsCreatingBatch(false);
      setBatchSlotData({
        startDate: '',
        endDate: '',
        daysOfWeek: [],
        startTime: '',
        endTime: '',
        purpose: ''
      });
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
      daysOfWeek: daysOfWeek.includes(day) 
        ? daysOfWeek.filter(d => d !== day) 
        : [...daysOfWeek, day]
    });
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

  // Placeholder for settings save handler
  const handleSaveSettings = (e) => {
    e.preventDefault();
    // Add logic to save settings to your backend or local storage if needed
    showNotification('Settings saved successfully!', 'success');
    setShowSettings(false);
  };

  // Placeholder for working day toggle in settings
  const handleWorkingDayToggle = (day) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const filteredSlots = getFilteredSlots();
  const currentEvent = events.find((event) => event._id === selectedEvent) || {};
  const weekDates = getWeekDates();

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700">Loading...</p>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-black text-white transition-all duration-300 ease-in-out ${isMobile && !sidebarOpen ? 'hidden' : ''}`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl text-orange-500 ${!sidebarOpen && 'hidden'}`}>ScheduleMaster</h1>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1 rounded-md hover:bg-gray-800 text-orange-500"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`flex items-center w-full py-3.5 px-4 ${
              activeSection === 'dashboard' 
                ? 'bg-orange-600 text-white' 
                : 'hover:bg-gray-800 text-gray-300 hover:text-white'
            } transition-colors duration-200`}
          >
            <LayoutDashboard size={20} />
            {sidebarOpen && <span className="ml-3">Dashboard</span>}
          </button>
          <button
            onClick={() => setActiveSection('events')}
            className={`flex items-center w-full py-3.5 px-4 ${
              activeSection === 'events' 
                ? 'bg-orange-600 text-white' 
                : 'hover:bg-gray-800 text-gray-300 hover:text-white'
            } transition-colors duration-200`}
          >
            <Calendar size={20} />
            {sidebarOpen && <span className="ml-3">Events</span>}
          </button>
          <button
            onClick={() => setActiveSection('slots')}
            className={`flex items-center w-full py-3.5 px-4 ${
              activeSection === 'slots' 
                ? 'bg-orange-600 text-white' 
                : 'hover:bg-gray-800 text-gray-300 hover:text-white'
            } transition-colors duration-200`}
          >
            <CalendarIcon size={20} />
            {sidebarOpen && <span className="ml-3">Slots</span>}
          </button>
          
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <a 
              href="/" 
              className="flex items-center w-full py-3.5 px-4 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors duration-200" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink size={20} />
              {sidebarOpen && <span className="ml-3">Public Booking</span>}
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center w-full py-3.5 px-4 mt-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors duration-200"
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="ml-3">Logout</span>}
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
        {/* Top nav */}
        <header className="bg-black text-white shadow-md z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center">
              {isMobile && (
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="mr-4 p-2 rounded-md text-orange-500 hover:bg-gray-800"
                >
                  <Menu size={24} />
                </button>
              )}
              <h1 className="text-2xl font-bold text-orange-500">
                {activeSection === 'dashboard' && 'Admin Dashboard'}
                {activeSection === 'events' && 'Events Management'}
                {activeSection === 'slots' && 'Slot Management'}
              </h1>
            </div>
            <div className="flex items-center">
              {selectedEvent && currentEvent.name && (
                <span className="hidden md:inline-block mr-4 px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                  {currentEvent.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 max-w-sm p-4 rounded-md shadow-lg z-50 animate-slideIn ${
              notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
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
                className="ml-4 text-white hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <section className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Event for Overview</label>
                <select
                  value={selectedEvent || ''}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                >
                  <option value="" disabled>Select an event</option>
                  {events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.name} - {event.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-black p-6 rounded-lg shadow-md border-l-4 border-orange-500 hover:shadow-lg transition text-white">
                  <h3 className="text-gray-400 text-sm font-medium mb-1">Total Slots</h3>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                  <div className="mt-2 text-sm text-orange-500">For {currentEvent.name || 'selected event'}</div>
                </div>

                <div className="bg-black p-6 rounded-lg shadow-md border-l-4 border-green-500 hover:shadow-lg transition text-white">
                  <h3 className="text-gray-400 text-sm font-medium mb-1">Available Slots</h3>
                  <p className="text-3xl font-bold text-white">{stats.available}</p>
                  <div className="mt-2 text-sm text-green-500">Ready to be booked</div>
                </div>

                <div className="bg-black p-6 rounded-lg shadow-md border-l-4 border-purple-500 hover:shadow-lg transition text-white">
                  <h3 className="text-gray-400 text-sm font-medium mb-1">Booked Slots</h3>
                  <p className="text-3xl font-bold text-white">{stats.booked}</p>
                  <div className="mt-2 text-sm text-purple-500">By users</div>
                </div>
              </div>

              {/* Events Overview */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded mr-2"></span>
                  Events Overview
                </h3>
                {events.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="mx-auto h-12 w-12 text-orange-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setActiveSection('events')}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                      >
                        <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                        Create Event
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event) => {
                      const eventSlots = slots.filter((slot) => slot.eventId._id === event._id);
                      const availableCount = eventSlots.filter((s) => s.status === 'available').length;
                      return (
                        <div
                          key={event._id}
                          onClick={() => handleEventCardClick(event._id)}
                          className="border border-gray-200 rounded-lg p-5 hover:shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all duration-200 bg-white"
                        >
                          <div className="flex items-center mb-2">
                            <div className="w-2 h-10 bg-orange-500 rounded mr-2"></div>
                            <h4 className="font-medium text-gray-800 text-lg">{event.name}</h4>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">{event.description}</p>
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center">
                              <CalendarIcon size={14} className="mr-1 text-gray-500" />
                              {eventSlots.length} slots
                            </span>
                            <span className="text-green-600 flex items-center">
                              <CheckCircle size={14} className="mr-1" />
                              {availableCount} available
                            </span>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event._id);
                                setActiveSection('slots');
                              }}
                              className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center transition-colors duration-200"
                            >
                              Manage Slots <ChevronRight size={16} className="ml-1" />
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

          {/* Events Management */}
          {activeSection === 'events' && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded mr-2"></span>
                  Create New Event
                </h3>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                      <input
                        type="text"
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter event description"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200 flex items-center"
                    >
                      <Plus size={18} className="mr-1" /> Create Event
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <span className="w-1 h-6 bg-orange-500 rounded mr-2"></span>
                  Your Events
                </h3>
                {events.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No events yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first event above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Slots
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {events.map((event) => {
                          const eventSlots = slots.filter((slot) => slot.eventId._id === event._id);
                          return (
                            <tr key={event._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {event.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {event.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {eventSlots.length}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => {
                                    setSelectedEvent(event._id);
                                    setActiveSection('slots');
                                  }}
                                  className="text-orange-500 hover:text-orange-600 font-medium"
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
            </section>
          )}

          {/* Slots Management */}
          {activeSection === 'slots' && (
            <section className="space-y-6">
              {selectedEvent ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <span className="w-1 h-6 bg-orange-500 rounded mr-2"></span>
                      Create New Slot for {currentEvent.name}
                    </h3>

                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={() => setIsCreatingBatch(!isCreatingBatch)}
                        className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors duration-200 flex items-center"
                      >
                        {isCreatingBatch ? (
                          <>
                            <X size={16} className="mr-1" /> Single Slot
                          </>
                        ) : (
                          <>
                            <Plus size={16} className="mr-1" /> Batch Create
                          </>
                        )}
                      </button>
                    </div>

                    {!isCreatingBatch ? (
                      // Single slot creation form
                      <form onSubmit={handleCreateSlot} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                              type="date"
                              value={newSlot.date}
                              onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={newSlot.startTime}
                              onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="time"
                              value={newSlot.endTime}
                              onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                            <input
                              type="text"
                              value={newSlot.purpose}
                              onChange={(e) => setNewSlot({ ...newSlot, purpose: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="e.g., Consultation, Meeting"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200 flex items-center"
                          >
                            <Plus size={18} className="mr-1" /> Create Slot
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Batch slot creation form
                      <form onSubmit={handleCreateBatchSlots} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={batchSlotData.startDate}
                              onChange={(e) => setBatchSlotData({ ...batchSlotData, startDate: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={batchSlotData.endDate}
                              onChange={(e) => setBatchSlotData({ ...batchSlotData, endDate: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                          <div className="flex flex-wrap gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleDayOfWeekToggle(day)}
                                className={`px-3 py-1 rounded-full text-sm ${
                                  batchSlotData.daysOfWeek.includes(day)
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
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
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="time"
                              value={batchSlotData.endTime}
                              onChange={(e) => setBatchSlotData({ ...batchSlotData, endTime: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                            <input
                              type="text"
                              value={batchSlotData.purpose}
                              onChange={(e) => setBatchSlotData({ ...batchSlotData, purpose: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="e.g., Consultation, Meeting"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200 flex items-center"
                          >
                            <Plus size={18} className="mr-1" /> Create Batch Slots
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                      <h3 className="text-lg font-medium flex items-center">
                        <span className="w-1 h-6 bg-orange-500 rounded mr-2"></span>
                        Slots for {currentEvent.name}
                      </h3>
                      <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row gap-3">
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm"
                            placeholder="Search slots..."
                          />
                        </div>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm"
                        >
                          <option value="all">All Status</option>
                          <option value="available">Available</option>
                          <option value="booked">Booked</option>
                        </select>
                      </div>
                    </div>

                    {/* Calendar View */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-700">Calendar View</h4>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={goToPreviousWeek}
                            className="p-1 rounded-full hover:bg-gray-200"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={goToCurrentWeek}
                            className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
                          >
                            Today
                          </button>
                          <button
                            onClick={goToNextWeek}
                            className="p-1 rounded-full hover:bg-gray-200"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDates.map((date, index) => {
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                          const isActive = dayName === activeDay;
                          const dateDisplay = date.toLocaleDateString('en-US', { day: 'numeric' });
                          const monthDisplay = date.toLocaleDateString('en-US', { month: 'short' });
                          return (
                            <div
                              key={index}
                              onClick={() => setActiveDay(dayName)}
                              className={`cursor-pointer p-2 rounded-md text-center ${
                                isActive
                                  ? 'bg-orange-500 text-white'
                                  : isToday(date)
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <div className="text-xs font-medium">{dayName.substring(0, 3)}</div>
                              <div className={`text-lg font-bold ${isActive ? 'text-white' : ''}`}>{dateDisplay}</div>
                              <div className="text-xs">{monthDisplay}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          {activeDay ? `Slots for ${activeDay}` : 'Select a day to view slots'}
                        </h5>
                        {activeDay && getSlotsForDay(activeDay).length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200">
                            <CalendarIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">No slots for this day</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {getSlotsForDay(activeDay).map((slot) => (
                              <div
                                key={slot._id}
                                className={`p-3 rounded-lg border-l-4 ${
                                  slot.status === 'available'
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-purple-50 border-purple-500'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {slot.startTime} - {slot.endTime}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">{slot.purpose}</p>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => setEditSlot(slot)}
                                      className="p-1 hover:bg-gray-200 rounded-full"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => setSlotToDelete(slot)}
                                      className="p-1 hover:bg-gray-200 rounded-full"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      slot.status === 'available'
                                        ? 'bg-green-200 text-green-800'
                                        : 'bg-purple-200 text-purple-800'
                                    }`}
                                  >
                                    {slot.status === 'available' ? 'Available' : 'Booked'}
                                  </span>
                                  {slot.status !== 'available' && slot.bookedBy && (
                                    <span className="text-xs text-gray-500">
                                      by {slot.bookedBy.name || 'User'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* List View */}
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-4">List View</h4>
                      {filteredSlots.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-md border border-gray-200">
                          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No slots found</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? 'Try a different search term.' : 'Create some slots for this event.'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Time
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Purpose
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Booked By
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredSlots.map((slot) => (
                                <tr key={slot._id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(slot.date)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {slot.startTime} - {slot.endTime}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {slot.purpose}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        slot.status === 'available'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-purple-100 text-purple-800'
                                      }`}
                                    >
                                      {slot.status === 'available' ? 'Available' : 'Booked'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {slot.status !== 'available' && slot.bookedBy
                                      ? slot.bookedBy.name || 'User'
                                      : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => setEditSlot(slot)}
                                        className="text-indigo-600 hover:text-indigo-900"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => setSlotToDelete(slot)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md text-center py-10">
                  <CalendarIcon className="mx-auto h-12 w-12 text-orange-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No event selected</h3>
                  <p className="mt-1 text-sm text-gray-500">Please select or create an event first.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveSection('events')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                    >
                      <Calendar className="mr-2 h-5 w-5" aria-hidden="true" />
                      Go to Events
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Edit Slot Modal */}
      {editSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Slot</h3>
            <form onSubmit={handleEditSlot}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editSlot.date.split('T')[0]}
                    onChange={(e) => setEditSlot({ ...editSlot, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editSlot.startTime}
                    onChange={(e) => setEditSlot({ ...editSlot, startTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editSlot.endTime}
                    onChange={(e) => setEditSlot({ ...editSlot, endTime: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <input
                    type="text"
                    value={editSlot.purpose}
                    onChange={(e) => setEditSlot({ ...editSlot, purpose: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editSlot.status}
                    onChange={(e) => setEditSlot({ ...editSlot, status: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditSlot(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Slot Confirmation Modal */}
      {slotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Delete Slot</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this slot on {formatDate(slotToDelete.date)} from {slotToDelete.startTime} to {slotToDelete.endTime}? 
              {slotToDelete.status === 'booked' && ' This slot is currently booked!'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSlot}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-4 right-4 animate-slide-up">
          <div className={`rounded-md p-4 shadow-lg ${notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setNotification(null)}
                    className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      notification.type === 'success'
                        ? 'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50'
                        : 'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50'
                    }`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl h-3/4 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Event Analytics & Insights</h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-blue-800">Total Events</h4>
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-blue-800">{events.length}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-green-800">Total Slots</h4>
                  <Clock className="h-6 w-6 text-green-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-green-800">{slots.length}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-purple-800">Booking Rate</h4>
                  <BarChart className="h-6 w-6 text-purple-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-purple-800">
                  {slots.length > 0 ? Math.round((slots.filter(s => s.status === 'booked').length / slots.length) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular Time Slots Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Popular Time Slots</h4>
                <div className="h-64 relative">
                  {/* In a real application, you would use a charting library here */}
                  <div className="text-center text-sm text-gray-500 absolute inset-0 flex items-center justify-center">
                    Time slot popularity visualization would appear here
                  </div>
                </div>
              </div>

              {/* Booking Trends Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Booking Trends</h4>
                <div className="h-64 relative">
                  {/* In a real application, you would use a charting library here */}
                  <div className="text-center text-sm text-gray-500 absolute inset-0 flex items-center justify-center">
                    Booking trends visualization would appear here
                  </div>
                </div>
              </div>

              {/* Event Performance Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Event Performance</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Slots
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booked Slots
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => {
                        const eventSlots = slots.filter((slot) => slot.eventId._id === event._id);
                        const bookedSlots = eventSlots.filter((slot) => slot.status === 'booked');
                        const bookingRate = eventSlots.length > 0 ? Math.round((bookedSlots.length / eventSlots.length) * 100) : 0;
                        
                        return (
                          <tr key={event._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {event.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {eventSlots.length}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {bookedSlots.length}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <span className="mr-2">{bookingRate}%</span>
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-orange-500 h-2 rounded-full" 
                                    style={{ width: `${bookingRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Slot Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.defaultSlotDuration}
                  onChange={(e) => setSettings({ ...settings, defaultSlotDuration: parseInt(e.target.value) })}
                  min="5"
                  step="5"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Time Between Slots (minutes)</label>
                <input
                  type="number"
                  value={settings.bufferTime}
                  onChange={(e) => setSettings({ ...settings, bufferTime: parseInt(e.target.value) })}
                  min="0"
                  step="5"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={settings.businessHours.start}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        businessHours: { ...settings.businessHours, start: e.target.value } 
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                    <input
                      type="time"
                      value={settings.businessHours.end}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        businessHours: { ...settings.businessHours, end: e.target.value } 
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleWorkingDayToggle(day)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        settings.workingDays.includes(day)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notification Settings</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="emailNotifications"
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        notifications: { ...settings.notifications, email: e.target.checked } 
                      })}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                      Email notifications
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="smsNotifications"
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        notifications: { ...settings.notifications, sms: e.target.checked } 
                      })}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-700">
                      SMS notifications
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Save Settings
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