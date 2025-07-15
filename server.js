const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Koneksi MongoDB
// mongoose.connect(
//   "mongodb+srv://undangan_user:Johndev123%21@cluster0.m4elrjf.mongodb.net/weddingDB?retryWrites=true&w=majority",
//   {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   }
// )
// .then(() => {
//   console.log("✅ Connected to MongoDB Atlas");
//   // Pastikan index dibuat setelah koneksi berhasil
//   return Guest.createIndexes(); 
// })
// .catch((err) => console.error("❌ Connection error:", err));

// Schema Data Tamu
const guestSchema = new mongoose.Schema({
  name: { type: String, trim: true }, // Tambahkan trim
  attendance: Boolean,
  message: String,
}, { timestamps: true }); // Tambahkan timestamps untuk createdAt otomatis

// Definisikan index di schema
guestSchema.index({ name: 1 }); // Standard index untuk sorting/filter
guestSchema.index({ attendance: 1 });
guestSchema.index({ createdAt: -1 });

const Guest = mongoose.model("Guest", guestSchema);
console.log("🌱 Environment Key MONGO_URL ada?", 'MONGO_URL' in process.env);
console.log("🌐 Nilai process.env.MONGO_URL:", process.env.MONGO_URL);
console.log("🔍 ENV MONGO_URL:", process.env.MONGO_URL);

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Connected to MongoDB Atlas via Railway");
  return Guest.createIndexes();
})
.catch((err) => console.error("❌ Connection error:", err));

// API untuk RSVP
app.post("/api/rsvp", async (req, res) => {
  try {
    const guest = new Guest({
      name: req.body.name.trim(), // Bersihkan input
      attendance: req.body.attendance,
      message: req.body.message?.trim()
    });
    await guest.save();
    res.status(201).json({ message: "Konfirmasi berhasil!" });
  } catch (error) {
    res.status(500).json({ 
      error: "Terjadi error!",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API Get Guests (Optimized)
app.get("/api/guests", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = req.query.search?.trim() || "";
    const attendance = req.query.attendance;

    // Build query
    const query = {};
    
    if (search) {
      query.name = { 
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
        $options: 'i' 
      };
    }
    
    if (attendance === 'true' || attendance === 'false') {
      query.attendance = attendance === 'true';
    }

    const [guests, total] = await Promise.all([
      Guest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Guest.countDocuments(query)
    ]);

    res.json({
      success: true,
      guests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalGuests: total,
        guestsPerPage: limit
      }
    });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error",
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
        stack: err.stack
      })
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Terjadi kesalahan server",
    ...(process.env.NODE_ENV === 'development' && {
      details: err.message 
    })
  });
});

// const PORT = 5000;
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});