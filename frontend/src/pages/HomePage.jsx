import '../css/HomePage.css'

function HomePage() {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="logo">Repair Hero</h1>
        <nav className="nav">
          <a href="/login">Login</a>
          <a href="/signup" className="btn">Sign Up</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h2>Find Trusted Appliance Technicians</h2>
        <p className="tagline">Reliable repair services for ACs, Refrigerators, and Washing Machines.</p>
        
        <ul className="hero-list">
          <li>✔ Verified and background-checked technicians</li>
          <li>✔ Compare ratings and reviews before booking</li>
          <li>✔ Fast booking with instant confirmation</li>
        </ul>

        <div className="hero-buttons">
          <a href="/search" className="btn">Find Technicians</a>
          <a href="/register_technician" className="btn">Become a Technician</a>
        </div>
      </section>


      {/* Role Cards */}
      <section className="roles">
        <div className="card">
          <h3>For Customers</h3>
          <p>Search, compare, and book technicians based on expertise and ratings.</p>
          <a href="/search">Start Now →</a>
        </div>
        <div className="card">
          <h3>For Technicians</h3>
          <p>Create your profile, manage bookings, and grow your customer base.</p>
          <a href="/signup">Join Us →</a>
        </div>
        <div className="card">
          <h3>For Admins</h3>
          <p>Verify technicians, monitor bookings, and resolve disputes.</p>
          <a href="/admin">Go to Panel →</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        © 2025 Repair Hero · All Rights Reserved
      </footer>
    </div>
  )
}

export default HomePage
