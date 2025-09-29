# Appliance Repair Directory (MVP)

A **SaaS-based directory platform** connecting customers with appliance repair technicians specializing in **ACs, refrigerators, and washing machines**.  
Prototype MVP built with the **MERN stack** (MongoDB, Express.js, React, Node.js).

---

## 📌 Overview
The MVP allows customers to **discover, compare, and book technicians** based on location, ratings, and expertise.  
Technicians manage profiles and availability, while admins verify accounts and monitor data.

---

## 🎯 Core Objectives
- Simple technician directory by location  
- Customer access to technician profiles, ratings, and reviews  
- Technician profile & booking management  
- Admin verification & monitoring  
- Payments, logistics, and advanced features are **out of scope**  

---

## 👥 User Roles
**Customer:** Search technicians → Book → Review  
**Technician:** Signup/KYC → Manage profile → Accept/Reject bookings  
**Admin:** Verify technicians → Monitor bookings & ratings → Manage flagged accounts  

---

## ⚙️ MVP Features
**Customer:** Search by location/device, view profiles, book, leave ratings  
**Technician:** Signup/KYC, profile management, booking management, job history  
**Admin:** Technician verification, booking monitoring, account management  

---

## 🛠️ Technology Stack
- Frontend: React.js (Vite)  
- Backend: Node.js + Express  
- Database: MongoDB  
- Authentication: JWT  
- Hosting: Vercel (frontend), Render (backend)  
- Maps & Location: Nomatim API  

---

## 📂 Project Structure (Simplified)
```

backend/
├── server.js
├── route.js
├── schema.js
├── databaseConnection.js
├── uploads/
└── package.json

frontend/
├── src/
│   ├── pages/
│   ├── css/
│   └── assets/
├── public/
└── package.json

userflow/   # User flow diagrams

````

---

## 🚀 Getting Started

### 1. Clone Repository
```bash
git clone https://github.com/your-username/appliance-repair-mvp.git
cd appliance-repair-mvp
````

### 2. Run Backend

```bash
cd backend
npm install
node server.js
```

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```
