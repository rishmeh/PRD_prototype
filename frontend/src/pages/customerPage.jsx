import React, { useState, useEffect } from 'react';
import '../css/CustomerPage.css';

const CustomerPage = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [technicians, setTechnicians] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    expertise: '',
    location: '',
    minRating: 0
  });

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    technicianId: '',
    serviceType: '',
    scheduledDate: '',
    scheduledTime: '',
    address: '',
    description: ''
  });

  // Profile update form state
  const [profileForm, setProfileForm] = useState({
    userName: '',
    email: '',
    phone: ''
  });

  const token = localStorage.getItem('token');

  // Check if user has customer role
  useEffect(() => {
    const checkCustomerRole = async () => {
      if (!token) {
        alert('Please login to access customer panel');
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('http://localhost:8080/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const user = await res.json();
          if (user.role !== 'customer') {
            alert('Access denied. Customer privileges required.');
            window.location.href = '/';
            return;
          }
        } else {
          alert('Authentication failed');
          window.location.href = '/login';
          return;
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        alert('Authentication error');
        window.location.href = '/login';
        return;
      }
    };

    checkCustomerRole();
  }, [token]);

  // Polling for real-time booking updates
  useEffect(() => {
    if (!token) return;

    const pollBookings = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/bookings/customer', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const bookingData = await res.json();

          // Check for status changes and show notifications
          if (bookings.length > 0) {
            bookingData.forEach(newBooking => {
              const oldBooking = bookings.find(b => b._id === newBooking._id);
              if (oldBooking && oldBooking.status !== newBooking.status) {
                if (newBooking.status === 'in_progress') {
                  alert(`🔧 Your booking #${newBooking._id.slice(-6)} is now in progress!`);
                } else if (newBooking.status === 'completed') {
                  alert(`✅ Your booking #${newBooking._id.slice(-6)} has been completed!`);
                } else if (newBooking.status === 'accepted') {
                  alert(`👍 Your booking #${newBooking._id.slice(-6)} has been accepted!`);
                } else if (newBooking.status === 'rejected') {
                  alert(`❌ Your booking #${newBooking._id.slice(-6)} has been rejected.`);
                }
              }
            });
          }

          setBookings(bookingData);
        }
      } catch (err) {
        console.error('Error polling bookings:', err);
      }
    };

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(pollBookings, 30000);

    return () => clearInterval(interval);
  }, [token, bookings]);

  // Helper function to format hour for display
  const formatHour = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  // Helper function to format availability for display
  const formatAvailability = (dayAvailability) => {
    if (!dayAvailability) return "Not available";

    // Handle both old string format and new object format
    if (typeof dayAvailability === 'string') {
      return dayAvailability;
    }

    if (typeof dayAvailability === 'object' && dayAvailability.available) {
      const startHour = dayAvailability.startHour || 0;
      const endHour = dayAvailability.endHour || 23;
      return `${formatHour(startHour)} - ${formatHour(endHour)}`;
    }

    return "Not available";
  };

  // Helper function to get available days for a technician
  const getAvailableDaysCount = (availability) => {
    if (!availability) return 0;

    return Object.values(availability).filter(dayAvail => {
      if (typeof dayAvail === 'string') {
        return dayAvail !== "Not available" && dayAvail.trim() !== "";
      }
      return dayAvail && dayAvail.available;
    }).length;
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile
        const userRes = await fetch('http://localhost:8080/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserProfile(userData);
          setProfileForm({
            userName: userData.userName || '',
            email: userData.email || '',
            phone: userData.phone || ''
          });
        }

        // Fetch approved technicians
        const techRes = await fetch('http://localhost:8080/api/technicians', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (techRes.ok) {
          const techData = await techRes.json();
          // Only show approved technicians
          const approvedTechs = techData.filter(tech => tech.kycStatus === 'approved');
          setTechnicians(approvedTechs);
        }

        // Fetch user bookings
        const bookingRes = await fetch('http://localhost:8080/api/bookings/customer', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingRes.ok) {
          const bookingData = await bookingRes.json();
          setBookings(bookingData);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Filter technicians based on search criteria
  const filteredTechnicians = technicians.filter(tech => {
    const matchesExpertise = !searchFilters.expertise || 
      tech.expertise?.some(exp => exp.toLowerCase().includes(searchFilters.expertise.toLowerCase()));

    const matchesLocation = !searchFilters.location || 
      tech.serviceAreas?.some(area => area.toLowerCase().includes(searchFilters.location.toLowerCase()));

    const matchesRating = tech.avgRating >= searchFilters.minRating;

    return matchesExpertise && matchesLocation && matchesRating;
  });

  // Handle technician selection in booking form
  const handleTechnicianSelection = (technicianId) => {
    const tech = technicians.find(t => t._id === technicianId);
    setSelectedTechnician(tech);
    setBookingForm({
      ...bookingForm,
      technicianId,
      serviceType: '' // Reset service type when technician changes
    });
  };

  // Handle booking submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:8080/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bookingForm)
      });

      if (res.ok) {
        alert('Booking request submitted successfully!');
        setBookingForm({
          technicianId: '',
          serviceType: '',
          scheduledDate: '',
          scheduledTime: '',
          address: '',
          description: ''
        });
        setSelectedTechnician(null);
        // Refresh bookings
        const bookingRes = await fetch('http://localhost:8080/api/bookings/customer', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingRes.ok) {
          const bookingData = await bookingRes.json();
          setBookings(bookingData);
        }
      } else {
        alert('Failed to submit booking request');
      }
    } catch (err) {
      console.error('Error submitting booking:', err);
      alert('Failed to submit booking request');
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:8080/api/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUserProfile(updatedUser);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    }
  };

  // Book a technician
  const bookTechnician = (technicianId) => {
    handleTechnicianSelection(technicianId);
    setActiveTab('assistant');
  };

  // Submit review for completed booking
  const submitReview = async (bookingId, rating, comment) => {
    try {
      const res = await fetch('http://localhost:8080/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId,
          rating: parseInt(rating),
          comment: comment || ''
        })
      });

      if (res.ok) {
        alert('Review submitted successfully!');
        // Refresh bookings to show review submitted
        const bookingRes = await fetch('http://localhost:8080/api/bookings/customer', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingRes.ok) {
          const bookingData = await bookingRes.json();
          setBookings(bookingData);
        }
      } else {
        alert('Failed to submit review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review');
    }
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!token) {
    return <div className="error-container">Please login to access this page.</div>;
  }

  return (
    <div className="customer-container">
      <div className="customer-header">
        <h1>Customer Dashboard</h1>
        <p>Welcome, {userProfile?.userName || 'Customer'}!</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-navigation">
        {[
          { key: 'home', label: 'Home', icon: '🏠' },
          { key: 'assistant', label: 'Book Service', icon: '📅' },
          { key: 'bookings', label: 'My Bookings', icon: '📋' },
          { key: 'profile', label: 'Profile', icon: '👤' }
        ].map(tab => (
          <button 
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Home Tab - Browse Technicians */}
      {activeTab === 'home' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Find Technicians</h2>
            <p>Browse and book qualified technicians in your area</p>
          </div>

          {/* Search Filters */}
          <div className="filters-section">
            <h3>Search Filters</h3>
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="expertise">Expertise:</label>
                <select 
                  id="expertise"
                  value={searchFilters.expertise}
                  onChange={(e) => setSearchFilters({...searchFilters, expertise: e.target.value})}
                  className="filter-select"
                >
                  <option value="">All Services</option>
                  <option value="AC">AC Repair</option>
                  <option value="Refrigerator">Refrigerator Repair</option>
                  <option value="Washing Machine">Washing Machine Repair</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="location">Location:</label>
                <input
                  type="text"
                  id="location"
                  placeholder="Enter location"
                  value={searchFilters.location}
                  onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label htmlFor="minRating">Minimum Rating:</label>
                <select 
                  id="minRating"
                  value={searchFilters.minRating}
                  onChange={(e) => setSearchFilters({...searchFilters, minRating: parseFloat(e.target.value)})}
                  className="filter-select"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3}>3+ Stars</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technicians List */}
          <div className="technicians-section">
            <div className="section-header">
              <h3>Available Technicians ({filteredTechnicians.length})</h3>
            </div>
            {filteredTechnicians.length === 0 ? (
              <div className="no-results">
                <p>No technicians found matching your criteria.</p>
              </div>
            ) : (
              <div className="technicians-grid">
                {filteredTechnicians.map((tech) => (
                  <div key={tech._id} className="technician-card">
                    <div className="tech-header">
                      <h4>{tech.userId?.userName}</h4>
                      <div className="rating-badge">
                        ⭐ {tech.avgRating ? `${tech.avgRating}/5` : 'New'} 
                        <span className="review-count">({tech.totalReviews || 0})</span>
                      </div>
                    </div>

                    <div className="tech-details">
                      <div className="detail-row">
                        <span className="detail-label">Expertise:</span>
                        <span className="detail-value">{tech.expertise?.join(', ') || 'Not specified'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Service Areas:</span>
                        <span className="detail-value">{tech.serviceAreas?.join(', ') || 'Not specified'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Pricing:</span>
                        <span className="detail-value pricing">${tech.pricing}/hour</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Contact:</span>
                        <span className="detail-value">{tech.userId?.phone}</span>
                      </div>
                    </div>

                    <div className="availability-preview">
                      <h5>Availability ({getAvailableDaysCount(tech.availability)} days available):</h5>
                      <div className="availability-days">
                        {tech.availability && Object.entries(tech.availability).slice(0, 3).map(([day, dayAvailability]) => (
                          <div key={day} className="day-time">
                            <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                            <span className="time">{formatAvailability(dayAvailability)}</span>
                          </div>
                        ))}
                        {tech.availability && Object.keys(tech.availability).length > 3 && (
                          <div className="more-days">+{Object.keys(tech.availability).length - 3} more days</div>
                        )}
                      </div>
                    </div>

                    <button 
                      className="book-btn"
                      onClick={() => bookTechnician(tech._id)}
                    >
                      Book This Technician
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Assistant Tab - Book Service */}
      {activeTab === 'assistant' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Book a Service</h2>
            <p>Schedule a service appointment with your preferred technician</p>
          </div>

          <div className="booking-form-container">
            <form className="booking-form" onSubmit={handleBookingSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="technicianId">Select Technician:</label>
                  <select 
                    id="technicianId"
                    value={bookingForm.technicianId}
                    onChange={(e) => handleTechnicianSelection(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">Choose a technician</option>
                    {technicians.map((tech) => (
                      <option key={tech._id} value={tech._id}>
                        {tech.userId?.userName} | {tech.expertise?.join(', ')} | ${tech.pricing}/hr 
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show selected technician details */}
                {selectedTechnician && (
                  <div className="selected-technician-info">
                    <h4>Selected Technician Details:</h4>
                    <div className="tech-info-grid">
                      <div><strong>Name:</strong> {selectedTechnician.userId?.userName}</div>
                      <div><strong>Phone:</strong> {selectedTechnician.userId?.phone}</div>
                      <div><strong>Email:</strong> {selectedTechnician.userId?.email}</div>
                      <div><strong>Expertise:</strong> {selectedTechnician.expertise?.join(', ')}</div>
                      <div><strong>Service Areas:</strong> {selectedTechnician.serviceAreas?.join(', ')}</div>
                      <div><strong>Pricing:</strong> ${selectedTechnician.pricing}/hour</div>
                      <div><strong>Rating:</strong> ⭐{selectedTechnician.avgRating || 'New'} ({selectedTechnician.totalReviews || 0} reviews)</div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="serviceType">Service Type:</label>
                  <select 
                    id="serviceType"
                    value={bookingForm.serviceType}
                    onChange={(e) => setBookingForm({...bookingForm, serviceType: e.target.value})}
                    required
                    className="form-select"
                    disabled={!selectedTechnician}
                  >
                    <option value="">
                      {selectedTechnician ? 'Select from available services' : 'Please select a technician first'}
                    </option>
                    {selectedTechnician && selectedTechnician.expertise?.map(service => (
                      <option key={service} value={service}>
                        {service} Repair
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="scheduledDate">Preferred Date:</label>
                  <input
                    type="date"
                    id="scheduledDate"
                    value={bookingForm.scheduledDate}
                    onChange={(e) => setBookingForm({...bookingForm, scheduledDate: e.target.value})}
                    required
                    className="form-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="scheduledTime">Preferred Time:</label>
                  <input
                    type="time"
                    id="scheduledTime"
                    value={bookingForm.scheduledTime}
                    onChange={(e) => setBookingForm({...bookingForm, scheduledTime: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="address">Service Address:</label>
                <textarea
                  id="address"
                  value={bookingForm.address}
                  onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                  placeholder="Enter your full address"
                  required
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Problem Description:</label>
                <textarea
                  id="description"
                  value={bookingForm.description}
                  onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                  placeholder="Describe the issue in detail"
                  required
                  className="form-textarea"
                  rows="4"
                />
              </div>

              <button type="submit" className="submit-btn">Submit Booking Request</button>
            </form>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>My Bookings</h2>
            <p>Track and manage your service appointments</p>
            <div className="auto-refresh-notice">
              🔄 Booking status updates automatically every 30 seconds
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="no-bookings">
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No bookings yet</h3>
                <p>When you book a service, it will appear here.</p>
                <button 
                  className="cta-btn"
                  onClick={() => setActiveTab('home')}
                >
                  Browse Technicians
                </button>
              </div>
            </div>
          ) : (
            <div className="bookings-grid">
              {bookings.map((booking) => (
                <div key={booking._id} className="booking-card">
                  <div className="booking-header">
                    <h3>Booking #{booking._id.slice(-6)}</h3>
                    <span className={`booking-status ${booking.status}`}>
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="booking-info">
                    <div className="info-row">
                      <span className="info-label">Technician:</span>
                      <span className="info-value">{booking.technicianId?.userName}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Service:</span>
                      <span className="info-value">{booking.serviceType}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Date:</span>
                      <span className="info-value">{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Time:</span>
                      <span className="info-value">{booking.scheduledTime}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Address:</span>
                      <span className="info-value">{booking.address}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Description:</span>
                      <span className="info-value">{booking.description}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Created:</span>
                      <span className="info-value">{new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Status-specific messages */}
                  {booking.status === 'in_progress' && (
                    <div className="status-message in-progress">
                      🔧 Your service is currently in progress!
                    </div>
                  )}

                  {booking.status === 'completed' && (
                    <div className="status-message completed">
                      ✅ Service completed! Please leave a review.
                    </div>
                  )}

                  {booking.status === 'completed' && !booking.reviewId && (
                    <div className="review-section">
                      <h4>Leave a Review</h4>
                      <button 
                        className="review-btn"
                        onClick={() => {
                          const rating = prompt('Rate this service (1-5):');
                          const comment = prompt('Leave a comment (optional):');
                          if (rating && rating >= 1 && rating <= 5) {
                            submitReview(booking._id, rating, comment);
                          }
                        }}
                      >
                        Leave Review ⭐
                      </button>
                    </div>
                  )}

                  {booking.reviewId && (
                    <div className="review-submitted">
                      ✅ Review submitted
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>My Profile</h2>
            <p>Manage your account information</p>
          </div>

          <div className="profile-container">
            {userProfile && (
              <div className="current-profile">
                <h3>Current Information</h3>
                <div className="profile-info">
                  <div className="profile-item">
                    <span className="profile-label">Name:</span>
                    <span className="profile-value">{userProfile.userName}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Email:</span>
                    <span className="profile-value">{userProfile.email}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Phone:</span>
                    <span className="profile-value">{userProfile.phone}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Role:</span>
                    <span className="profile-value role">{userProfile.role}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Status:</span>
                    <span className={`profile-value status ${userProfile.status}`}>{userProfile.status}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Member since:</span>
                    <span className="profile-value">{new Date(userProfile.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="profile-form-container">
              <h3>Update Profile</h3>
              <form className="profile-form" onSubmit={handleProfileUpdate}>
                <div className="form-group">
                  <label htmlFor="userName">Name:</label>
                  <input
                    type="text"
                    id="userName"
                    value={profileForm.userName}
                    onChange={(e) => setProfileForm({...profileForm, userName: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone:</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>

                <button type="submit" className="submit-btn">Update Profile</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPage;