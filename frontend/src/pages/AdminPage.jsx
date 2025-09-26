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
    flags: [],
    reviews: [],
    todaysStats: {
      todaysBookings: 0,
      pendingKyc: 0,
      activeFlags: 0,
      totalRevenue: 0
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
        const res = await fetch('http://localhost:8080/api/me', {
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
        const [techRes, userRes, bookingRes, partRes, flagRes, reviewRes] = await Promise.all([
          fetch('http://localhost:8080/api/admin/technicians', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:8080/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:8080/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:8080/api/parts', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:8080/api/admin/flags', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:8080/api/admin/reviews', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const technicians = techRes.ok ? await techRes.json() : [];
        const users = userRes.ok ? await userRes.json() : [];
        const bookings = bookingRes.ok ? await bookingRes.json() : [];
        const parts = partRes.ok ? await partRes.json() : [];
        const flags = flagRes.ok ? await flagRes.json() : [];
        const reviews = reviewRes.ok ? await reviewRes.json() : [];

        const customers = users.filter(user => user.role === 'customer');

        // Calculate today's stats
        const today = new Date().toDateString();
        const todaysBookings = bookings.filter(booking => 
          new Date(booking.createdAt).toDateString() === today
        ).length;

        const pendingKyc = technicians.filter(tech => tech.kycStatus === 'pending').length;
        const activeFlags = flags.filter(flag => flag.status === 'open').length;

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
          flags,
          reviews,
          todaysStats: {
            todaysBookings,
            pendingKyc,
            activeFlags,
            totalRevenue
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

  // KYC approval/rejection
  const handleKycAction = async (technicianId, action) => {
    try {
      const res = await fetch(`http://localhost:8080/api/admin/technicians/${technicianId}/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kycStatus: action })
      });

      if (res.ok) {
        alert(`KYC ${action} successfully!`);
        // Refresh data
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
      const res = await fetch('http://localhost:8080/api/admin/parts', {
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
        setNewPart({ name: '', description: '', price: '', stock: '', category: '' });
        // Refresh parts data
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
      const res = await fetch(`http://localhost:8080/api/admin/users/${userId}/status`, {
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
      const res = await fetch(`http://localhost:8080/api/admin/flags/${flagId}`, {
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

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: '📊' },
          { key: 'technicians', label: 'Technicians', icon: '🔧' },
          { key: 'customers', label: 'Customers', icon: '👥' },
          { key: 'bookings', label: 'Bookings', icon: '📅' },
          { key: 'parts', label: 'Parts', icon: '⚙️' },
          { key: 'flags', label: 'Flags', icon: '🚩' },
          { key: 'reviews', label: 'Reviews', icon: '⭐' }
        ].map(tab => (
          <button 
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-text">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dashboard Overview */}
      {activeTab === 'dashboard' && (
        <div className="tab-content">
          <h2 className="section-title">Today's Overview</h2>
          <div className="stats-grid">
            <div className="stat-card bookings">
              <div className="stat-icon">📅</div>
              <h3>{adminData.todaysStats.todaysBookings}</h3>
              <p>Today's Bookings</p>
            </div>
            <div className="stat-card kyc">
              <div className="stat-icon">🔍</div>
              <h3>{adminData.todaysStats.pendingKyc}</h3>
              <p>Pending KYC</p>
            </div>
            <div className="stat-card flags">
              <div className="stat-icon">🚩</div>
              <h3>{adminData.todaysStats.activeFlags}</h3>
              <p>Active Flags</p>
            </div>
            <div className="stat-card revenue">
              <div className="stat-icon">💰</div>
              <h3>${adminData.todaysStats.totalRevenue}</h3>
              <p>Total Revenue</p>
            </div>
          </div>

          <h3 className="section-title">Quick Stats</h3>
          <div className="quick-stats-grid">
            <div className="quick-stat-card">
              <h4>Total Technicians: {adminData.technicians.length}</h4>
              <div className="stat-breakdown">
                <div className="breakdown-item approved">
                  <span>Approved: {adminData.technicians.filter(t => t.kycStatus === 'approved').length}</span>
                </div>
                <div className="breakdown-item pending">
                  <span>Pending: {adminData.technicians.filter(t => t.kycStatus === 'pending').length}</span>
                </div>
                <div className="breakdown-item rejected">
                  <span>Rejected: {adminData.technicians.filter(t => t.kycStatus === 'rejected').length}</span>
                </div>
              </div>
            </div>
            <div className="quick-stat-card">
              <h4>Total Customers: {adminData.customers.length}</h4>
              <div className="stat-breakdown">
                <div className="breakdown-item approved">
                  <span>Active: {adminData.customers.filter(c => c.status === 'active').length}</span>
                </div>
                <div className="breakdown-item rejected">
                  <span>Suspended: {adminData.customers.filter(c => c.status === 'suspended').length}</span>
                </div>
              </div>
            </div>
            <div className="quick-stat-card">
              <h4>Total Bookings: {adminData.bookings.length}</h4>
              <div className="stat-breakdown">
                <div className="breakdown-item approved">
                  <span>Completed: {adminData.bookings.filter(b => b.status === 'completed').length}</span>
                </div>
                <div className="breakdown-item pending">
                  <span>Pending: {adminData.bookings.filter(b => b.status === 'pending').length}</span>
                </div>
                <div className="breakdown-item progress">
                  <span>In Progress: {adminData.bookings.filter(b => b.status === 'in_progress').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technicians Management */}
      {activeTab === 'technicians' && (
        <div className="tab-content">
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
                      {tech.kycStatus === 'pending' && (
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleKycAction(tech._id, 'approved')}
                            className="action-btn approve"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleKycAction(tech._id, 'rejected')}
                            className="action-btn reject"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => handleUserAction(tech.userId._id, 'suspended', 'technician')}
                        className="action-btn suspend"
                      >
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Customers Management */}
      {activeTab === 'customers' && (
        <div className="tab-content">
          <h2 className="section-title">Customers Management</h2>
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
                    <td className="date-cell">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleUserAction(customer._id, 
                          customer.status === 'active' ? 'suspended' : 'active', 'customer')}
                        className={`action-btn ${customer.status === 'active' ? 'suspend' : 'activate'}`}
                      >
                        {customer.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings Management */}
      {activeTab === 'bookings' && (
        <div className="tab-content">
          <h2 className="section-title">All Bookings</h2>
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
                </tr>
              </thead>
              <tbody>
                {adminData.bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="id-cell">#{booking._id.slice(-6)}</td>
                    <td className="name-cell">{booking.customerId?.userName}</td>
                    <td className="name-cell">{booking.technicianId?.userName}</td>
                    <td className="service-cell">{booking.serviceType}</td>
                    <td className="date-cell">
                      {new Date(booking.scheduledDate).toLocaleDateString()} {booking.scheduledTime}
                    </td>
                    <td>
                      <span className={`status-badge ${booking.status}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parts Management */}
      {activeTab === 'parts' && (
        <div className="tab-content">
          <h2 className="section-title">Parts Management</h2>

          {/* Add New Part Form */}
          <div className="add-part-section">
            <h3>Add New Part</h3>
            <form className="add-part-form" onSubmit={handleAddPart}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="partName">Part Name</label>
                  <input
                    type="text"
                    id="partName"
                    placeholder="Part Name"
                    value={newPart.name}
                    onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <input
                    type="text"
                    id="category"
                    placeholder="Category"
                    value={newPart.category}
                    onChange={(e) => setNewPart({...newPart, category: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price ($)</label>
                  <input
                    type="number"
                    id="price"
                    placeholder="Price"
                    value={newPart.price}
                    onChange={(e) => setNewPart({...newPart, price: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="stock">Stock Quantity</label>
                  <input
                    type="number"
                    id="stock"
                    placeholder="Stock Quantity"
                    value={newPart.stock}
                    onChange={(e) => setNewPart({...newPart, stock: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Description"
                  value={newPart.description}
                  onChange={(e) => setNewPart({...newPart, description: e.target.value})}
                  required
                  className="form-textarea"
                  rows="3"
                />
              </div>
              <button type="submit" className="submit-btn">Add Part</button>
            </form>
          </div>

          {/* Parts List */}
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
                    <td className="price-cell">${part.price}</td>
                    <td className="stock-cell">{part.stock}</td>
                    <td className="description-cell">{part.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flags Management */}
      {activeTab === 'flags' && (
        <div className="tab-content">
          <h2 className="section-title">Flags & Reports</h2>
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
                    <td className="date-cell">
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </td>
                    <td className="actions-cell">
                      {flag.status === 'open' && (
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleFlagAction(flag._id, 'resolved')}
                            className="action-btn approve"
                          >
                            Resolve
                          </button>
                          <button 
                            onClick={() => handleFlagAction(flag._id, 'dismissed')}
                            className="action-btn dismiss"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Management */}
      {activeTab === 'reviews' && (
        <div className="tab-content">
          <h2 className="section-title">All Reviews</h2>
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
                    <td className="date-cell">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;