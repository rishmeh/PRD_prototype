import { Routes, Route } from "react-router-dom"
import HomePage from "./pages/HomePage.jsx"
import Login from "./pages/Login.jsx"
import SignUp from "./pages/SignUp.jsx"
import TechnicianPage from "./pages/technicianPage.jsx"
import CustomerPage from "./pages/customerPage.jsx"
import AdminPage from "./pages/AdminPage.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/technician" element={<TechnicianPage />} />
      <Route path="/customer" element={<CustomerPage/>} />
      <Route path="/admin" element={<AdminPage/>} />
    </Routes>
  )
}

export default App
