import React, { useState, useEffect , useRef} from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../css/CustomerPage.css';


// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

// Custom icons for different types of markers
const customerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjNDA5OEUxIi8+Cjwvc3ZnPgo=',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

const technicianIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjNDhCQjc4Ii8+Cjwvc3ZnPgo=',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

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

  // Map and location states
  const [userLocation, setUserLocation] = useState(null);
  const [mapTechnicians, setMapTechnicians] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to Delhi
  const [mapZoom, setMapZoom] = useState(10);
  const [searchRadius, setSearchRadius] = useState(25);

  const [chatMessages, setChatMessages] = useState([
  {
    type: "assistant",
    text: `Hello! I’m Repair Hero 🔧.\n\nDescribe any AC, Washing-Machine or Refrigerator problem and I’ll reply with:\n• 🔧 Issue diagnosis\n• 👨‍🔧 Technician type\n• 💰 INR cost estimate\n• 💡 Quick tips`,
    ts: Date.now()
  }
]);
const [chatInput, setChatInput]   = useState("");
const [isTyping,  setIsTyping]    = useState(false);
const chatEndRef = useRef(null);

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
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
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
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/customer`, {
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

  // Get user location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          setLocationPermission(true);
          setMapCenter([location.latitude, location.longitude]);
          setMapZoom(13);
          updateUserLocation(location);
          fetchNearbyTechnicians(location);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Location access denied. Please enable location services to find nearby technicians.");
          setLocationPermission(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLocationPermission(false);
    }
  };

  // Update user location in backend
  const updateUserLocation = async (location) => {
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

  // Fetch nearby technicians
  const fetchNearbyTechnicians = async (location) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/technicians/nearby?latitude=${location.latitude}&longitude=${location.longitude}&radius=${searchRadius}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const nearbyTechs = await res.json();
        setMapTechnicians(nearbyTechs);
      }
    } catch (err) {
      console.error('Error fetching nearby technicians:', err);
    }
  };

const sendToRepairHero = async (msg) => {
  if (!msg.trim()) return;

  // Push user line
  setChatMessages(prev => [
    ...prev,
    { type: "user", text: msg.trim(), ts: Date.now() }
  ]);
  setChatInput("");
  setIsTyping(true);

  try {
    // Build system prompt + last 6 turns
    const history = chatMessages.slice(-6).map(m =>
      (m.type === "user" ? "User: " : "Repair Hero: ") + m.text
    ).join("\n");

    const prompt = [
      `You are Repair Hero, an appliance-repair expert.`,
      `Only discuss AC, Washing-Machine or Refrigerator issues.`,
      `Always answer with:\n🔧 Issue Diagnosis\n👨‍🔧 Technician Type\n💰 Estimated Cost (INR)\n💡 Quick Tips`,
      `Your response should be in text format, not in md.`,
      history,
      `User: ${msg.trim()}`,
      `Repair Hero:`
    ].join("\n");

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const aiText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t process that.";

    setChatMessages(prev => [
      ...prev,
      { type: "assistant", text: aiText, ts: Date.now() }
    ]);
  } catch (err) {
    console.error("sendToRepairHero error:", err);
    setChatMessages(prev => [
      ...prev,
      { type: "assistant", text: "⚠️ Network/API error – please try again.", ts: Date.now() }
    ]);
  } finally {
    setIsTyping(false);
  }
};

const handleKey = e => {
  if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendToRepairHero(chatInput); }
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
        const userRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
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

          // Set user location if available
          if (userData.location && userData.location.latitude && userData.location.longitude) {
            setUserLocation(userData.location);
            setLocationPermission(true);
            setMapCenter([userData.location.latitude, userData.location.longitude]);
            setMapZoom(13);
            fetchNearbyTechnicians(userData.location);
          }
        }

        // Fetch approved technicians
        const techRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/technicians`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (techRes.ok) {
          const techData = await techRes.json();
          // Only show approved technicians
          const approvedTechs = techData.filter(tech => tech.kycStatus === 'approved');
          setTechnicians(approvedTechs);
        }

        // Fetch user bookings
        const bookingRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/customer`, {
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

  // Handle technician selection from map
  const handleMapTechnicianSelection = (technicianId) => {
    const tech = mapTechnicians.find(t => t._id === technicianId);
    setSelectedTechnician(tech);
    setBookingForm({
      ...bookingForm,
      technicianId,
      serviceType: ''
    });
    setActiveTab('assistant'); // Switch to booking tab
  };

  // Handle booking submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!userLocation) {
      alert('Please enable location services to book a technician');
      return;
    }

    try {
      const bookingData = {
        ...bookingForm,
        serviceLocation: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      };

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
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
        const bookingRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/customer`, {
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reviews`, {
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
        const bookingRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/customer`, {
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
          Authorization: `Bearer ${token}`
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

  // Handle search radius change
  const handleRadiusChange = (newRadius) => {
    setSearchRadius(newRadius);
    if (userLocation) {
      fetchNearbyTechnicians(userLocation);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="customer-page">
      <nav className="customer-nav">
        <div className="nav-brand">
          <img src='\pfp.jpg' height="50" style={{display:"inline"}}/>
          <h2  style={{display:"inline"}}>{userProfile?.userName || 'Customer'}</h2>
        </div>
        <div className="nav-tabs">
          <button 
            className={activeTab === 'home' ? 'active' : ''} 
            onClick={() => setActiveTab('home')}
          >
            🏠 Home
          </button>
          <button
            className={activeTab==="chat" ? "active":""}
            onClick={() => setActiveTab("chat")}
          >
            🤖 Repair Hero
          </button>
          <button 
            className={activeTab === 'map' ? 'active' : ''} 
            onClick={() => setActiveTab('map')}
          >
            🗺️ Find Nearby
          </button>
          <button 
            className={activeTab === 'assistant' ? 'active' : ''} 
            onClick={() => setActiveTab('assistant')}
          >
            🛠️ Book Service
          </button>
          <button 
            className={activeTab === 'bookings' ? 'active' : ''} 
            onClick={() => setActiveTab('bookings')}
          >
            📋 My Bookings
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

      <div className="customer-content">
        {activeTab === 'home' && (
          <div className="home-tab">
            <div className="welcome-section">
              <h1>Welcome, {userProfile?.userName || 'Customer'}!</h1>
              <p>Browse and book qualified technicians in your area</p>
            </div>

            <div className="search-filters">
              <h3>🔍 Find Technicians</h3>
              <div className="filter-row">
                <select 
                  value={searchFilters.expertise} 
                  onChange={(e) => setSearchFilters({...searchFilters, expertise: e.target.value})}
                >
                  <option value="">All Services</option>
                  <option value="AC">AC Repair</option>
                  <option value="Refrigerator">Refrigerator Repair</option>
                  <option value="Washing Machine">Washing Machine Repair</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Location/Area" 
                  value={searchFilters.location}
                  onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                />
                <select 
                  value={searchFilters.minRating} 
                  onChange={(e) => setSearchFilters({...searchFilters, minRating: parseFloat(e.target.value)})}
                >
                  <option value={0}>Any Rating</option>
                  <option value={3}>3+ Stars</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>
            </div>

            <div className="technicians-grid">
              <h3>📋 Available Technicians</h3>
              <p>Browse and book qualified technicians in your area</p>

              {filteredTechnicians.length === 0 ? (
                <p className="no-technicians">No technicians found matching your criteria.</p>
              ) : (
                filteredTechnicians.map(tech => (
                  <div key={tech._id} className="technician-card">
                    <div className="tech-header">
                      <h4>{tech.userId?.userName}</h4>
                      <div className="tech-rating">
                        {'⭐'.repeat(Math.floor(tech.avgRating || 0))} 
                        ({tech.avgRating?.toFixed(1) || 'No ratings'})
                      </div>
                    </div>
                    <div className="tech-details">
                      <p><strong>📧 Email:</strong> {tech.userId?.email}</p>
                      <p><strong>📞 Phone:</strong> {tech.userId?.phone}</p>
                      <p><strong>🛠️ Expertise:</strong> {tech.expertise?.join(', ') || 'Not specified'}</p>
                      <p><strong>📍 Service Areas:</strong> {tech.serviceAreas?.join(', ') || 'Not specified'}</p>
                      <p><strong>💰 Pricing:</strong> ₹{tech.pricing || 'Contact for pricing'}/service</p>
                      <p><strong>📅 Available Days:</strong> {getAvailableDaysCount(tech.availability)} days/week</p>
                    </div>
                    <div className="availability-section">
                      <h5>Weekly Availability:</h5>
                      <div className="availability-grid">
                        {Object.entries(tech.availability || {}).map(([day, avail]) => (
                          <div key={day} className="day-availability">
                            <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                            <span className={`availability-status ${avail && (typeof avail === 'object' ? avail.available : avail !== 'Not available') ? 'available' : 'unavailable'}`}>
                              {formatAvailability(avail)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      className="book-btn" 
                      onClick={() => bookTechnician(tech._id)}
                    >
                      📅 Book Now
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="chat-tab">
            <div className="chat-messages">
              {chatMessages.map((m,i)=>
                <div key={i} className={`bubble ${m.type}`}>
                  {m.text.split("\n").map((line,j)=><p key={j} dangerouslySetInnerHTML={{__html:line.replace(/\\*\\*(.*?)\\*\\*/g,"<strong>$1</strong>")}}/>)}
                </div>)}

              {isTyping && <div className="bubble assistant typing"><span/><span/><span/></div>}
              <div ref={chatEndRef}/>
            </div>

            <div className="chat-input-bar">
              <textarea
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe the problem…"
              />
              <button onClick={()=>sendToRepairHero(chatInput)} disabled={!chatInput.trim()||isTyping}>
                Send
              </button>
            </div>
          </div>
        )}


        {activeTab === 'map' && (
          <div className="map-tab">
            <div className="map-header">
              <h2>🗺️ Find Nearby Technicians</h2>
              <p>Discover technicians in your area with an interactive map</p>

              {!locationPermission && (
                <div className="location-prompt">
                  <p>📍 Enable location access to find nearby technicians</p>
                  <button className="location-btn" onClick={getCurrentLocation}>
                    Enable Location
                  </button>
                </div>
              )}
            </div>

            {locationPermission && (
              <>
                <div className="map-controls">
                  <div className="search-radius-control">
                    <label>Search Radius: {searchRadius} km</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={searchRadius}
                      onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                    />
                    <div className="radius-labels">
                      <span>1km</span>
                      <span>25km</span>
                      <span>50km</span>
                    </div>
                  </div>
                  <button className="refresh-location-btn" onClick={getCurrentLocation}>
                    🔄 Update Location
                  </button>
                </div>

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

                    {/* Customer location marker and search radius */}
                    {userLocation && (
                      <>
                        <Marker 
                          position={[userLocation.latitude, userLocation.longitude]} 
                          icon={customerIcon}
                        >
                          <Popup>
                            <div className="popup-content">
                              <h4>📍 Your Location</h4>
                              <p>You are here!</p>
                            </div>
                          </Popup>
                        </Marker>
                        <Circle
                          center={[userLocation.latitude, userLocation.longitude]}
                          radius={searchRadius * 1000} // Convert km to meters
                          color="#4299e1"
                          fillColor="#4299e1"
                          fillOpacity={0.1}
                        />
                      </>
                    )}

                    {/* Technician markers */}
                    {mapTechnicians.map(tech => (
                      tech.serviceLocation && tech.serviceLocation.latitude && tech.serviceLocation.longitude && (
                        <Marker
                          key={tech._id}
                          position={[tech.serviceLocation.latitude, tech.serviceLocation.longitude]}
                          icon={technicianIcon}
                        >
                          <Popup>
                            <div className="popup-content">
                              <h4>🔧 {tech.userId?.userName}</h4>
                              <p><strong>Distance:</strong> {tech.distance} km away</p>
                              <p><strong>Expertise:</strong> {tech.expertise?.join(', ')}</p>
                              <p><strong>Rating:</strong> {'⭐'.repeat(Math.floor(tech.avgRating || 0))} ({tech.avgRating?.toFixed(1) || 'No ratings'})</p>
                              <p><strong>Pricing:</strong> ₹{tech.pricing}/service</p>
                              <button 
                                className="popup-book-btn"
                                onClick={() => handleMapTechnicianSelection(tech._id)}
                              >
                                📅 Book Now
                              </button>
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
                    <span className="legend-icon customer">📍</span>
                    <span>Your Location</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-icon technician">🔧</span>
                    <span>Available Technicians</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-icon radius">⭕</span>
                    <span>Search Radius ({searchRadius}km)</span>
                  </div>
                </div>

                <div className="nearby-technicians">
                  <h3>👨‍🔧 Nearby Technicians ({mapTechnicians.length} found)</h3>
                  {mapTechnicians.length === 0 ? (
                    <p>No nearby technicians found within {searchRadius}km radius.</p>
                  ) : (
                    <div className="technicians-list">
                      {mapTechnicians.map(tech => (
                        <div key={tech._id} className="nearby-tech-card">
                          <div className="tech-info">
                            <h4>{tech.userId?.userName}</h4>
                            <p className="distance">📍 {tech.distance} km away</p>
                            <p><strong>🛠️ Expertise:</strong> {tech.expertise?.join(', ')}</p>
                            <p><strong>⭐ Rating:</strong> {tech.avgRating?.toFixed(1) || 'No ratings'}</p>
                            <p><strong>💰 Pricing:</strong> ₹{tech.pricing}/service</p>
                          </div>
                          <div className="tech-actions">
                            <button 
                              className="book-nearby-btn"
                              onClick={() => handleMapTechnicianSelection(tech._id)}
                            >
                              📅 Book This Technician
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

        {activeTab === 'assistant' && (
          <div className="assistant-tab">
            <h2>🛠️ Book Your Service</h2>
            <p>Book your preferred technician for quality service</p>

            <form onSubmit={handleBookingSubmit} className="booking-form">
              <div className="form-group">
                <label>Select Technician:</label>
                <select 
                  value={bookingForm.technicianId} 
                  onChange={(e) => handleTechnicianSelection(e.target.value)}
                  required
                >
                  <option value="">Choose a technician</option>
                  {technicians.filter(tech => tech.kycStatus === 'approved').map(tech => (
                    <option key={tech._id} value={tech._id}>
                      {tech.userId?.userName} - {tech.expertise?.join(', ')} 
                      {tech.distance ? ` (${tech.distance}km away)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTechnician && (
                <div className="selected-technician-info">
                  <h4>Selected Technician: {selectedTechnician.userId?.userName}</h4>
                  <p>📞 {selectedTechnician.userId?.phone}</p>
                  <p>🛠️ Expertise: {selectedTechnician.expertise?.join(', ')}</p>
                  <p>⭐ Rating: {selectedTechnician.avgRating?.toFixed(1) || 'No ratings'}</p>
                  <p>💰 Pricing: ₹{selectedTechnician.pricing}/service</p>
                  {selectedTechnician.distance && (
                    <p>📍 Distance: {selectedTechnician.distance} km</p>
                  )}
                </div>
              )}

              {selectedTechnician && (
                <>
                  <div className="form-group">
                    <label>Service Type:</label>
                    <select 
                      value={bookingForm.serviceType} 
                      onChange={(e) => setBookingForm({...bookingForm, serviceType: e.target.value})}
                      required
                    >
                      <option value="">Select service type</option>
                      {selectedTechnician.expertise?.map(expertise => (
                        <option key={expertise} value={expertise}>{expertise} Service</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Preferred Date:</label>
                      <input 
                        type="date" 
                        value={bookingForm.scheduledDate}
                        onChange={(e) => setBookingForm({...bookingForm, scheduledDate: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Preferred Time:</label>
                      <input 
                        type="time" 
                        value={bookingForm.scheduledTime}
                        onChange={(e) => setBookingForm({...bookingForm, scheduledTime: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Service Address:</label>
                    <input 
                      type="text" 
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                      placeholder="Enter your complete address"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Problem Description:</label>
                    <textarea 
                      value={bookingForm.description}
                      onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                      placeholder="Describe the issue you're experiencing..."
                      rows="4"
                    />
                  </div>

                  {!userLocation && (
                    <div className="location-warning">
                      <p>⚠️ Location access is required for booking. Please enable location services.</p>
                      <button type="button" onClick={getCurrentLocation}>
                        Enable Location
                      </button>
                    </div>
                  )}

                  <button type="submit" className="submit-booking-btn" disabled={!userLocation}>
                    📅 Submit Booking Request
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            <h2>📋 My Bookings</h2>
            <p>Track and manage your service appointments</p>

            {bookings.length === 0 ? (
              <p className="no-bookings">When you book a service, it will appear here.</p>
            ) : (
              <div className="bookings-list">
                {bookings.map(booking => (
                  <div key={booking._id} className="booking-card">
                    <div className="booking-header">
                      <h4>Booking #{booking._id.slice(-6)}</h4>
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="booking-details">
                      <p><strong>👨‍🔧 Technician:</strong> {booking.technicianId?.userName}</p>
                      <p><strong>📞 Contact:</strong> {booking.technicianId?.phone}</p>
                      <p><strong>🛠️ Service:</strong> {booking.serviceType}</p>
                      <p><strong>📅 Scheduled:</strong> {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}</p>
                      <p><strong>📍 Address:</strong> {booking.address}</p>
                      {booking.distance && (
                        <p><strong>🚗 Distance:</strong> {booking.distance} km</p>
                      )}
                      {booking.description && (
                        <p><strong>📝 Description:</strong> {booking.description}</p>
                      )}
                      <p><strong>🕒 Booked on:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="booking-actions">
                      {booking.status === 'completed' && !booking.reviewId && (
                        <div className="review-section">
                          <h5>Rate this service:</h5>
                          <select id={`rating-${booking._id}`}>
                            <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                            <option value="4">⭐⭐⭐⭐ Good</option>
                            <option value="3">⭐⭐⭐ Average</option>
                            <option value="2">⭐⭐ Poor</option>
                            <option value="1">⭐ Very Poor</option>
                          </select>
                          <input 
                            type="text" 
                            id={`comment-${booking._id}`}
                            placeholder="Add a comment (optional)"
                          />
                          <button 
                            onClick={() => {
                              const rating = document.getElementById(`rating-${booking._id}`).value;
                              const comment = document.getElementById(`comment-${booking._id}`).value;
                              submitReview(booking._id, rating, comment);
                            }}
                            className="review-btn"
                          >
                            Submit Review
                          </button>
                        </div>
                      )}

                      {booking.reviewId && (
                        <p className="review-submitted">✅ Review submitted</p>
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

        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h2>👤 My Profile</h2>
            <p>Manage your account details and preferences</p>

            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <label>Full Name:</label>
                <input 
                  type="text" 
                  value={profileForm.userName}
                  onChange={(e) => setProfileForm({...profileForm, userName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input 
                  type="email" 
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone:</label>
                <input 
                  type="tel" 
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  required
                />
              </div>

              <div className="profile-info">
                <h4>Account Information</h4>
                <p><strong>Account Status:</strong> {userProfile?.status}</p>
                <p><strong>Member Since:</strong> {new Date(userProfile?.createdAt).toLocaleDateString()}</p>
                <p><strong>Total Bookings:</strong> {bookings.length}</p>
                {userLocation && (
                  <div className="location-info">
                    <p><strong>Location:</strong> {userLocation.latitude?.toFixed(6)}, {userLocation.longitude?.toFixed(6)}</p>
                    <button type="button" onClick={getCurrentLocation}>
                      Update Location
                    </button>
                  </div>
                )}
              </div>

              <button type="submit" className="update-profile-btn">
                💾 Update Profile
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPage;