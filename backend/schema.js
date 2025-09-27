const { Schema, model, Types } = require('mongoose');

// USERS

const UserSchema = new Schema({

    userName: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    phone: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    role: { type: String, enum: ["customer", "technician", "admin"], required: true },

    status: { type: String, enum: ["active", "suspended", "pending_verification"], default: "active" },

    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    }

}, { timestamps: true });

// TECHNICIANS

const TechnicianSchema = new Schema({

    userId: { type: Types.ObjectId, ref: "User", required: true },

    expertise: [{ type: String, enum: ["AC", "Refrigerator", "Washing Machine"] }],

    serviceAreas: [String],

    availability: {
        monday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        },
        tuesday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        },
        wednesday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        },
        thursday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        },
        friday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        },
        saturday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        },
        sunday: {
            available: { type: Boolean, default: false },
            startHour: { type: Number, min: 0, max: 23 },
            endHour: { type: Number, min: 0, max: 23 }
        }
    },

    pricing: Number,

    kycStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    kycDocuments: {

        IDImage: String,
        Photo: String

    },

    avgRating: { type: Number, default: 0 },

    totalReviews: { type: Number, default: 0 },

    serviceLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        serviceRadius: { type: Number, default: 10 } // radius in km
    },

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
    serviceType: { type: String, enum: ["AC", "Refrigerator", "Washing Machine"], required: true },
    description: String,
    address: String,
    scheduledDate: Date,
    scheduledTime: String,
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "completed", "cancelled", "in_progress"],
        default: "pending"
    },
    reviewId: { type: Types.ObjectId, ref: "Review" },
    cancellationReason: String,
    cancelledBy: { type: Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    serviceLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  distance: { type: Number }
}, { timestamps: true });

// REVIEWS

const ReviewSchema = new Schema({

    bookingId: { type: Types.ObjectId, ref: "Booking", required: true, unique: true },

    customerId: { type: Types.ObjectId, ref: "User", required: true },

    technicianId: { type: Types.ObjectId, ref: "User", required: true },

    rating: { type: Number, min: 1, max: 5, required: true },

    comment: String,

}, { timestamps: true });

// FLAGS

const FlagSchema = new Schema({
    raisedBy: { type: Types.ObjectId, ref: "User", required: true },
    againstUser: { type: Types.ObjectId, ref: "User", required: true },
    reason: String,
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    resolvedBy: { type: Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    description: String,
    relatedBooking: { type: Types.ObjectId, ref: "Booking" }
}, { timestamps: true });

// ADMIN ACTIONS

const AdminActionSchema = new Schema({

    adminId: { type: Types.ObjectId, ref: "User", required: true },

    action: { type: String, required: true }, // e.g. "KYC_APPROVAL", "SUSPEND_ACCOUNT"

    targetType: String, // e.g. "user", "booking", "technician"

    targetId: { type: Types.ObjectId, required: true },

    description: String

}, { timestamps: true });

// PART

const PartSchema = new Schema({

    name: { type: String, unique: true, required: true },

    description: String,

    price: { type: Number, required: true },

    category: String,

    stock: { type: Number, required: true, default: 0 },

    supplier: String

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
const AdminAction = model('AdminAction', AdminActionSchema);
const Part = model('Part', PartSchema);
const TrackingLog = model('TrackingLog', TrackingLogSchema);

module.exports = { User, Technician, Booking, Review, Flag, AdminAction, Part, TrackingLog };