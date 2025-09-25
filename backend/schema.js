const { Schema, model, Types } = require('mongoose');

// USERS
const UserSchema = new Schema({
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "technician", "admin"], required: true },
    status: { type: String, enum: ["active", "suspended", "pending_verification"], default: "active" },
}, { timestamps: true });


// TECHNICIANS 
const TechnicianSchema = new Schema({
    userId: { type: Types.ObjectId, ref: "User", required: true },
    expertise: [{ type: String, enum: ["AC", "Refrigerator", "Washing Machine"] }],
    serviceAreas: [String], 
    availability: {
        monday: String,
        tuesday: String,
        wednesday: String,
        thursday: String,
        friday: String,
        saturday: String,
        sunday: String
    },
    pricing: Number,
    kycStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    kycDocuments: {
        IDImage: { data: Buffer, contentType: String },  
        Photo: { data: Buffer, contentType: String }
    },
    avgRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    partsOrdered: [{
        o_id: { type: Types.ObjectId, ref: "TrackingLog" },
        p_id: { type: Types.ObjectId, ref: "Part" },
        p_name: String,
        price: Number,
        status: { type: String, enum: ["placed", "dispatched", "in transit", "delivered", "cancelled"] },
        trackingURL: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });


// BOOKINGS
const BookingSchema = new Schema({
    customerId: { type: Types.ObjectId, ref: "User", required: true },
    technicianId: { type: Types.ObjectId, ref: "User", required: true }, 
    deviceType: { type: String, enum: ["AC", "Refrigerator", "Washing Machine"], required: true },
    issueDescription: String,
    status: { type: String, enum: ["pending", "accepted", "rejected", "completed", "cancelled"], default: "pending" },
    location: String,
    scheduledTime: Date,
    confirmedTime: Date
}, { timestamps: true });


// REVIEWS
const ReviewSchema = new Schema({
    bookingId: { type: Types.ObjectId, ref: "Booking", required: true, unique: true },
    customerId: { type: Types.ObjectId, ref: "User", required: true },
    technicianId: { type: Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: String,
}, { timestamps: true });


// FLAGS
const FlagSchema = new Schema({
    bookingId: { type: Types.ObjectId, ref: "Booking", required: true },
    raisedBy: { type: Types.ObjectId, ref: "User", required: true },
    description: String,
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    response: String,
    closedAt: Date
}, { timestamps: true });


// ADMIN ACTIONS
const AdminActionsSchema = new Schema({
    adminId: { type: Types.ObjectId, ref: "User", required: true },
    actionType: { type: String, required: true },   // e.g. "KYC_APPROVAL", "SUSPEND_ACCOUNT"
    targetUserId: { type: Types.ObjectId, ref: "User", required: true },
    reason: String
}, { timestamps: true });


// PART
const PartSchema = new Schema({
    p_name: { type: String, unique: true },
    price: Number,
    supplier: String,
    stock: Number
}, { timestamps: true });


// TRACKING LOG
const TrackingLogSchema = new Schema({
    p_id: { type: Types.ObjectId, ref: "Part" },
    price: Number,
    status: { type: String, enum: ["placed", "dispatched", "in transit", "delivered", "cancelled"] },
    trackingURL: String,
    buyer_ID: { type: Types.ObjectId, ref: "Technician" }
}, { timestamps: true });


// MODELS
const User = model('User', UserSchema);
const Technician = model('Technician', TechnicianSchema);
const Booking = model('Booking', BookingSchema);
const Review = model('Review', ReviewSchema);
const Flag = model('Flag', FlagSchema);
const AdminAction = model('AdminAction', AdminActionsSchema);
const Part = model('Part', PartSchema);
const TrackingLog = model('TrackingLog', TrackingLogSchema);

module.exports = { 
    User, 
    Technician, 
    Booking, 
    Review, 
    Flag, 
    AdminAction,
    Part,
    TrackingLog
};
