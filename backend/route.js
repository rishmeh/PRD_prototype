const express = require("express");
const router = express.Router();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv= require("dotenv");
const {
  User,
  Technician,
  Booking,
  Review,
  Flag,
  AdminAction,
  Part,
  TrackingLog
} = require("./schema");

router.use(express.json());
router.use(cors());

dotenv.config();
// JWT Secret key (move to .env in production)
const JWT_SECRET = process.env.jwtsecret;

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Generate JWT
const generateToken = (user) => {
  return jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
};

// ---------------- AUTH & USERS ----------------

// Register Customer
router.post("/register_customer", async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Customer already exists" });

    const newUser = new User({ userName: name, email, phone, password, role: "customer" });
    await newUser.save();

    res.status(201).json({
      message: "Customer registered successfully",
      token: generateToken(newUser),
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// Register Technician (basic, KYC handled separately)
router.post("/register_technician", async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Technician already exists" });

    const newUser = new User({ userName: name, email, phone, password, role: "technician" });
    await newUser.save();

    res.status(201).json({
      message: "Technician registered successfully",
      token: generateToken(newUser),
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(401).json({ message: "Invalid credentials" });

    res.status(200).json({
      message: "Login successful",
      token: generateToken(user),
      user
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// Get profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// ---------------- TECHNICIANS ----------------

// Create / update technician profile
router.post("/technicians", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    let profile = await Technician.findOne({ userId: req.userId });
    if (profile) {
      Object.assign(profile, req.body);
    } else {
      profile = new Technician({ userId: req.userId, ...req.body });
    }
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Failed to save profile", error: err.message });
  }
});

// Search technicians
router.get("/technicians", async (req, res) => {
  const { expertise, location } = req.query;
  try {
    const query = {};
    if (expertise) query.expertise = expertise;
    if (location) query.serviceAreas = location;

    const techs = await Technician.find(query).populate("userId", "userName email phone");
    res.json(techs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch technicians" });
  }
});

// ---------------- BOOKINGS ----------------

// Create booking
router.post("/bookings", verifyToken, async (req, res) => {
  if (req.role !== "customer") return res.status(403).json({ message: "Forbidden" });

  try {
    const booking = new Booking({ customerId: req.userId, ...req.body });
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to create booking", error: err.message });
  }
});

// Update booking status (technician accept/reject, complete, cancel)
router.patch("/bookings/:id/status", verifyToken, async (req, res) => {
  const { status } = req.body;
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = status;
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to update booking" });
  }
});

// ---------------- REVIEWS ----------------
router.post("/reviews", verifyToken, async (req, res) => {
  if (req.role !== "customer") return res.status(403).json({ message: "Forbidden" });

  try {
    const review = new Review({ customerId: req.userId, ...req.body });
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: "Failed to add review" });
  }
});

// ---------------- FLAGS ----------------
router.post("/flags", verifyToken, async (req, res) => {
  try {
    const flag = new Flag({ raisedBy: req.userId, ...req.body });
    await flag.save();
    res.status(201).json(flag);
  } catch (err) {
    res.status(500).json({ message: "Failed to raise flag" });
  }
});

// ---------------- ADMIN ACTIONS ----------------
router.post("/admin/actions", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  try {
    const action = new AdminAction({ adminId: req.userId, ...req.body });
    await action.save();
    res.status(201).json(action);
  } catch (err) {
    res.status(500).json({ message: "Failed to create admin action" });
  }
});

// ---------------- PARTS ----------------
router.get("/parts", async (req, res) => {
  try {
    const parts = await Part.find();
    res.json(parts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch parts" });
  }
});

router.post("/parts/order", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    const log = new TrackingLog({ buyer_ID: req.userId, ...req.body });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: "Failed to place order" });
  }
});

module.exports = router;
