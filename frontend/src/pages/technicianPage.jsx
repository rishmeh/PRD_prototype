import React, { useEffect, useState } from "react";
import '../css/TechnicianPage.css';

const TechnicianPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [techProfile, setTechProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [parts, setParts] = useState([]);
  const [orderedParts, setOrderedParts] = useState([]);
  const [kycFiles, setKycFiles] = useState({
    IDImage: null,
    Photo: null
  });
  const [expertise, setExpertise] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [pricing, setPricing] = useState("");
  const [availability, setAvailability] = useState({
    monday: { available: false, startHour: 9, endHour: 17 },
    tuesday: { available: false, startHour: 9, endHour: 17 },
    wednesday: { available: false, startHour: 9, endHour: 17 },
    thursday: { available: false, startHour: 9, endHour: 17 },
    friday: { available: false, startHour: 9, endHour: 17 },
    saturday: { available: false, startHour: 9, endHour: 17 },
    sunday: { available: false, startHour: 9, endHour: 17 }
  });

  const token = localStorage.getItem("token");

  // Check if user has technician role
  useEffect(() => {
    const checkTechnicianRole = async () => {
      if (!token) {
        alert('Please login to access technician panel');
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('http://localhost:8080/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const user = await res.json();
          if (user.role !== 'technician') {
            alert('Access denied. Technician privileges required.');
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

    checkTechnicianRole();
  }, [token]);

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  // Format hour for display (0 -> 12 AM, 13 -> 1 PM, etc.)
  const formatHour = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  // Format availability for display
  const formatAvailability = (dayAvailability) => {
    if (!dayAvailability || !dayAvailability.available) return "Not available";
    return `${formatHour(dayAvailability.startHour)} - ${formatHour(dayAvailability.endHour)}`;
  };

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user info
        const userRes = await fetch("http://localhost:8080/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = await userRes.json();

        // Fetch technician profile
        const techRes = await fetch("http://localhost:8080/api/technicians", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (techRes.ok) {
          const techData = await techRes.json();
          const userTech = techData.find(t => t.userId._id === user._id);

          if (userTech) {
            setTechProfile(userTech);
            setExpertise(userTech.expertise || []);
            setServiceAreas(userTech.serviceAreas || []);
            setPricing(userTech.pricing || "");

            // Handle availability
            if (userTech.availability) {
              const newAvailability = {};
              Object.keys(availability).forEach(day => {
                if (userTech.availability[day]) {
                  if (typeof userTech.availability[day] === 'string') {
                    newAvailability[day] = {
                      available: userTech.availability[day] !== "Not available",
                      startHour: 9,
                      endHour: 17
                    };
                  } else {
                    newAvailability[day] = {
                      available: userTech.availability[day].available || false,
                      startHour: userTech.availability[day].startHour || 9,
                      endHour: userTech.availability[day].endHour || 17
                    };
                  }
                } else {
                  newAvailability[day] = { available: false, startHour: 9, endHour: 17 };
                }
              });
              setAvailability(newAvailability);
            }

            // Fetch bookings and parts if KYC is approved
            if (userTech.kycStatus === "approved") {
              await Promise.all([
                fetchBookings(),
                fetchParts(),
                fetchOrderedParts()
              ]);
            }
          }
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [token]);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/technicians/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const bookingData = await res.json();
        setBookings(bookingData);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  // Fetch parts
  const fetchParts = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/parts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const partsData = await res.json();
        setParts(partsData);
      }
    } catch (err) {
      console.error("Error fetching parts:", err);
    }
  };

  // Fetch ordered parts
  const fetchOrderedParts = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/parts/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const ordersData = await res.json();
        setOrderedParts(ordersData);
      }
    } catch (err) {
      console.error("Error fetching ordered parts:", err);
    }
  };

  // Order a part
  const orderPart = async (partId) => {
    try {
      const res = await fetch("http://localhost:8080/api/parts/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          p_id: partId,
          status: 'placed'
        })
      });

      if (res.ok) {
        alert("Part ordered successfully!");
        fetchOrderedParts(); // Refresh ordered parts
      } else {
        alert("Failed to order part");
      }
    } catch (err) {
      console.error("Error ordering part:", err);
      alert("Failed to order part");
    }
  };

  const handleFileChange = (e) => {
    setKycFiles({
      ...kycFiles,
      [e.target.name]: e.target.files[0]
    });
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();

    if (!kycFiles.IDImage || !kycFiles.Photo) {
      alert("Please upload both ID and Photo");
      return;
    }

    const formData = new FormData();
    formData.append("IDImage", kycFiles.IDImage);
    formData.append("Photo", kycFiles.Photo);

    try {
      const res = await fetch("http://localhost:8080/api/technicians/kyc", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        alert("KYC documents submitted successfully! Please wait for admin approval.");
        window.location.reload();
      } else {
        alert("Failed to submit KYC documents");
      }
    } catch (err) {
      console.error("Error submitting KYC:", err);
      alert("Failed to submit KYC documents");
    }
  };

  const handleExpertiseChange = (e) => {
    const value = e.target.value;
    if (e.target.checked) {
      setExpertise([...expertise, value]);
    } else {
      setExpertise(expertise.filter(item => item !== value));
    }
  };

  const handleServiceAreaChange = (e) => {
    const areas = e.target.value.split(",").map(area => area.trim());
    setServiceAreas(areas);
  };

  const handleAvailabilityChange = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: field === 'available' ? value : parseInt(value)
      }
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      const profileData = {
        expertise,
        serviceAreas,
        availability,
        pricing: parseFloat(pricing) || 0
      };

      const res = await fetch("http://localhost:8080/api/technicians", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (res.ok) {
        const data = await res.json();
        setTechProfile(data);
        alert("Profile saved successfully!");
      } else {
        alert("Failed to save profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile");
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const res = await fetch(`http://localhost:8080/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        alert("Booking status updated successfully!");
        fetchBookings(); // Refresh bookings
      } else {
        alert("Failed to update booking status");
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      alert("Failed to update booking status");
    }
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!token) {
    return <div className="error-container">Please login to access this page.</div>;
  }

  // KYC Status Messages
  const getKycStatusMessage = () => {
    if (!techProfile) return null;

    switch (techProfile.kycStatus) {
      case "pending":
        return (
          <div className="kyc-status pending">
            <h2>KYC Verification Required</h2>
            <p>Your KYC verification is pending. Please submit your documents or wait for admin approval.</p>
            <p>You cannot access bookings and parts until your KYC is approved.</p>
          </div>
        );
      case "rejected":
        return (
          <div className="kyc-status rejected">
            <h2>KYC Verification Rejected</h2>
            <p>Your KYC verification was rejected. Please resubmit your documents.</p>
            <p>You cannot access bookings and parts until your KYC is approved.</p>
          </div>
        );
      case "approved":
        return (
          <div className="kyc-status approved">
            <h2>KYC Verification Approved</h2>
            <p>Your KYC is approved! You can now access all technician features.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="technician-container">
      <div className="technician-header">
        <h1>Technician Dashboard</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="technician-tabs">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: '📊' },
          { key: 'profile', label: 'Profile', icon: '👤' },
          ...(techProfile && techProfile.kycStatus === 'approved' ? [
            { key: 'bookings', label: 'Bookings', icon: '📅' },
            { key: 'parts', label: 'Parts', icon: '⚙️' },
            { key: 'orders', label: 'My Orders', icon: '📦' }
          ] : [])
        ].map(tab => (
          <button 
            key={tab.key}
            className={`tech-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-text">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* KYC Status Section */}
      {getKycStatusMessage()}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="tab-content">
          {/* KYC Upload Form - only show if not approved */}
          {techProfile && techProfile.kycStatus !== "approved" && (
            <div className="kyc-upload-section">
              <h2>Submit KYC Documents</h2>
              <form className="kyc-form" onSubmit={handleKycSubmit}>
                <div className="file-upload-group">
                  <label htmlFor="IDImage">ID Document:</label>
                  <input
                    type="file"
                    id="IDImage"
                    name="IDImage"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="file-input"
                  />
                </div>
                <div className="file-upload-group">
                  <label htmlFor="Photo">Photo:</label>
                  <input
                    type="file"
                    id="Photo"
                    name="Photo"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="file-input"
                  />
                </div>
                <button type="submit" className="submit-btn">Submit KYC Documents</button>
              </form>
            </div>
          )}

          {/* Profile Information */}
          {techProfile && (
            <div className="profile-info-section">
              <h2>Profile Information</h2>
              <div className="profile-info-grid">
                <div className="info-item">
                  <label>Expertise:</label>
                  <span>{techProfile.expertise?.join(", ") || "Not specified"}</span>
                </div>
                <div className="info-item">
                  <label>Service Areas:</label>
                  <span>{techProfile.serviceAreas?.join(", ") || "Not specified"}</span>
                </div>
                <div className="info-item">
                  <label>Pricing:</label>
                  <span>${techProfile.pricing || "Not set"}</span>
                </div>
                <div className="info-item">
                  <label>KYC Status:</label>
                  <span className={`status-badge ${techProfile.kycStatus}`}>
                    {techProfile.kycStatus || "Pending"}
                  </span>
                </div>
                <div className="info-item">
                  <label>Average Rating:</label>
                  <span>{techProfile.avgRating || "No ratings yet"}</span>
                </div>
                <div className="info-item">
                  <label>Total Reviews:</label>
                  <span>{techProfile.totalReviews || 0}</span>
                </div>
              </div>

              <div className="availability-section">
                <h3>Availability</h3>
                <div className="availability-grid">
                  {Object.entries(techProfile.availability || {}).map(([day, dayAvailability]) => (
                    <div key={day} className="availability-item">
                      <label>{day.charAt(0).toUpperCase() + day.slice(1)}:</label>
                      <span>{formatAvailability(dayAvailability)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="tab-content">
          <div className="profile-form-section">
            <h2>{techProfile ? "Update Profile" : "Complete Your Profile"}</h2>
            <form className="profile-form" onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label>Expertise:</label>
                <div className="checkbox-group">
                  {["AC", "Refrigerator", "Washing Machine"].map(skill => (
                    <label key={skill} className="checkbox-label">
                      <input
                        type="checkbox"
                        value={skill}
                        checked={expertise.includes(skill)}
                        onChange={handleExpertiseChange}
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="serviceAreas">Service Areas (comma separated):</label>
                <input
                  type="text"
                  id="serviceAreas"
                  value={serviceAreas.join(", ")}
                  onChange={handleServiceAreaChange}
                  placeholder="e.g., Downtown, Suburbs, North Side"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="pricing">Hourly Pricing ($):</label>
                <input
                  type="number"
                  id="pricing"
                  value={pricing}
                  onChange={(e) => setPricing(e.target.value)}
                  placeholder="Enter hourly rate"
                  className="form-input"
                />
              </div>

              <div className="availability-form">
                <h3>Availability Schedule</h3>
                <div className="availability-inputs">
                  {Object.keys(availability).map(day => (
                    <div key={day} className="day-availability">
                      <div className="day-header">
                        <label className="day-label">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </label>
                        <label className="availability-toggle">
                          <input
                            type="checkbox"
                            checked={availability[day].available}
                            onChange={(e) => handleAvailabilityChange(day, 'available', e.target.checked)}
                          />
                          <span>Available</span>
                        </label>
                      </div>

                      {availability[day].available && (
                        <div className="time-selectors">
                          <div className="time-group">
                            <label>Start Hour:</label>
                            <select
                              value={availability[day].startHour}
                              onChange={(e) => handleAvailabilityChange(day, 'startHour', e.target.value)}
                              className="hour-select"
                            >
                              {hourOptions.map(hour => (
                                <option key={hour} value={hour}>
                                  {formatHour(hour)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="time-group">
                            <label>End Hour:</label>
                            <select
                              value={availability[day].endHour}
                              onChange={(e) => handleAvailabilityChange(day, 'endHour', e.target.value)}
                              className="hour-select"
                            >
                              {hourOptions.map(hour => (
                                <option key={hour} value={hour}>
                                  {formatHour(hour)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="submit-btn">
                {techProfile ? "Update Profile" : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bookings Tab - only show if KYC is approved */}
      {activeTab === 'bookings' && techProfile && techProfile.kycStatus === "approved" && (
        <div className="tab-content">
          <div className="bookings-section">
            <h2>My Bookings</h2>
            {bookings.length === 0 ? (
              <div className="no-bookings">
                <p>No bookings yet.</p>
              </div>
            ) : (
              <div className="bookings-grid">
                {bookings.map((booking) => (
                  <div key={booking._id} className="booking-card">
                    <div className="booking-header">
                      <h3>Booking #{booking._id.slice(-6)}</h3>
                      <span className={`booking-status ${booking.status}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="booking-details">
                      <div className="detail-item">
                        <label>Customer:</label>
                        <span>{booking.customerId?.userName}</span>
                      </div>
                      <div className="detail-item">
                        <label>Service:</label>
                        <span>{booking.serviceType}</span>
                      </div>
                      <div className="detail-item">
                        <label>Date:</label>
                        <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <label>Time:</label>
                        <span>{booking.scheduledTime}</span>
                      </div>
                      <div className="detail-item">
                        <label>Address:</label>
                        <span>{booking.address}</span>
                      </div>
                      <div className="detail-item">
                        <label>Phone:</label>
                        <span>{booking.customerId?.phone}</span>
                      </div>
                      <div className="detail-item">
                        <label>Description:</label>
                        <span>{booking.description}</span>
                      </div>
                    </div>

                    <div className="booking-actions">
                      {booking.status === "pending" && (
                        <>
                          <button 
                            onClick={() => updateBookingStatus(booking._id, "accepted")}
                            className="action-btn accept"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(booking._id, "rejected")}
                            className="action-btn reject"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {booking.status === "accepted" && (
                        <>
                          <button 
                            onClick={() => updateBookingStatus(booking._id, "in_progress")}
                            className="action-btn progress"
                          >
                            Mark In Progress
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(booking._id, "completed")}
                            className="action-btn complete"
                          >
                            Mark Complete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parts Tab - only show if KYC is approved */}
      {activeTab === 'parts' && techProfile && techProfile.kycStatus === "approved" && (
        <div className="tab-content">
          <div className="parts-section">
            <h2>Available Parts</h2>
            {parts.length === 0 ? (
              <div className="no-parts">
                <p>No parts available.</p>
              </div>
            ) : (
              <div className="parts-grid">
                {parts.map((part) => (
                  <div key={part._id} className="part-card">
                    <div className="part-header">
                      <h3>{part.name}</h3>
                      <span className="part-price">${part.price}</span>
                    </div>

                    <div className="part-details">
                      <div className="part-info">
                        <label>Category:</label>
                        <span>{part.category}</span>
                      </div>
                      <div className="part-info">
                        <label>Stock:</label>
                        <span className={part.stock > 0 ? 'in-stock' : 'out-of-stock'}>
                          {part.stock} available
                        </span>
                      </div>
                      <div className="part-info">
                        <label>Description:</label>
                        <span>{part.description}</span>
                      </div>
                      {part.supplier && (
                        <div className="part-info">
                          <label>Supplier:</label>
                          <span>{part.supplier}</span>
                        </div>
                      )}
                    </div>

                    <button 
                      className="order-btn"
                      onClick={() => orderPart(part._id)}
                      disabled={part.stock === 0}
                    >
                      {part.stock > 0 ? 'Order Part' : 'Out of Stock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab - only show if KYC is approved */}
      {activeTab === 'orders' && techProfile && techProfile.kycStatus === "approved" && (
        <div className="tab-content">
          <div className="orders-section">
            <h2>My Part Orders</h2>
            {orderedParts.length === 0 ? (
              <div className="no-orders">
                <p>No orders yet.</p>
              </div>
            ) : (
              <div className="orders-grid">
                {orderedParts.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <h3>Order #{order._id.slice(-6)}</h3>
                      <span className={`order-status ${order.status}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="order-details">
                      <div className="order-info">
                        <label>Part:</label>
                        <span>{order.p_id?.name || 'Part Name'}</span>
                      </div>
                      <div className="order-info">
                        <label>Price:</label>
                        <span>${order.price || order.p_id?.price}</span>
                      </div>
                      <div className="order-info">
                        <label>Order Date:</label>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      {order.trackingURL && (
                        <div className="order-info">
                          <label>Tracking:</label>
                          <a href={order.trackingURL} target="_blank" rel="noopener noreferrer" className="tracking-link">
                            Track Order
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianPage;