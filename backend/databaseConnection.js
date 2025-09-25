const mongoose = require("mongoose");
const dotenv =require("dotenv");
dotenv.config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.dbURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to database");
    } catch (err) {
        console.log("Database connection error:", err);
        throw err;
    }
};

module.exports = connectDB;