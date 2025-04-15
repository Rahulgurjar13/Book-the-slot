import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BookingSection = ({ events, slots, setSlots, showNotification }) => {
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', enrollment: '', phone: '' });
  const [selectedEvent, setSelectedEvent] = useState(events?.length > 0 ? events[0]._id : null);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [currentSlot, setCurrentSlot] = useState(null);
  const [weekStartDate, setWeekStartDate] = useState(getStartOfWeek(new Date()));
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const navigate = useNavigate();

  function getStartOfWeek(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getWeekDates = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setUTCDate(date.getUTCDate() + i);
      days.push(date);
    }
    return days;
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getUTCDate() === today.getUTCDate() &&
      date.getUTCMonth() === today.getUTCMonth() &&
      date.getUTCFullYear() === today.getUTCFullYear()
    );
  };

  const getSlotsForDay = (day) => {
    if (!slots || !slots.length || !selectedEvent) return [];
    const weekDates = getWeekDates();
    const targetDate = weekDates.find((d) => getDayName(d) === day);
    if (!targetDate) return [];

    const targetDateString = targetDate.toISOString().split('T')[0];
    return slots
      .filter((slot) => slot.eventId?._id === selectedEvent && slot.date === targetDateString)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getAllSlots = () => {
    if (!slots || !slots.length || !selectedEvent) return [];
    return slots
      .filter((slot) => slot.eventId?._id === selectedEvent)
      .sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
  };

  const bookSlot = async (e) => {
    e.preventDefault();
    if (!currentSlot) {
      showNotification('No slot selected', 'error');
      return;
    }

    if (!bookingForm.name || !bookingForm.email || !bookingForm.enrollment || !bookingForm.phone) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    const bookedCount = currentSlot.bookedBy?.length || 0;
    const capacity = currentSlot.capacity || 1;
    if (bookedCount >= capacity) {
      showNotification('This slot is already full', 'error');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await axios.post(`${apiUrl}/slots/${currentSlot._id}/book`, {
        name: bookingForm.name,
        email: bookingForm.email,
        enrollment: bookingForm.enrollment,
        phone: bookingForm.phone,
      });

      setSlots(slots.map((slot) => (slot._id === currentSlot._id ? res.data : slot)));
      setIsBookingModalOpen(false);
      setCurrentSlot(null);
      setBookingForm({ name: '', email: '', enrollment: '', phone: '' });
      showNotification('Slot booked successfully!');
    } catch (error) {
      console.error('Booking error:', error.response?.data || error.message);
      showNotification(`Failed to book slot: ${error.response?.data?.message || 'Unknown error'}`, 'error');
    }
  };

  const goToPreviousWeek = () => {
    const newStartDate = new Date(weekStartDate);
    newStartDate.setUTCDate(newStartDate.getUTCDate() - 7);
    setWeekStartDate(newStartDate);
  };

  const goToNextWeek = () => {
    const newStartDate = new Date(weekStartDate);
    newStartDate.setUTCDate(newStartDate.getUTCDate() + 7);
    setWeekStartDate(newStartDate);
  };

  const goToCurrentWeek = () => {
    setWeekStartDate(getStartOfWeek(new Date()));
    setActiveDay(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  };

  const startBooking = (slot) => {
    const bookedCount = slot.bookedBy?.length || 0;
    const capacity = slot.capacity || 1;
    if (bookedCount >= capacity) {
      showNotification('This slot is already full', 'error');
      return;
    }
    setCurrentSlot(slot);
    setIsBookingModalOpen(true);
  };

  const getCurrentEventName = () => {
    const event = events?.find((e) => e._id === selectedEvent);
    return event ? event.name : 'Selected Event';
  };

  const formatSlotDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const weekDates = getWeekDates();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Event Selection Cards - Horizontal Scrolling */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Select an Event</h2>

        {!events?.length ? (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">No Events Available</h3>
            <p className="text-sm text-gray-500">Check back later for upcoming events</p>
          </div>
        ) : (
          <div className="overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="flex space-x-3 sm:space-x-4 min-w-max py-2">
              {events.map((event) => (
                <div
                  key={event._id}
                  onClick={() => setSelectedEvent(event._id)}
                  className={`flex-shrink-0 w-56 sm:w-64 rounded-lg shadow-sm transition-all duration-200 cursor-pointer snap-start 
                    ${selectedEvent === event._id ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}
                >
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{event.name}</h3>
                      {selectedEvent === event._id && (
                        <span className="flex items-center justify-center bg-blue-500 rounded-full w-4 h-4 sm:w-5 sm:h-5">
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{event.description}</p>
                    <div className="flex items-center text-xs text-blue-600">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>View schedule</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Booking Interface */}
      {selectedEvent && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header with controls and view switcher */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">{getCurrentEventName()}</h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-1">Book your preferred time slot</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex bg-white bg-opacity-20 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-md flex items-center ${viewMode === 'calendar' ? 'bg-white text-blue-600' : 'text-white'}`}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendar
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-md flex items-center ${viewMode === 'list' ? 'bg-white text-blue-600' : 'text-white'}`}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    List
                  </button>
                </div>

                {viewMode === 'calendar' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={goToPreviousWeek}
                      className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xs sm:text-sm"
                      aria-label="Previous week"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    <button
                      onClick={goToCurrentWeek}
                      className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xs sm:text-sm"
                      aria-label="Current week"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Today
                    </button>
                    <button
                      onClick={goToNextWeek}
                      className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xs sm:text-sm"
                      aria-label="Next week"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <>
              <div className="grid grid-cols-7 border-b border-gray-200 overflow-x-auto snap-x snap-mandatory">
                {weekDates.map((date, index) => {
                  const dayName = getDayName(date);
                  const isCurrentDay = isToday(date);
                  const slotsCount = getSlotsForDay(dayName).length;
                  const isActive = activeDay === dayName;

                  return (
                    <button
                      key={index}
                      onClick={() => setActiveDay(dayName)}
                      className={`relative flex flex-col items-center py-2 sm:py-3 transition-colors snap-start min-w-[80px] sm:min-w-[100px] ${
                        isActive ? 'bg-blue-50' : isCurrentDay ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : isCurrentDay ? 'text-green-600' : 'text-gray-500'}`}>
                        {dayName.substring(0, 3).toUpperCase()}
                      </span>
                      <span className={`text-base sm:text-xl font-bold mt-1 ${isActive ? 'text-blue-600' : isCurrentDay ? 'text-green-600' : 'text-gray-800'}`}>
                        {date.getUTCDate()}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                      {slotsCount > 0 && (
                        <div
                          className={`absolute top-1 sm:top-2 right-1 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                            isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {slotsCount}
                        </div>
                      )}
                      {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>}
                      {!isActive && isCurrentDay && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500"></div>}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">
                    {formatDate(weekDates.find((d) => getDayName(d) === activeDay))}
                  </h3>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0">
                    <span className="flex items-center mr-4">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 mr-1"></span>
                      Available
                    </span>
                    <span className="flex items-center">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 mr-1"></span>
                      Full
                    </span>
                  </div>
                </div>

                {getSlotsForDay(activeDay).length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">No Slots Available</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Try selecting a different day or check back later</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {getSlotsForDay(activeDay).map((slot) => {
                      const isFull = (slot.bookedBy?.length || 0) >= (slot.capacity || 1);
                      const bookedNames = slot.bookedBy?.length > 0 ? slot.bookedBy.map((b) => b.name).join(', ') : 'None';
                      return (
                        <div
                          key={slot._id}
                          className={`relative rounded-lg border transition-all duration-150 overflow-hidden ${
                            !isFull ? 'border-green-200 hover:border-green-400 hover:shadow-md' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className={`h-1 w-full ${!isFull ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="p-3 sm:p-4">
                            <div className="flex justify-between mb-2">
                              <div className="flex items-center">
                                <svg
                                  className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-1.5 ${!isFull ? 'text-green-500' : 'text-red-500'}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm sm:text-base font-medium text-gray-900">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  !isFull ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {(slot.bookedBy?.length || 0)}/{slot.capacity || 1} booked
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{slot.purpose}</p>
                            <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                              <span className="font-medium">Booked by:</span> {bookedNames}
                            </div>
                            {!isFull ? (
                              <button
                                onClick={() => startBooking(slot)}
                                className="w-full flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded transition-colors duration-150"
                              >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Book This Slot
                              </button>
                            ) : (
                              <div className="w-full py-1.5 sm:py-2 text-center text-gray-500 text-xs sm:text-sm bg-gray-100 rounded cursor-not-allowed">
                                <span>Slot Full</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">All Available Slots</h3>
                <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0">
                  <span className="flex items-center mr-4">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 mr-1"></span>
                    Available
                  </span>
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 mr-1"></span>
                    Full
                  </span>
                </div>
              </div>

              {getAllSlots().length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">No Slots Available</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Check back later for available slots</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purpose
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booked By
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getAllSlots().map((slot) => {
                        const isFull = (slot.bookedBy?.length || 0) >= (slot.capacity || 1);
                        const bookedNames = slot.bookedBy?.length > 0 ? slot.bookedBy.map((b) => b.name).join(', ') : 'None';
                        return (
                          <tr key={slot._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{formatSlotDate(slot.date)}</td>
                            <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                              {slot.startTime} - {slot.endTime}
                            </td>
                            <td className="px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-[100px] sm:max-w-xs truncate">{slot.purpose}</td>
                            <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  !isFull ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full mr-1 ${!isFull ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {(slot.bookedBy?.length || 0)}/{slot.capacity || 1}
                              </span>
                            </td>
                            <td className="px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm text-gray-600 truncate">{bookedNames}</td>
                            <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                              {!isFull ? (
                                <button
                                  onClick={() => startBooking(slot)}
                                  className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                                >
                                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Book
                                </button>
                              ) : (
                                <span className="text-gray-500 text-xs">Slot Full</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Booking Modal */}
          {isBookingModalOpen && currentSlot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 sm:p-6">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg overflow-hidden animate-fadeIn">
                <div className="relative">
                  <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                    <button
                      onClick={() => setIsBookingModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 sm:p-2 rounded-full bg-white hover:bg-gray-100"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 text-white">
                    <h3 className="text-lg sm:text-xl font-bold mb-1">Book Your Slot</h3>
                    <p className="text-blue-100 text-xs sm:text-sm">Complete the form to secure your booking</p>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Booking Details</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Event:</span>
                        <span className="font-medium text-gray-900">{getCurrentEventName()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium text-gray-900">{formatSlotDate(currentSlot.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium text-gray-900">
                          {currentSlot.startTime} - {currentSlot.endTime}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purpose:</span>
                        <span className="font-medium text-gray-900">{currentSlot.purpose}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacity:</span>
                        <span className="font-medium text-gray-900">
                          {(currentSlot.bookedBy?.length || 0)}/{currentSlot.capacity || 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={bookSlot}>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter your full name"
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter your email address"
                          value={bookingForm.email}
                          onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="enrollment" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Enrollment/ID Number
                        </label>
                        <input
                          type="text"
                          id="enrollment"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter your enrollment or ID number"
                          value={bookingForm.enrollment}
                          onChange={(e) => setBookingForm({ ...bookingForm, enrollment: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter your phone number"
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-6">
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-md transition-colors duration-150"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Confirm Booking
                      </button>
                    </div>
                  </form>
                  <div className="mt-3 sm:mt-4 text-center text-xs text-gray-500">By booking this slot, you agree to the terms and conditions</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingSection;