const express = require("express");
const router = express.Router();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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

    const newTechnician = new Technician({
      userId: newUser._id,
      expertise: [],
      serviceAreas: [],
      availability: {
        monday: { available: false, startHour: 9, endHour: 17 },
        tuesday: { available: false, startHour: 9, endHour: 17 },
        wednesday: { available: false, startHour: 9, endHour: 17 },
        thursday: { available: false, startHour: 9, endHour: 17 },
        friday: { available: false, startHour: 9, endHour: 17 },
        saturday: { available: false, startHour: 9, endHour: 17 },
        sunday: { available: false, startHour: 9, endHour: 17 }
      },
      pricing: 0,
      kycStatus: "not_submitted",
      avgRating: 0,
      totalReviews: 0
    });

    await newTechnician.save();


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

// Get user profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user profile", error: err.message });
  }
});

// Update user profile
router.put("/me", verifyToken, async (req, res) => {
  const { userName, email, phone } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { userName, email, phone },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email or phone already exists" });
    }
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});

// Update user location (for both customers and technicians)
router.put("/location", verifyToken, async (req, res) => {
  const { latitude, longitude, address } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Latitude and longitude are required" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address || ""
        }
      },
      { new: true }
    ).select("-password");

    // If user is a technician, also update technician service location
    if (req.role === "technician") {
      await Technician.findOneAndUpdate(
        { userId: req.userId },
        {
          serviceLocation: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            serviceRadius: 10 // default 10km radius
          }
        }
      );
    }

    res.json({ message: "Location updated successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Failed to update location", error: err.message });
  }
});


// ---------------- TECHNICIANS ----------------


router.get("/technicians/nearby", verifyToken, async (req, res) => {
  if (req.role !== "customer") return res.status(403).json({ message: "Forbidden" });

  const { latitude, longitude, radius = 25, expertise } = req.query;
  try {
    let query = { kycStatus: "approved" };
    if (expertise) query.expertise = expertise;

    const technicians = await Technician.find(query).populate("userId", "userName email phone location");

    const nearbyTechnicians = technicians
      .filter(tech => tech.serviceLocation?.latitude && tech.serviceLocation?.longitude)
      .map(tech => ({
        ...tech.toObject(),
        distance: Math.round(calculateDistance(
          parseFloat(latitude), parseFloat(longitude),
          tech.serviceLocation.latitude, tech.serviceLocation.longitude
        ) * 100) / 100
      }))
      .filter(tech => tech.distance <= Math.min(parseFloat(radius), tech.serviceLocation.serviceRadius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyTechnicians);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch nearby technicians", error: err.message });
  }
});

// Update technician service radius
router.put("/technicians/service-radius", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  const { serviceRadius } = req.body;

  if (!serviceRadius || serviceRadius < 1 || serviceRadius > 50) {
    return res.status(400).json({ message: "Service radius must be between 1 and 50 km" });
  }

  try {
    const technician = await Technician.findOneAndUpdate(
      { userId: req.userId },
      { "serviceLocation.serviceRadius": parseFloat(serviceRadius) },
      { new: true }
    );

    if (!technician) {
      return res.status(404).json({ message: "Technician profile not found" });
    }

    res.json({ message: "Service radius updated successfully", serviceRadius });
  } catch (err) {
    res.status(500).json({ message: "Failed to update service radius", error: err.message });
  }
});


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

// Get reviews for a technician
// This route expects Technician document _id (68d8c760ade296d8fe1315be)
router.get("/technicians/:id/reviews", async (req, res) => {
  try {
    console.log("Looking for reviews with technicianId:", req.params.id);
    
    const reviews = await Review.find({ technicianId: req.params.id })
      .populate("customerId", "userName")
      .sort({ createdAt: -1 });

    console.log("Found reviews:", reviews.length);
    
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
  }
});


// Get technician profile for current user
router.get("/technicians/me", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    const profile = await Technician.findOne({ userId: req.userId }).populate("userId", "userName email phone");

    if (!profile) {
      return res.status(404).json({ message: "Technician profile not found" });
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch technician profile", error: err.message });
  }
});

// KYC document upload
router.post("/technicians/kyc", verifyToken, upload.fields([
  { name: "IDImage", maxCount: 1 },
  { name: "Photo", maxCount: 1 }
]), async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    const kycDocuments = {};

    if (req.files.IDImage) {
      kycDocuments.IDImage = req.files.IDImage[0].path;
    }
    if (req.files.Photo) {
      kycDocuments.Photo = req.files.Photo[0].path;
    }

    // FIXED: Use upsert to create Technician profile if it doesn't exist
    const updatedTechnician = await Technician.findOneAndUpdate(
      { userId: req.userId },
      { 
        userId: req.userId,  // Ensure userId is set
        kycDocuments,
        kycStatus: "pending",
        // Initialize other required fields with defaults
        expertise: [],
        serviceAreas: [],
        availability: {
          monday: { available: false, startHour: 9, endHour: 17 },
          tuesday: { available: false, startHour: 9, endHour: 17 },
          wednesday: { available: false, startHour: 9, endHour: 17 },
          thursday: { available: false, startHour: 9, endHour: 17 },
          friday: { available: false, startHour: 9, endHour: 17 },
          saturday: { available: false, startHour: 9, endHour: 17 },
          sunday: { available: false, startHour: 9, endHour: 17 }
        },
        pricing: 0,
        avgRating: 0,
        totalReviews: 0
      },
      { 
        new: true,
        upsert: true,  // ← This creates the document if it doesn't exist
        setDefaultsOnInsert: true  // Apply schema defaults when inserting
      }
    );

    res.json({ 
      message: "KYC documents uploaded successfully", 
      kycStatus: "pending",
      technicianId: updatedTechnician._id 
    });
  } catch (err) {
    console.error("KYC Upload Error:", err);
    res.status(500).json({ message: "Failed to upload KYC documents", error: err.message });
  }
});


// Create flag (for customers and technicians)
router.post("/bookings/:id/flag", verifyToken, async (req, res) => {
  const { reason, description } = req.body;

  try {
    // Verify booking exists
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    let hasAccess = false;
    let againstUser = null;

    // Check if user is the customer
    if (booking.customerId.toString() === req.userId) {
      hasAccess = true;
      againstUser = booking.technicianId;
    } 
    // Check if user is the technician
    else if (req.role === "technician") {
      // Find technician document to compare
      const technician = await Technician.findOne({ userId: req.userId });
      if (technician && booking.technicianId.toString() === technician._id.toString()) {
        hasAccess = true;
        againstUser = booking.customerId;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const flag = new Flag({
      raisedBy: req.userId,
      againstUser: againstUser,
      reason,
      description,
      relatedBooking: req.params.id
    });

    await flag.save();
    res.status(201).json({ message: "Flag raised successfully", flag });
  } catch (err) {
    res.status(500).json({ message: "Failed to raise flag", error: err.message });
  }
});



// Get user's flags
router.get("/flags/my", verifyToken, async (req, res) => {
  try {
    const flags = await Flag.find({ raisedBy: req.userId })
      .populate("againstUser", "userName email")
      .populate("relatedBooking")
      .sort({ createdAt: -1 });

    res.json(flags);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch flags", error: err.message });
  }
});


// Update booking status (for technicians)
// Fixed booking status update route
router.put("/bookings/:id/status", verifyToken, async (req, res) => {
  const { status } = req.body;

  try {
    // Find the booking first
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    let hasPermission = false;

    // Check if user is the customer
    if (req.role === "customer" && booking.customerId.toString() === req.userId) {
      hasPermission = true;
    }
    // Check if user is the technician
    else if (req.role === "technician") {
      // Find technician document to get the _id
      const technician = await Technician.findOne({ userId: req.userId });
      if (technician && booking.technicianId.toString() === technician._id.toString()) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ message: "Access denied - not your booking" });
    }

    // Validate status transitions
    const validStatuses = ["pending", "accepted", "rejected", "completed", "cancelled", "in_progress"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Update the booking status
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("customerId", "userName email phone")
     .populate("technicianId", "userId"); // This will give us the user info

    res.json({ 
      message: "Booking status updated successfully", 
      booking: updatedBooking 
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to update booking status", error: err.message });
  }
});



// Get technician bookings (with KYC check)
router.get("/technicians/bookings", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    // Check if technician KYC is approved
    const technician = await Technician.findOne({ userId: req.userId });
    if (!technician || technician.kycStatus !== "approved") {
      return res.status(403).json({ message: "KYC approval required to access bookings" });
    }

    const bookings = await Booking.find({ technicianId: technician._id })
      .populate("customerId", "userName email phone")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
});

router.get("/technicians/booking-requests", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    // Check if technician KYC is approved
    const technician = await Technician.findOne({ userId: req.userId });
    if (!technician || technician.kycStatus !== "approved") {
      return res.status(403).json({ message: "KYC approval required to access bookings" });
    }

    const bookings = await Booking.find({ technicianId: req._id })
      .populate("customerId", "userName email phone")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
});

// ---------------- BOOKINGS ----------------

// Get customer's bookings
router.get("/bookings/customer", verifyToken, async (req, res) => {
  if (req.role !== "customer") return res.status(403).json({ message: "Forbidden" });

  try {
    const bookings = await Booking.find({ customerId: req.userId })
      .populate("technicianId", "userName email phone")
      .populate("reviewId")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
});

// Create a new booking
router.post("/bookings", verifyToken, async (req, res) => {
  if (req.role !== "customer") return res.status(403).json({ message: "Forbidden" });

  const { technicianId, serviceType, scheduledDate, scheduledTime, address, description, serviceLocation } = req.body;

  if (!serviceLocation?.latitude || !serviceLocation?.longitude) {
    return res.status(400).json({ message: "Service location coordinates required" });
  }

  try {
    const technician = await Technician.findOne({ _id: technicianId });
    if (!technician || technician.kycStatus !== "approved") {
      return res.status(400).json({ message: "Selected technician not available" });
    }

    let distance = null;
    if (technician.serviceLocation) {
      distance = Math.round(calculateDistance(
        serviceLocation.latitude, serviceLocation.longitude,
        technician.serviceLocation.latitude, technician.serviceLocation.longitude
      ) * 100) / 100;
    }

    const booking = new Booking({
      customerId: req.userId, technicianId, serviceType, scheduledDate, scheduledTime,
      address, description, serviceLocation, distance, status: "pending"
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate("customerId", "userName email phone")
      .populate("technicianId", "userName email phone");

    res.status(201).json(populatedBooking);
  } catch (err) {
    res.status(500).json({ message: "Failed to create booking", error: err.message });
  }
});

// ---------------- REVIEWS ----------------
router.post("/reviews", verifyToken, async (req, res) => {
  if (req.role !== "customer") return res.status(403).json({ message: "Forbidden" });

  const { bookingId, rating, comment } = req.body;

  try {
    // Check if booking exists and belongs to customer
    const booking = await Booking.findOne({
      _id: bookingId,
      customerId: req.userId,
      status: "completed"
    });

    if (!booking) {
      return res.status(400).json({ message: "Booking not found or not completed" });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({ message: "Review already exists for this booking" });
    }

    const review = new Review({
      customerId: req.userId,
      technicianId: booking.technicianId, // This is already the Technician document _id
      bookingId,
      rating,
      comment
    });

    await review.save();

    // Update booking with review ID
    await Booking.findByIdAndUpdate(bookingId, { reviewId: review._id });

    // FIXED: Recalculate technician's average rating
    // Use booking.technicianId (Technician document _id) to find reviews
    const reviews = await Review.find({ technicianId: booking.technicianId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    // Update the Technician document using its _id
    await Technician.findByIdAndUpdate(
      booking.technicianId, // This is the Technician document _id
      {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews.length
      }
    );

    console.log(`Updated technician ${booking.technicianId} - Rating: ${avgRating}, Reviews: ${reviews.length}`);

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: "Failed to create review", error: err.message });
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

// Admin route to approve/reject KYC
router.put("/admin/technicians/:id/kyc", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  const { kycStatus } = req.body;
  const validStatuses = ["approved", "rejected"];

  if (!validStatuses.includes(kycStatus)) {
    return res.status(400).json({ message: "Invalid KYC status" });
  }

  try {
    const technician = await Technician.findByIdAndUpdate(
      req.params.id,
      { kycStatus },
      { new: true }
    ).populate("userId", "userName email");

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    res.json({ message: `KYC ${kycStatus} successfully`, technician });
  } catch (err) {
    res.status(500).json({ message: "Failed to update KYC status", error: err.message });
  }
});

// Get KYC images for admin review
router.get("/admin/technicians/:id/kyc-images", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const technician = await Technician.findById(req.params.id);
    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    // Return image file paths for the admin to view
    const kycImages = {
      IDImage: technician.IDImage ? `/uploads/${technician.IDImage}` : null,
      Photo: technician.Photo ? `/uploads/${technician.Photo}` : null,
      kycStatus: technician.kycStatus
    };

    res.json(kycImages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch KYC images", error: err.message });
  }
});



// Add these routes to your route.js file for admin functionality

// Get all technicians (admin only)
router.get("/admin/technicians", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const technicians = await Technician.find({})
      .populate("userId", "userName email phone status createdAt")
      .sort({ createdAt: -1 });

    res.json(technicians);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch technicians", error: err.message });
  }
});

// Admin cancel booking with reason
router.put("/admin/bookings/:id/cancel", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: "Cancellation reason is required" });
  }

  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy: req.userId,
        cancelledAt: new Date()
      },
      { new: true }
    ).populate("customerId", "userName email phone")
      .populate("technicianId", "userName email phone");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Log admin action
    await AdminAction.create({
      adminId: req.userId,
      action: "CANCEL_BOOKING",
      targetType: "booking",
      targetId: booking._id,
      description: `Cancelled booking with reason: ${reason}`
    });

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking", error: err.message });
  }
});


// Get all users (admin only)
router.get("/admin/users", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// Get all bookings (admin only)
router.get("/admin/bookings", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const bookings = await Booking.find({})
      .populate("customerId", "userName email phone")
      .populate("technicianId", "userName email phone")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
});

// Get all flags (admin only)
router.get("/admin/flags", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const flags = await Flag.find({})
      .populate("raisedBy", "userName email")
      .populate("againstUser", "userName email")
      .sort({ createdAt: -1 });

    res.json(flags);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch flags", error: err.message });
  }
});

// Get all reviews (admin only)
router.get("/admin/reviews", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const reviews = await Review.find({})
      .populate("customerId", "userName email")
      .populate("technicianId", "userName email")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
  }
});

// Update user status (admin only)
router.put("/admin/users/:id/status", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  const { status } = req.body;
  const validStatuses = ["active", "suspended", "pending_verification"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `User status updated to ${status}`, user });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user status", error: err.message });
  }
});

// Add new part (admin only)
router.post("/admin/parts", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const part = new Part(req.body);
    await part.save();
    res.status(201).json(part);
  } catch (err) {
    res.status(500).json({ message: "Failed to add part", error: err.message });
  }
});

// Update part (admin only)
router.put("/admin/parts/:id", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const part = await Part.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }
    res.json(part);
  } catch (err) {
    res.status(500).json({ message: "Failed to update part", error: err.message });
  }
});

// Delete part (admin only)
router.delete("/admin/parts/:id", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const part = await Part.findByIdAndDelete(req.params.id);
    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }
    res.json({ message: "Part deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete part", error: err.message });
  }
});

// Update flag status (admin only)
router.put("/admin/flags/:id", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  const { status, resolvedBy } = req.body;
  const validStatuses = ["open", "resolved", "dismissed"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid flag status" });
  }

  try {
    const flag = await Flag.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolvedBy: req.userId,
        resolvedAt: status !== "open" ? new Date() : null
      },
      { new: true }
    ).populate("raisedBy", "userName email")
      .populate("againstUser", "userName email");

    if (!flag) {
      return res.status(404).json({ message: "Flag not found" });
    }

    res.json({ message: `Flag ${status} successfully`, flag });
  } catch (err) {
    res.status(500).json({ message: "Failed to update flag status", error: err.message });
  }
});

// Get admin dashboard stats
router.get("/admin/dashboard", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalUsers,
      totalTechnicians,
      totalBookings,
      todaysBookings,
      pendingKyc,
      activeFlags,
      completedBookings
    ] = await Promise.all([
      User.countDocuments({}),
      Technician.countDocuments({}),
      Booking.countDocuments({}),
      Booking.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Technician.countDocuments({ kycStatus: "pending" }),
      Flag.countDocuments({ status: "open" }),
      Booking.countDocuments({ status: "completed" })
    ]);

    // Calculate total revenue (simplified - based on completed bookings)
    const revenueBookings = await Booking.find({ status: "completed" })
      .populate({
        path: "technicianId",
        populate: {
          path: "userId"
        }
      });

    let totalRevenue = 0;
    for (const booking of revenueBookings) {
      const tech = await Technician.findOne({ userId: booking.technicianId });
      if (tech && tech.pricing) {
        totalRevenue += tech.pricing;
      }
    }

    const stats = {
      totalUsers,
      totalTechnicians,
      totalBookings,
      todaysBookings,
      pendingKyc,
      activeFlags,
      completedBookings,
      totalRevenue,
      conversionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: err.message });
  }
});

// Delete user (admin only) - use with caution
router.delete("/admin/users/:id", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Also delete related data
    if (user.role === "technician") {
      await Technician.deleteOne({ userId: req.params.id });
    }

    // Note: Consider soft deletion or archiving instead of hard deletion
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

// Admin action logging
router.post("/admin/log-action", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const action = new AdminAction({
      adminId: req.userId,
      action: req.body.action,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      description: req.body.description
    });

    await action.save();
    res.status(201).json(action);
  } catch (err) {
    res.status(500).json({ message: "Failed to log admin action", error: err.message });
  }
});

// Admin route to manage parts stock
router.put("/admin/parts/:id/stock", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  const { stock } = req.body;

  try {
    const part = await Part.findByIdAndUpdate(
      req.params.id,
      { stock: parseInt(stock) },
      { new: true }
    );

    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }

    res.json({ message: "Stock updated successfully", part });
  } catch (err) {
    res.status(500).json({ message: "Failed to update stock", error: err.message });
  }
});

// Admin route to view all part orders
router.get("/admin/parts/orders", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  try {
    const orders = await TrackingLog.find({})
      .populate("p_id", "name description category price")
      .populate("buyer_ID", "userName email phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
});

// Update order status (admin only)
router.put("/admin/orders/:id/status", verifyToken, async (req, res) => {
  if (req.role !== "admin") return res.status(403).json({ message: "Admin access required" });

  const { status } = req.body;
  const validStatuses = ["placed", "dispatched", "in transit", "delivered", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const order = await TrackingLog.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("p_id", "name")
      .populate("buyer_ID", "userName");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update technician's partsOrdered array
    await Technician.findOneAndUpdate(
      { userId: order.buyer_ID._id, "partsOrdered.o_id": order._id },
      {
        $set: { "partsOrdered.$.status": status }
      }
    );

    res.json({ message: "Order status updated successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Failed to update order status", error: err.message });
  }
});

// ---------------- PARTS ----------------
// Get parts for technicians to order
router.get("/parts", verifyToken, async (req, res) => {
  try {
    const parts = await Part.find({ stock: { $gt: 0 } }).sort({ name: 1 });
    res.json(parts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch parts", error: err.message });
  }
});

// Get technician's ordered parts
router.get("/parts/orders", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  try {
    const orders = await TrackingLog.find({ buyer_ID: req.userId })
      .populate("p_id", "name description category")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
});

// Order a part (technicians only)
router.post("/parts/order", verifyToken, async (req, res) => {
  if (req.role !== "technician") return res.status(403).json({ message: "Forbidden" });

  const { p_id, status = 'placed' } = req.body;

  try {
    // Check if technician KYC is approved
    const technician = await Technician.findOne({ userId: req.userId });
    if (!technician || technician.kycStatus !== "approved") {
      return res.status(403).json({ message: "KYC approval required to order parts" });
    }

    // Get part details
    const part = await Part.findById(p_id);
    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }

    if (part.stock <= 0) {
      return res.status(400).json({ message: "Part out of stock" });
    }

    // Create tracking log entry
    const trackingLog = new TrackingLog({
      p_id,
      price: part.price,
      status,
      buyer_ID: req.userId,
      trackingURL: `https://tracking.example.com/${Date.now()}`
    });

    await trackingLog.save();

    // Decrease part stock
    await Part.findByIdAndUpdate(p_id, {
      $inc: { stock: -1 }
    });

    // Add to technician's partsOrdered array
    await Technician.findOneAndUpdate(
      { userId: req.userId },
      {
        $push: {
          partsOrdered: {
            o_id: trackingLog._id,
            p_id: part._id,
            p_name: part.name,
            price: part.price,
            status: status,
            trackingURL: trackingLog.trackingURL
          }
        }
      }
    );

    res.status(201).json({
      message: "Part ordered successfully",
      order: trackingLog
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to order part", error: err.message });
  }
});

module.exports = router;