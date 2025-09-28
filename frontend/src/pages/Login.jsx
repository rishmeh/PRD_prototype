import { React, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/Login.css'

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: ""
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
    const endpoint = `${import.meta.env.VITE_BACKEND_URL}/api/login`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      console.log("Success:", data);
      // store token in localStorage
      localStorage.setItem("token", data.token);

      if (data.user.role === "technician"){
        navigate("/technician")
      }
      if (data.user.role === "customer"){
        navigate("/customer")
      }
      if (data.user.role === "admin"){
        navigate("/admin")
      }

    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="login-btn">
            Sign In
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{" "}
            <a href="/signup" className="signup-link">SignUp</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login