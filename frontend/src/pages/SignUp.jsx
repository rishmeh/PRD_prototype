import { React, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/SignUp.css'

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "customer", // default
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRoleChange = (e) => {
    setFormData({
      ...formData,
      role: e.target.value === "0" ? "customer" : "technician"
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Decide route based on role
    const endpoint = formData.role === "customer" 
      ? `${import.meta.env.VITE_BACKEND_URL}/api/register_customer`
      : `${import.meta.env.VITE_BACKEND_URL}/api/register_technician`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.user.role === "customer"){
        navigate('/customer')
      }
      if (data.user.role === "technician"){
        navigate('/technician')
      }

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      console.log("Success:", data);
      alert(data.message);
      // store token in localStorage
      localStorage.setItem("token", data.token);

    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <h1>Create Account</h1>
          <p>Join our platform today</p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Register as</label>
            <select
              id="role"
              name="role"
              value={formData.role === "customer" ? "0" : "1"}
              onChange={handleRoleChange}
            >
              <option value="0">Customer</option>
              <option value="1">Technician</option>
            </select>
          </div>

          <button type="submit" className="signup-btn">
            Create Account
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Already have an account?{" "}
            <a href="/login" className="login-link">Login</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp