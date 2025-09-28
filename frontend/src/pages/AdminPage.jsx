import React, { useState, useEffect } from 'react';
import '../css/AdminPage.css';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState({
    technicians: [],
    customers: [],
    bookings: [],
    parts: [],
    partOrders: [], // NEW: Part orders
    flags: [],
    reviews: [],
    todaysStats: {
      todaysBookings: 0,
      pendingKyc: 0,
      activeFlags: 0,
      totalRevenue: 0,
      totalUsers: 0,
      completedBookings: 0,
      pendingOrders: 0 // NEW: Pending part orders
    }
  });

  // Form states
  const [newPart, setNewPart] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: ''
  });

  // KYC Image Modal States
  const [selectedTechKyc, setSelectedTechKyc] = useState(null);
  const [kycImages, setKycImages] = useState({ IDImage: null, Photo: null });

  const token = localStorage.getItem('token');

  // Check if user has admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!token) {
        alert('Please login to access admin panel');
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const user = await res.json();
          if (user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
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

    checkAdminRole();
  }, [token]);

  // Fetch all admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!token) return;

      try {
        const [techRes, userRes, bookingRes, partRes, partOrderRes, flagRes, reviewRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/technicians`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/bookings`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/parts`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/part-orders`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/flags`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/reviews`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const technicians = techRes.ok ? await techRes.json() : [];
        const users = userRes.ok ? await userRes.json() : [];
        const bookings = bookingRes.ok ? await bookingRes.json() : [];
        const parts = partRes.ok ? await partRes.json() : [];
        const partOrders = partOrderRes.ok ? await partOrderRes.json() : [];
        const flags = flagRes.ok ? await flagRes.json() : [];
        const reviews = reviewRes.ok ? await reviewRes.json() : [];

        const customers = users.filter(user => user.role === 'customer');

        // Calculate enhanced stats
        const today = new Date().toDateString();
        const todaysBookings = bookings.filter(booking => 
          new Date(booking.createdAt).toDateString() === today
        ).length;

        const pendingKyc = technicians.filter(tech => tech.kycStatus === 'pending').length;
        const activeFlags = flags.filter(flag => flag.status === 'open').length;
        const completedBookings = bookings.filter(booking => booking.status === 'completed').length;
        const pendingOrders = partOrders.filter(order => order.status === 'placed').length;
        
        const totalRevenue = bookings
          .filter(booking => booking.status === 'completed')
          .reduce((sum, booking) => {
            const tech = technicians.find(t => t.userId._id === booking.technicianId);
            return sum + (tech ? tech.pricing || 0 : 0);
          }, 0);

        setAdminData({
          technicians,
          customers,
          bookings,
          parts,
          partOrders,
          flags,
          reviews,
          todaysStats: {
            todaysBookings,
            pendingKyc,
            activeFlags,
            totalRevenue,
            totalUsers: users.length,
            completedBookings,
            pendingOrders
          }
        });

      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [token]);

  // NEW: View KYC Images Function
  const viewKycImages = async (technicianId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/technicians/${technicianId}/kyc-images`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const images = await res.json();
        setKycImages(images);
        setSelectedTechKyc(technicianId);
      }
    } catch (err) {
      console.error('Error fetching KYC images:', err);
    }
  };

  // NEW: Cancel Booking Function
  const cancelBooking = async (bookingId) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        alert('Booking cancelled successfully!');
        window.location.reload();
      } else {
        alert('Failed to cancel booking');
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
    }
  };

  // NEW: Cancel Part Order Function
  const cancelPartOrder = async (orderId) => {
    const reason = prompt('Please provide a reason for cancelling this part order:');
    if (!reason) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/part-orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        alert('Part order cancelled successfully!');
        window.location.reload();
      } else {
        alert('Failed to cancel part order');
      }
    } catch (err) {
      console.error('Error cancelling part order:', err);
    }
  };

  // KYC approval/rejection
  const handleKycAction = async (technicianId, action) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/technicians/${technicianId}/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kycStatus: action })
      });

      if (res.ok) {
        alert(`KYC ${action} successfully!`);
        window.location.reload();
      } else {
        alert(`Failed to ${action} KYC`);
      }
    } catch (err) {
      console.error('KYC action error:', err);
      alert(`Failed to ${action} KYC`);
    }
  };

  // Add new part
  const handleAddPart = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newPart,
          price: parseFloat(newPart.price),
          stock: parseInt(newPart.stock)
        })
      });

      if (res.ok) {
        alert('Part added successfully!');
        setNewPart({
          name: '',
          description: '',
          price: '',
          stock: '',
          category: ''
        });
        window.location.reload();
      } else {
        alert('Failed to add part');
      }
    } catch (err) {
      console.error('Add part error:', err);
      alert('Failed to add part');
    }
  };

  // Update user status
  const handleUserAction = async (userId, action, userType) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: action })
      });

      if (res.ok) {
        alert(`${userType} ${action} successfully!`);
        window.location.reload();
      } else {
        alert(`Failed to ${action} ${userType}`);
      }
    } catch (err) {
      console.error('User action error:', err);
      alert(`Failed to ${action} ${userType}`);
    }
  };

  // Handle flag resolution
  const handleFlagAction = async (flagId, action) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/flags/${flagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: action, resolvedBy: 'admin' })
      });

      if (res.ok) {
        alert(`Flag ${action} successfully!`);
        window.location.reload();
      } else {
        alert(`Failed to ${action} flag`);
      }
    } catch (err) {
      console.error('Flag action error:', err);
      alert(`Failed to ${action} flag`);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Complete platform management and oversight</p>
      </div>

      <div className="admin-tabs">
        {['dashboard', 'technicians', 'customers', 'bookings', 'parts', 'part-orders', 'flags', 'reviews'].map((tab) => (
          <div
            key={tab}
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tab-icon">
              {tab === 'dashboard' && '📊'}
              {tab === 'technicians' && '👨‍🔧'}
              {tab === 'customers' && '👥'}
              {tab === 'bookings' && '📅'}
              {tab === 'parts' && '🔧'}
              {tab === 'part-orders' && '📦'}
              {tab === 'flags' && '🚩'}
              {tab === 'reviews' && '⭐'}
            </span>
            <span className="tab-text">
              {tab === 'part-orders' ? 'Part Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
          </div>
        ))}
        <button 
            className="logout-btn" 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            Logout
          </button>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="section-title">Dashboard Overview</h2>
            
            {/* Enhanced Quick Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card bookings">
                <span className="stat-icon">📅</span>
                <h3>{adminData.todaysStats.todaysBookings}</h3>
                <p>Today's Bookings</p>
              </div>
              <div className="stat-card kyc">
                <span className="stat-icon">⏳</span>
                <h3>{adminData.todaysStats.pendingKyc}</h3>
                <p>Pending KYC</p>
              </div>
              <div className="stat-card flags">
                <span className="stat-icon">🚩</span>
                <h3>{adminData.todaysStats.activeFlags}</h3>
                <p>Active Flags</p>
              </div>
              <div className="stat-card revenue">
                <span className="stat-icon">💰</span>
                <h3>₹{adminData.todaysStats.totalRevenue}</h3>
                <p>Total Revenue</p>
              </div>
              <div className="stat-card users">
                <span className="stat-icon">👥</span>
                <h3>{adminData.todaysStats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
              <div className="stat-card completed">
                <span className="stat-icon">✅</span>
                <h3>{adminData.todaysStats.completedBookings}</h3>
                <p>Completed Services</p>
              </div>
              <div className="stat-card parts">
                <span className="stat-icon">🔧</span>
                <h3>{adminData.parts.length}</h3>
                <p>Available Parts</p>
              </div>
              <div className="stat-card orders">
                <span className="stat-icon">📦</span>
                <h3>{adminData.todaysStats.pendingOrders}</h3>
                <p>Pending Orders</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button onClick={() => setActiveTab('technicians')} className="action-btn">
                  👨‍🔧 Manage Technicians
                </button>
                <button onClick={() => setActiveTab('bookings')} className="action-btn">
                  📅 View Bookings
                </button>
                <button onClick={() => setActiveTab('part-orders')} className="action-btn">
                  📦 Check Orders
                </button>
                <button onClick={() => setActiveTab('flags')} className="action-btn">
                  🚩 Review Flags
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {adminData.bookings.slice(0, 5).map(booking => (
                  <div key={booking._id} className="activity-item">
                    <span className="activity-icon">📅</span>
                    <div className="activity-content">
                      <p><strong>New booking</strong> from {booking.customerId?.userName}</p>
                      <small>{new Date(booking.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
                {adminData.partOrders.slice(0, 3).map(order => (
                  <div key={order._id} className="activity-item">
                    <span className="activity-icon">📦</span>
                    <div className="activity-content">
                      <p><strong>Part ordered:</strong> {order.partId?.name}</p>
                      <small>{new Date(order.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NEW: Part Orders Tab */}
        {activeTab === 'part-orders' && (
          <div>
            <h2 className="section-title">Parts Orders Management</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Technician</th>
                    <th>Part Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.partOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="id-cell">#{order._id.slice(-6)}</td>
                      <td className="name-cell">{order.technicianId?.userName}</td>
                      <td className="name-cell">{order.partId?.name}</td>
                      <td className="category-cell">{order.partId?.category}</td>
                      <td className="price-cell">₹{order.partId?.price}</td>
                      <td>
                        <span className={`status-badge ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="date-cell">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {order.status === 'placed' && (
                            <button onClick={() => cancelPartOrder(order._id)} className="action-btn reject">
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All existing tabs remain the same... */}
        {activeTab === 'technicians' && (
          <div>
            <h2 className="section-title">Technicians Management</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Expertise</th>
                    <th>KYC Status</th>
                    <th>Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.technicians.map((tech) => (
                    <tr key={tech._id}>
                      <td className="name-cell">{tech.userId?.userName}</td>
                      <td>{tech.userId?.email}</td>
                      <td>{tech.userId?.phone}</td>
                      <td className="expertise-cell">{tech.expertise?.join(', ')}</td>
                      <td>
                        <span className={`status-badge ${tech.kycStatus}`}>
                          {tech.kycStatus}
                        </span>
                      </td>
                      <td className="rating-cell">{tech.avgRating || 'N/A'}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {tech.kycStatus === 'pending' && (
                            <>
                              <button onClick={() => handleKycAction(tech._id, 'approved')} className="action-btn approve">
                                Approve
                              </button>
                              <button onClick={() => handleKycAction(tech._id, 'rejected')} className="action-btn reject">
                                Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => viewKycImages(tech._id)} className="action-btn">
                            View KYC
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <h2 className="section-title">Customer Management</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Join Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.customers.map((customer) => (
                    <tr key={customer._id}>
                      <td className="name-cell">{customer.userName}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone}</td>
                      <td>
                        <span className={`status-badge ${customer.status}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="date-cell">{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {customer.status === 'active' ? (
                            <button onClick={() => handleUserAction(customer._id, 'suspended', 'Customer')} className="action-btn suspend">
                              Suspend
                            </button>
                          ) : (
                            <button onClick={() => handleUserAction(customer._id, 'active', 'Customer')} className="action-btn activate">
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            <h2 className="section-title">Bookings Management</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer</th>
                    <th>Technician</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td className="id-cell">#{booking._id.slice(-6)}</td>
                      <td className="name-cell">{booking.customerId?.userName}</td>
                      <td className="name-cell">{booking.technicianId?.userName}</td>
                      <td className="service-cell">{booking.serviceType}</td>
                      <td className="date-cell">{new Date(booking.scheduledDate).toLocaleDateString()} {booking.scheduledTime}</td>
                      <td>
                        <span className={`status-badge ${booking.status}`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="date-cell">{new Date(booking.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button onClick={() => cancelBooking(booking._id)} className="action-btn reject">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'parts' && (
          <div>
            <h2 className="section-title">Parts Management</h2>
            
            <div className="add-part-section">
              <h3>Add New Part</h3>
              <form onSubmit={handleAddPart} className="add-part-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Part Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Part Name"
                      value={newPart.name}
                      onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Category"
                      value={newPart.category}
                      onChange={(e) => setNewPart({...newPart, category: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Price"
                      value={newPart.price}
                      onChange={(e) => setNewPart({...newPart, price: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Stock"
                      value={newPart.stock}
                      onChange={(e) => setNewPart({...newPart, stock: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Description"
                      value={newPart.description}
                      onChange={(e) => setNewPart({...newPart, description: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className="submit-btn">Add Part</button>
              </form>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.parts.map((part) => (
                    <tr key={part._id}>
                      <td className="name-cell">{part.name}</td>
                      <td className="category-cell">{part.category}</td>
                      <td className="price-cell">₹{part.price}</td>
                      <td className="stock-cell">{part.stock}</td>
                      <td className="description-cell">{part.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'flags' && (
          <div>
            <h2 className="section-title">Flags Management</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Flag ID</th>
                    <th>Raised By</th>
                    <th>Against</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.flags.map((flag) => (
                    <tr key={flag._id}>
                      <td className="id-cell">#{flag._id.slice(-6)}</td>
                      <td className="name-cell">{flag.raisedBy?.userName}</td>
                      <td className="name-cell">{flag.againstUser?.userName}</td>
                      <td className="reason-cell">{flag.reason}</td>
                      <td>
                        <span className={`status-badge ${flag.status}`}>
                          {flag.status}
                        </span>
                      </td>
                      <td className="date-cell">{new Date(flag.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {flag.status === 'open' && (
                            <>
                              <button onClick={() => handleFlagAction(flag._id, 'resolved')} className="action-btn approve">
                                Resolve
                              </button>
                              <button onClick={() => handleFlagAction(flag._id, 'dismissed')} className="action-btn dismiss">
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <h2 className="section-title">Reviews Management</h2>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>Customer</th>
                    <th>Technician</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.reviews.map((review) => (
                    <tr key={review._id}>
                      <td className="id-cell">#{review._id.slice(-6)}</td>
                      <td className="name-cell">{review.customerId?.userName}</td>
                      <td className="name-cell">{review.technicianId?.userName}</td>
                      <td className="rating-cell">
                        <span className={`rating-badge rating-${review.rating}`}>
                          {review.rating}/5 ⭐
                        </span>
                      </td>
                      <td className="comment-cell">{review.comment || 'No comment'}</td>
                      <td className="date-cell">{new Date(review.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* KYC Images Modal */}
      {selectedTechKyc && (
        <div className="modal-overlay" onClick={() => setSelectedTechKyc(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>KYC Documents</h3>
              <button onClick={() => setSelectedTechKyc(null)} className="modal-close">×</button>
            </div>
            <div className="modal-content">
              <div className="kyc-images-container">
                {kycImages.IDImage && (
                  <div className="kyc-image-wrapper">
                    <h4>ID Document</h4>
                    <img src={`${import.meta.env.VITE_BACKEND_URL}${kycImages.IDImage}`} alt="ID Document" className="kyc-image" />
                  </div>
                )}
                {kycImages.Photo && (
                  <div className="kyc-image-wrapper">
                    <h4>Photo</h4>
                    <img src={`${import.meta.env.VITE_BACKEND_URL}${kycImages.Photo}`} alt="Technician Photo" className="kyc-image" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
