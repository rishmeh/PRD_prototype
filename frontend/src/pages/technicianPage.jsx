import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../css/TechnicianPage.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

// Custom icons for different types of markers
const technicianIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjNDhCQjc4Ii8+Cjwvc3ZnPgo=',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

const customerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjNDA5OEUxIi8+Cjwvc3ZnPgo=',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

const urgentRequestIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjRjU2NTY1Ii8+Cjwvc3ZnPgo=',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

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

  // Booking filter state
  const [bookingFilter, setBookingFilter] = useState('all');

  // Map and location states
  const [technicianLocation, setTechnicianLocation] = useState(null);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [locationPermission, setLocationPermission] = useState(false);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to Delhi
  const [mapZoom, setMapZoom] = useState(10);

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
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
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

  // Get technician location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setTechnicianLocation(location);
          setLocationPermission(true);
          setMapCenter([location.latitude, location.longitude]);
          setMapZoom(13);
          updateTechnicianLocation(location);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Location access denied. Please enable location services to receive nearby booking requests.");
          setLocationPermission(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLocationPermission(false);
    }
  };

  // Update technician location in backend
  const updateTechnicianLocation = async (location) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || ""
        })
      });

      if (res.ok) {
        console.log('Location updated successfully');
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  // Update service radius
  const updateServiceRadius = async (radius) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians/service-radius`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ serviceRadius: radius })
      });

      if (res.ok) {
        setServiceRadius(radius);
        alert('Service radius updated successfully!');
      } else {
        alert('Failed to update service radius');
      }
    } catch (err) {
      console.error('Error updating service radius:', err);
    }
  };

  // Fetch booking requests with distance
  const fetchBookingRequests = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians/booking-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const requests = await res.json();
        setBookingRequests(requests);
      }
    } catch (err) {
      console.error("Error fetching booking requests:", err);
    }
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
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = await userRes.json();

        // Set user location if available
        if (user.location && user.location.latitude && user.location.longitude) {
          setTechnicianLocation(user.location);
          setLocationPermission(true);
          setMapCenter([user.location.latitude, user.location.longitude]);
          setMapZoom(13);
        }

        // Fetch technician profile
        const techRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians`, {
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

            // Set service radius if available
            if (userTech.serviceLocation && userTech.serviceLocation.serviceRadius) {
              setServiceRadius(userTech.serviceLocation.serviceRadius);
            }

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
                  newAvailability[day] = {
                    available: false,
                    startHour: 9,
                    endHour: 17
                  };
                }
              });
              setAvailability(newAvailability);
            }

            // Fetch bookings and parts if KYC is approved
            if (userTech.kycStatus === "approved") {
              await Promise.all([
                fetchBookings(),
                fetchParts(),
                fetchOrderedParts(),
                fetchBookingRequests()
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // if (res.ok) {
      //   const bookingData = await res.json();
      //   setBookings(bookingData);
      // }
      console.log("Response status:", res.status);
    console.log("Response ok:", res.ok);
    
    if (res.ok) {
      const bookingData = await res.json();
      console.log("Booking data received:", bookingData);
      console.log("Number of bookings:", bookingData.length);
      setBookings(bookingData);
    } else {
      const errorData = await res.json();
      console.error("Error response:", errorData);
    }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  // Fetch parts
  const fetchParts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/parts`, {
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/parts/orders`, {
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/parts/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ p_id: partId, status: 'placed' })
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians/kyc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians`, {
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

  // Raise Flag Function
  const raiseFlag = async (bookingId) => {
    const reason = prompt('Please specify the reason for flagging:');
    const description = prompt('Please provide additional details:');

    if (!reason) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/${bookingId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason, description })
      });

      if (res.ok) {
        alert('Flag raised successfully!');
      } else {
        alert('Failed to raise flag');
      }
    } catch (err) {
      console.error('Error raising flag:', err);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/${bookingId}/status`, {
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
        fetchBookingRequests(); // Refresh booking requests
      } else {
        alert("Failed to update booking status");
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      alert("Failed to update booking status");
    }
  };

  // Filter bookings based on selected filter
  const filteredBookings = bookings.filter(booking => {
    if (bookingFilter === 'all') return true;
    return booking.status === bookingFilter;
  });

  // Get request urgency based on distance and time
  const getRequestUrgency = (request) => {
    if (!request.distance) return 'normal';
    if (request.distance <= 5) return 'urgent';
    if (request.distance <= 15) return 'medium';
    return 'normal';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="technician-page">
      <nav className="technician-nav">
        <div className="nav-brand">
          <img src='\pfp.jpg' height="50" style={{display:"inline"}}/>
          <h2  style={{display:"inline"}}>{techProfile?.userId?.userName || 'Technician'}</h2>
        </div>
        <div className="nav-tabs">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveTab('dashboard')}
          >
            🏠 Dashboard
          </button>
          <button 
            className={activeTab === 'bookings' ? 'active' : ''} 
            onClick={() => setActiveTab('bookings')}
          >
            📋 Bookings
          </button>
          <button 
            className={activeTab === 'requests' ? 'active' : ''} 
            onClick={() => setActiveTab('requests')}
          >
            🗺️ Map Requests
          </button>
          <button 
            className={activeTab === 'parts' ? 'active' : ''} 
            onClick={() => setActiveTab('parts')}
          >
            🔧 Parts
          </button>
          <button 
            className={activeTab === 'profile' ? 'active' : ''} 
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button 
            className="logout-btn" 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            🚪 Logout
          </button>
        </div>
      </nav>

      <div className="technician-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="welcome-section">
              <h1>Welcome, {techProfile?.userId?.userName || 'Technician'}!</h1>

              {!techProfile && (
                <div className="setup-prompt">
                  <p>Please complete your <a onClick={() => setActiveTab('profile')} style={{color:"blue", cursor:"pointer"}}> profile</a> setup to start receiving booking requests.</p>
                </div>
              )}

              {techProfile?.kycStatus === 'pending' && (
                <div className="kyc-status pending">
                  <p>Your KYC verification is pending. Please submit your documents or wait for admin approval.</p>
                  <p>You cannot access bookings and parts until your KYC is approved.</p>
                </div>
              )}

              {techProfile?.kycStatus === 'rejected' && (
                <div className="kyc-status rejected">
                  <p>Your KYC verification was rejected. Please resubmit your documents.</p>
                  <p>You cannot access bookings and parts until your KYC is approved.</p>
                </div>
              )}

              {techProfile?.kycStatus === 'approved' && (
                <div className="kyc-status approved">
                  <p>Your KYC is approved! You can now access all technician features.</p>

                  <div className="location-section">
                    <h3>📍 Location Settings</h3>
                    {!locationPermission && (
                      <div className="location-prompt">
                        <p>Enable location access to receive nearby booking requests</p>
                        <button className="location-btn" onClick={getCurrentLocation}>
                          Enable Location
                        </button>
                      </div>
                    )}

                    {technicianLocation && (
                      <div className="location-info">
                        <p><strong>Current Location:</strong></p>
                        <p>Latitude: {technicianLocation.latitude?.toFixed(6)}</p>
                        <p>Longitude: {technicianLocation.longitude?.toFixed(6)}</p>

                        <div className="service-radius">
                          <h4>Service Radius</h4>
                          <p>Current radius: {serviceRadius} km</p>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={serviceRadius}
                            onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                          />
                          <div className="radius-labels">
                            <span>1km</span>
                            <span>25km</span>
                            <span>50km</span>
                          </div>
                          <button onClick={() => updateServiceRadius(serviceRadius)}>
                            Update Service Radius
                          </button>
                        </div>

                        <button onClick={getCurrentLocation}>
                          🔄 Update Location
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {techProfile?.kycStatus === 'approved' && (
              <div className="dashboard-stats">
                <div className="stat-card">
                  <h3>📋 Total Bookings</h3>
                  <p>{bookings.length}</p>
                </div>
                <div className="stat-card">
                  <h3>⏳ Pending Requests</h3>
                  <p>{bookingRequests.length}</p>
                </div>
                <div className="stat-card">
                  <h3>📦 Parts Ordered</h3>
                  <p>{orderedParts.length}</p>
                </div>
                <div className="stat-card">
                  <h3>⭐ Average Rating</h3>
                  <p>{techProfile?.avgRating?.toFixed(1) || 'No ratings'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-tab">
            <div className="requests-header">
              <h2>🗺️ Map-Based Booking Requests</h2>
              <p>View booking requests from customers in your service area with an interactive map</p>
            </div>

            {techProfile?.kycStatus !== 'approved' ? (
              <div className="access-denied">
                <p>KYC approval required to view booking requests.</p>
              </div>
            ) : !locationPermission ? (
              <div className="location-required">
                <p>📍 Location access is required to see nearby booking requests</p>
                <button onClick={getCurrentLocation}>Enable Location</button>
              </div>
            ) : (
              <>
                <div className="map-container">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    style={{ height: '500px', width: '100%', borderRadius: '12px' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Technician location marker and service radius */}
                    {technicianLocation && (
                      <>
                        <Marker 
                          position={[technicianLocation.latitude, technicianLocation.longitude]} 
                          icon={technicianIcon}
                        >
                          <Popup>
                            <div className="popup-content">
                              <h4>🔧 Your Location</h4>
                              <p>You are here!</p>
                              <p><strong>Service Radius:</strong> {serviceRadius} km</p>
                            </div>
                          </Popup>
                        </Marker>
                        <Circle
                          center={[technicianLocation.latitude, technicianLocation.longitude]}
                          radius={serviceRadius * 1000} // Convert km to meters
                          color="#48bb78"
                          fillColor="#48bb78"
                          fillOpacity={0.1}
                        />
                      </>
                    )}

                    {/* Customer request markers */}
                    {bookingRequests.map(request => (
                      request.serviceLocation && request.serviceLocation.latitude && request.serviceLocation.longitude && (
                        <Marker
                          key={request._id}
                          position={[request.serviceLocation.latitude, request.serviceLocation.longitude]}
                          icon={getRequestUrgency(request) === 'urgent' ? urgentRequestIcon : customerIcon}
                        >
                          <Popup>
                            <div className="popup-content">
                              <h4>🏠 Service Request</h4>
                              <p><strong>Customer:</strong> {request.customerId?.userName}</p>
                              <p><strong>Service:</strong> {request.serviceType}</p>
                              <p><strong>Distance:</strong> {request.distance ? `${request.distance} km away` : 'Distance unknown'}</p>
                              <p><strong>Urgency:</strong> {getRequestUrgency(request)}</p>
                              <p><strong>Date:</strong> {new Date(request.scheduledDate).toLocaleDateString()}</p>
                              <p><strong>Time:</strong> {request.scheduledTime}</p>
                              <div className="popup-actions">
                                <button 
                                  className="popup-accept-btn"
                                  onClick={() => updateBookingStatus(request._id, 'accepted')}
                                >
                                  ✅ Accept
                                </button>
                                <button 
                                  className="popup-reject-btn"
                                  onClick={() => updateBookingStatus(request._id, 'rejected')}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>

                <div className="map-legend">
                  <h4>Map Legend:</h4>
                  <div className="legend-item">
                    <span className="legend-icon technician">🔧</span>
                    <span>Your Location</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-icon customer">🏠</span>
                    <span>Service Requests</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-icon urgent">🚨</span>
                    <span>Urgent Requests (≤5km)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-icon radius">⭕</span>
                    <span>Your Service Area ({serviceRadius}km)</span>
                  </div>
                </div>

                <div className="booking-requests">
                  <h3>📋 Booking Requests ({bookingRequests.length} pending)</h3>
                  {bookingRequests.length === 0 ? (
                    <div className="no-requests">
                      <p>No booking requests in your area at the moment.</p>
                      <button onClick={fetchBookingRequests}>🔄 Refresh Requests</button>
                    </div>
                  ) : (
                    <div className="requests-list">
                      {bookingRequests.map(request => (
                        <div key={request._id} className={`request-card ${getRequestUrgency(request)}`}>
                          <div className="request-header">
                            <h4>Request #{request._id.slice(-6)}</h4>
                            <div className="request-distance">
                              {request.distance ? `📍 ${request.distance} km away` : '📍 Distance unknown'}
                            </div>
                          </div>

                          <div className="request-details">
                            <p><strong>👤 Customer:</strong> {request.customerId?.userName}</p>
                            <p><strong>📞 Contact:</strong> {request.customerId?.phone}</p>
                            <p><strong>🛠️ Service Type:</strong> {request.serviceType}</p>
                            <p><strong>📅 Scheduled:</strong> {new Date(request.scheduledDate).toLocaleDateString()} at {request.scheduledTime}</p>
                            <p><strong>📍 Address:</strong> {request.address}</p>
                            {request.description && (
                              <p><strong>📝 Description:</strong> {request.description}</p>
                            )}
                            <p><strong>🕒 Requested:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                            {getRequestUrgency(request) === 'urgent' && (
                              <p className="urgency-note"><strong>🚨 Urgent:</strong> Very close to your location!</p>
                            )}
                          </div>

                          <div className="request-actions">
                            <button 
                              className="accept-btn"
                              onClick={() => updateBookingStatus(request._id, 'accepted')}
                            >
                              ✅ Accept Request
                            </button>
                            <button 
                              className="reject-btn"
                              onClick={() => updateBookingStatus(request._id, 'rejected')}
                            >
                              ❌ Reject Request
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            <div className="bookings-header">
              <h2>📋 My Bookings</h2>
              <div className="booking-filters">
                <select 
                  value={bookingFilter} 
                  onChange={(e) => setBookingFilter(e.target.value)}
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {techProfile?.kycStatus !== 'approved' ? (
              <div className="access-denied">
                <p>KYC approval required to view bookings.</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <p className="no-bookings">No bookings found for the selected filter.</p>
            ) : (
              <div className="bookings-list">
                {filteredBookings.map(booking => (
                  <div key={booking._id} className="booking-card">
                    <div className="booking-header">
                      <h4>Booking #{booking._id.slice(-6)}</h4>
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="booking-details">
                      <p><strong>👤 Customer:</strong> {booking.customerId?.userName}</p>
                      <p><strong>📞 Contact:</strong> {booking.customerId?.phone}</p>
                      <p><strong>🛠️ Service Type:</strong> {booking.serviceType}</p>
                      <p><strong>📅 Scheduled:</strong> {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}</p>
                      <p><strong>📍 Address:</strong> {booking.address}</p>
                      {booking.distance && (
                        <p><strong>🚗 Distance:</strong> {booking.distance} km</p>
                      )}
                      {booking.description && (
                        <p><strong>📝 Description:</strong> {booking.description}</p>
                      )}
                      <p><strong>🕒 Booked:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="booking-actions">
                      {booking.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateBookingStatus(booking._id, 'accepted')}
                            className="accept-btn"
                          >
                            ✅ Accept
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(booking._id, 'rejected')}
                            className="reject-btn"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}

                      {booking.status === 'accepted' && (
                        <button 
                          onClick={() => updateBookingStatus(booking._id, 'in_progress')}
                          className="start-btn"
                        >
                          🔧 Start Service
                        </button>
                      )}

                      {booking.status === 'in_progress' && (
                        <button 
                          onClick={() => updateBookingStatus(booking._id, 'completed')}
                          className="complete-btn"
                        >
                          ✅ Mark Completed
                        </button>
                      )}

                      {['completed', 'rejected', 'cancelled'].includes(booking.status) && (
                        <button 
                          onClick={() => raiseFlag(booking._id)} 
                          className="flag-btn"
                        >
                          🚩 Report Issue
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'parts' && (
          <div className="parts-tab">
            <h2>🔧 Parts Management</h2>

            {techProfile?.kycStatus !== 'approved' ? (
              <div className="access-denied">
                <p>KYC approval required to access parts.</p>
              </div>
            ) : (
              <>
                <div className="parts-section">
                  <h3>Available Parts</h3>
                  {parts.length === 0 ? (
                    <p>No parts available.</p>
                  ) : (
                    <div className="parts-grid">
                      {parts.map(part => (
                        <div key={part._id} className="part-card">
                          <h4>{part.name}</h4>
                          <p><strong>Category:</strong> {part.category}</p>
                          <p><strong>Brand:</strong> {part.brand}</p>
                          <p><strong>Price:</strong> ₹{part.price}</p>
                          <p><strong>Stock:</strong> {part.stock}</p>
                          {part.description && <p><strong>Description:</strong> {part.description}</p>}
                          <button 
                            onClick={() => orderPart(part._id)}
                            disabled={part.stock === 0}
                            className="order-btn"
                          >
                            {part.stock === 0 ? 'Out of Stock' : 'Order Part'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ordered-parts-section">
                  <h3>My Orders</h3>
                  {orderedParts.length === 0 ? (
                    <p>No orders yet.</p>
                  ) : (
                    <div className="orders-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Part Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Order Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderedParts.map(order => (
                            <tr key={order._id}>
                              <td>#{order._id.slice(-6)}</td>
                              <td>{order.p_id?.name}</td>
                              <td>{order.p_id?.category}</td>
                              <td>₹{order.price}</td>
                              <td>
                                <span className={`status-badge status-${order.status}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h2>👤 Profile Management</h2>

            {!techProfile ? (
              <div className="kyc-section">
                <h3>📋 KYC Verification</h3>
                <p>Please upload your KYC documents to get approved as a technician.</p>

                <form onSubmit={handleKycSubmit} className="kyc-form">
                  <div className="form-group">
                    <label>ID Proof (Aadhar/License/etc.):</label>
                    <input 
                      type="file" 
                      name="IDImage" 
                      onChange={handleFileChange}
                      accept="image/*"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Your Photo:</label>
                    <input 
                      type="file" 
                      name="Photo" 
                      onChange={handleFileChange}
                      accept="image/*"
                      required
                    />
                  </div>
                  <button type="submit" className="submit-kyc-btn">
                    📤 Submit KYC Documents
                  </button>
                </form>
              </div>
            ) : techProfile.kycStatus === 'rejected' ? (
              <div className="kyc-section">
                <h3>📋 Resubmit KYC Documents</h3>
                <p>Your KYC was rejected. Please upload new documents.</p>

                <form onSubmit={handleKycSubmit} className="kyc-form">
                  <div className="form-group">
                    <label>ID Proof (Aadhar/License/etc.):</label>
                    <input 
                      type="file" 
                      name="IDImage" 
                      onChange={handleFileChange}
                      accept="image/*"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Your Photo:</label>
                    <input 
                      type="file" 
                      name="Photo" 
                      onChange={handleFileChange}
                      accept="image/*"
                      required
                    />
                  </div>
                  <button type="submit" className="submit-kyc-btn">
                    📤 Resubmit KYC Documents
                  </button>
                </form>
              </div>
            ) : (
              <div className="profile-form-section">
                <h3>Profile Information</h3>
                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-group">
                    <label>Expertise:</label>
                    <div className="checkbox-group">
                      {['AC', 'Refrigerator', 'Washing Machine'].map(skill => (
                        <label key={skill} className="checkbox-label">
                          <input
                            type="checkbox"
                            value={skill}
                            checked={expertise.includes(skill)}
                            onChange={handleExpertiseChange}
                          />
                          {skill}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Service Areas (comma-separated):</label>
                    <input
                      type="text"
                      value={serviceAreas.join(', ')}
                      onChange={handleServiceAreaChange}
                      placeholder="e.g., Downtown, Uptown, City Center"
                    />
                  </div>

                  <div className="form-group">
                    <label>Pricing per Service (₹):</label>
                    <input
                      type="number"
                      value={pricing}
                      onChange={(e) => setPricing(e.target.value)}
                      placeholder="Enter your service charge"
                      min="0"
                    />
                  </div>

                  <div className="availability-section">
                    <h4>Weekly Availability:</h4>
                    {Object.keys(availability).map(day => (
                      <div key={day} className="day-availability-form">
                        <h5>{day.charAt(0).toUpperCase() + day.slice(1)}</h5>
                        <div className="availability-controls">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={availability[day].available}
                              onChange={(e) => handleAvailabilityChange(day, 'available', e.target.checked)}
                            />
                            Available
                          </label>

                          {availability[day].available && (
                            <div className="time-controls">
                              <label>From:</label>
                              <select
                                value={availability[day].startHour}
                                onChange={(e) => handleAvailabilityChange(day, 'startHour', e.target.value)}
                              >
                                {hourOptions.map(hour => (
                                  <option key={hour} value={hour}>
                                    {formatHour(hour)}
                                  </option>
                                ))}
                              </select>

                              <label>To:</label>
                              <select
                                value={availability[day].endHour}
                                onChange={(e) => handleAvailabilityChange(day, 'endHour', e.target.value)}
                              >
                                {hourOptions.map(hour => (
                                  <option key={hour} value={hour}>
                                    {formatHour(hour)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="save-profile-btn">
                    💾 Save Profile
                  </button>
                </form>

                <div className="profile-info">
                  <h4>Current Profile Status</h4>
                  <p><strong>KYC Status:</strong> {techProfile.kycStatus}</p>
                  <p><strong>Average Rating:</strong> {techProfile.avgRating?.toFixed(1) || 'No ratings'}</p>
                  <p><strong>Total Reviews:</strong> {techProfile.totalReviews || 0}</p>
                  <p><strong>Member Since:</strong> {new Date(techProfile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianPage;