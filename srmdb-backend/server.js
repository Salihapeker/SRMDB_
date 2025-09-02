const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ortam değişkenlerini kontrol et
const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key-here";
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("❌ TMDB_API_KEY environment variable is required");
  process.exit(1);
}

// CORS ayarları - Frontend origin'lerini tanımla
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000", // Yerel geliştirme için
        "https://srmdb.vercel.app", // Ana Vercel URL'iniz
        "https://srmdb-6u2dqz42k-salihapekers-projects.vercel.app", // Spesifik Vercel URL
        /^https:\/\/srmdb-.*\.vercel\.app$/, // Tüm srmdb ile başlayan Vercel alt domainleri
        /^https:\/\/.*-salihapekers-projects\.vercel\.app$/, // Tüm salihapekers-projects domainleri
      ];

      // Origin yoksa (örneğin Postman gibi araçlar) veya izin verilen listede ise kabul et
      if (!origin) return callback(null, true);

      // String tabanlı eşleşme kontrolü
      if (allowedOrigins.some((o) => typeof o === "string" && o === origin)) {
        return callback(null, true);
      }

      // Regex tabanlı eşleşme kontrolü
      if (allowedOrigins.some((o) => o instanceof RegExp && o.test(origin))) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked origin:", origin);
      return callback(new Error("CORS politikası tarafından engellendi"));
    },
    credentials: true, // Çerezler ve kimlik bilgileri için
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // İzin verilen HTTP metodları
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"], // İzin verilen başlıklar
  })
);

// Preflight OPTIONS requests için özel handler
app.options("*", cors());

// Middleware'ler
app.use(express.json({ limit: "10mb" })); // JSON body parser, 10MB limite kadar
app.use(cookieParser()); // Çerezleri parse eder

// MongoDB bağlantısı
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Loglama middleware
app.use((req, res, next) => {
  console.log(
    `🌐 ${req.method} ${req.url} from ${req.get("origin") || "unknown origin"}`
  );
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Kullanıcı Modeli
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  partner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  profilePicture: { type: String },
  library: {
    favorites: [{ type: Object }],
    watchlist: [{ type: Object }],
    disliked: [{ type: Object }],
    watched: [{ type: Object }],
    liked: [{ type: Object }],
    watchedTogether: [{ type: Object }],
  },
  notifications: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      type: {
        type: String,
        enum: ["partner_request", "library_update", "system"],
        default: "partner_request",
      },
      message: { type: String },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "read"],
        default: "pending",
      },
      createdAt: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
    },
  ],
});

// Yorum Modeli
const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  movieId: { type: String, required: true },
  type: { type: String, enum: ["movie", "tv"], default: "movie" },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Ortak Kütüphane Modeli
const sharedLibrarySchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  favorites: [{ type: Object }],
  watchlist: [{ type: Object }],
  watched: [{ type: Object }],
  compatibility: [
    {
      movie: { type: Object },
      score: { type: Number, min: 0, max: 100 },
    },
  ],
});

// Arşiv Modeli
const archiveSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  sharedLibrary: { type: Object },
  archivedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Review = mongoose.model("Review", reviewSchema);
const SharedLibrary = mongoose.model("SharedLibrary", sharedLibrarySchema);
const Archive = mongoose.model("Archive", archiveSchema);

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Token gerekli" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ message: "Geçersiz token" });
  }
};

// Socket.io setup - Server'ı app.listen'dan sonra tanımlayın
const server = app.listen(PORT, () => {
  console.log(`🚀 SRMDB Server running on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://srmdb-6u2dqz42k-salihapekers-projects.vercel.app",
      /^https:\/\/srmdb-.*\.vercel\.app$/,
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined socket`);
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "SRMDB API çalışıyor!" });
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statuses = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    res.json({
      status: "OK",
      database: statuses[dbStatus],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REGISTER - Hata yakalama iyileştirildi
app.post("/api/auth/register", async (req, res) => {
  const { username, name, email, password, profilePicture } = req.body;
  console.log("📝 Register attempt:", { username, email });

  try {
    // Input validation
    if (!username || !name || !email || !password) {
      return res.status(400).json({ message: "Tüm alanlar gerekli" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Geçersiz email formatı" });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.username === username
            ? "Kullanıcı adı zaten alınmış"
            : "Bu e-posta zaten kayıtlı",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      name,
      email,
      password: hashedPassword,
      profilePicture: profilePicture || "",
      library: {
        favorites: [],
        watchlist: [],
        disliked: [],
        watched: [],
        liked: [],
        watchedTogether: [],
      },
      notifications: [],
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Production'da secure
      sameSite: "lax", // strict yerine lax
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("✅ User registered successfully:", username);
    res.status(201).json({
      message: "Kayıt başarılı",
      user: {
        id: user._id,
        username,
        name,
        email,
        profilePicture: profilePicture || "",
        partner: null,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);

    // MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Bu ${field === "email" ? "email" : "kullanıcı adı"} zaten kayıtlı`,
      });
    }

    res.status(500).json({
      message: "Sunucu hatası",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("🔑 Login attempt:", { email });

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "E-posta ve şifre gerekli" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Bu e-posta ile kullanıcı bulunamadı" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Geçersiz şifre" });
    }

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("✅ Login successful:", username);
    res.json({
      message: "Giriş başarılı",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        partner: user.partner,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      message: "Sunucu hatası",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// REFRESH TOKEN - Route düzeltildi
app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.cookies.token; // token'ı da kontrol et
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token gerekli" });
  }

  try {
    const decoded = jwt.verify(refreshToken, SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const newToken = jwt.sign({ id: user._id }, SECRET_KEY, {
      expiresIn: "7d", // 15m yerine 7d
    });
    res.cookie("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    });

    res.json({ message: "Token yenilendi" });
  } catch (error) {
    console.error("❌ Refresh token error:", error);
    res
      .status(401)
      .json({ message: "Geçersiz veya süresi dolmuş refresh token" });
  }
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Çıkış yapıldı" });
});

// Kullanıcı bilgisi
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("username name email partner profilePicture")
      .populate("partner", "username name profilePicture");

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        partner: user.partner
          ? {
              id: user.partner._id,
              username: user.partner.username,
              name: user.partner.name,
              profilePicture: user.partner.profilePicture,
            }
          : null,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("User info fetch error:", error);
    res.status(500).json({ message: "Kullanıcı bilgileri alınamadı" });
  }
});

// LIBRARY
app.get("/api/library", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("library");
    res.json({
      favorites: user.library.favorites || [],
      watchlist: user.library.watchlist || [],
      disliked: user.library.disliked || [],
      watched: user.library.watched || [],
      liked: user.library.liked || [],
      watchedTogether: user.library.watchedTogether || [],
    });
  } catch (error) {
    console.error("❌ Library fetch error:", error);
    res.status(500).json({ message: "Kütüphane alınamadı" });
  }
});

// LIBRARY ADD
app.post("/api/library/:category", authMiddleware, async (req, res) => {
  const { category } = req.params;
  let movieData = req.body.movieData || req.body.item;

  if (
    ![
      "favorites",
      "watchlist",
      "disliked",
      "watched",
      "liked",
      "watchedTogether",
    ].includes(category)
  ) {
    console.error(`❌ Invalid category: ${category}`);
    return res.status(400).json({ message: "Geçersiz kategori" });
  }

  if (!movieData || !movieData.id) {
    console.error("❌ Invalid item:", movieData);
    return res.status(400).json({ message: "Geçersiz içerik" });
  }

  movieData = {
    id: movieData.id.toString(),
    title: movieData.title || movieData.name,
    poster_path: movieData.poster_path,
    release_date: movieData.release_date || movieData.first_air_date,
    vote_average: movieData.vote_average,
    type: movieData.type || "movie",
    watchedTogether: category === "watchedTogether",
  };

  try {
    const user = await User.findById(req.user._id);

    if (
      category === "favorites" &&
      user.library.disliked.some((i) => i.id === movieData.id)
    ) {
      return res.status(400).json({
        message: "Bu içerik beğenilmeyenlerde, favorilere eklenemez.",
      });
    }
    if (
      category === "disliked" &&
      user.library.favorites.some((i) => i.id === movieData.id)
    ) {
      return res.status(400).json({
        message: "Bu içerik favorilerde, beğenilmeyenlere eklenemez.",
      });
    }
    if (
      (category === "favorites" || category === "disliked") &&
      !user.library.watched.some((i) => i.id === movieData.id)
    ) {
      return res.status(400).json({
        message: "Sadece izlenen içerikler favori veya beğenilmeyen olabilir.",
      });
    }
    if (
      category === "watchlist" &&
      user.library.watched.some((i) => i.id === movieData.id)
    ) {
      return res
        .status(400)
        .json({ message: "Bu içerik izlenmiş, izleneceklere eklenemez." });
    }
    if (category === "watchedTogether" && !user.partner) {
      return res
        .status(400)
        .json({ message: "Partner olmadan birlikte izlenenlere eklenemez." });
    }

    if (user.library[category].some((i) => i.id === movieData.id)) {
      return res.status(409).json({ message: "Bu içerik zaten listede" });
    }

    user.library[category].push(movieData);
    if (category === "watchedTogether" && user.partner) {
      const sharedLibrary = await SharedLibrary.findOne({
        users: { $all: [user._id, user.partner] },
      });
      if (sharedLibrary) {
        sharedLibrary.watched.push(movieData);
        await sharedLibrary.save();
        io.to(user.partner.toString()).emit("libraryUpdate");
      }
    }

    user.notifications.push({
      type: "library_update",
      message: `"${movieData.title}" ${category} listesine eklendi`,
      read: true,
      createdAt: new Date(),
    });

    await user.save();
    io.to(user._id.toString()).emit("libraryUpdate");
    io.to(user._id.toString()).emit("notificationUpdate");
    console.log(`✅ ${category}'e eklendi:`, movieData.title || movieData.name);
    res.json({ message: "Başarıyla eklendi", library: user.library });
  } catch (error) {
    console.error(`❌ Add ${category} error:`, error);
    res.status(500).json({ message: "Ekleme işlemi başarısız" });
  }
});

// 🗑️ LIBRARY DELETE
app.delete("/api/library/:category/:id", authMiddleware, async (req, res) => {
  const { category, id } = req.params;

  if (
    ![
      "favorites",
      "watchlist",
      "disliked",
      "watched",
      "liked",
      "watchedTogether",
    ].includes(category)
  ) {
    console.error(`❌ Invalid category: ${category}`);
    return res.status(400).json({ message: "Geçersiz kategori" });
  }

  if (!id || id.includes("/")) {
    console.error(`❌ Invalid id: ${id}`);
    return res.status(400).json({ message: "Geçersiz içerik ID" });
  }

  try {
    const user = await User.findById(req.user._id);
    const beforeCount = user.library[category].length;

    if (category === "watched" || category === "watchedTogether") {
      user.library.watched = user.library.watched.filter(
        (item) => item.id.toString() !== id
      );
      user.library.watchedTogether = user.library.watchedTogether.filter(
        (item) => item.id.toString() !== id
      );
      user.library.favorites = user.library.favorites.filter(
        (item) => item.id.toString() !== id
      );
      user.library.disliked = user.library.disliked.filter(
        (item) => item.id.toString() !== id
      );
      user.library.liked = user.library.liked.filter(
        (item) => item.id.toString() !== id
      );
      if (user.partner) {
        const sharedLibrary = await SharedLibrary.findOne({
          users: { $all: [user._id, user.partner] },
        });
        if (sharedLibrary) {
          sharedLibrary.watched = sharedLibrary.watched.filter(
            (item) => item.id.toString() !== id
          );
          sharedLibrary.favorites = sharedLibrary.favorites.filter(
            (item) => item.id.toString() !== id
          );
          await sharedLibrary.save();
          io.to(user.partner).emit("libraryUpdate");
        }
      }
      user.notifications.push({
        type: "library_update",
        message: `İçerik ID ${id} izlenenlerden kaldırıldı`,
        read: true,
        createdAt: new Date(),
      });
    } else {
      user.library[category] = user.library[category].filter(
        (item) => item.id.toString() !== id
      );
      user.notifications.push({
        type: "library_update",
        message: `İçerik ID ${id} ${category} listesinden kaldırıldı`,
        read: true,
        createdAt: new Date(),
      });
    }

    await user.save();
    io.to(user._id).emit("libraryUpdate");
    io.to(user._id).emit("notificationUpdate");

    const afterCount = user.library[category].length;
    if (beforeCount === afterCount) {
      return res.status(404).json({ message: "Silinecek içerik bulunamadı" });
    }

    console.log(`✅ ${category}'den silindi: ID ${id}`);
    res.json({ message: "Başarıyla silindi", library: user.library });
  } catch (error) {
    console.error(`❌ Delete ${category} error:`, error);
    res.status(500).json({ message: "Silme işlemi başarısız" });
  }
});

// İzlenme kaldırma
// İzlenme durumu güncelleme endpoint'ini değiştirin
app.post("/api/watched/:type/:id", authMiddleware, async (req, res) => {
  const { type, id } = req.params;
  let movieData = req.body.movieData || req.body.item;
  const { watchedType } = req.body;

  if (!["movie", "tv"].includes(type)) {
    return res.status(400).json({ message: "Geçersiz içerik tipi" });
  }

  if (!movieData || !movieData.id) {
    return res.status(400).json({ message: "Geçersiz içerik" });
  }

  movieData = {
    id: movieData.id.toString(),
    title: movieData.title || movieData.name,
    poster_path: movieData.poster_path,
    release_date: movieData.release_date || movieData.first_air_date,
    vote_average: movieData.vote_average,
    type: movieData.type || "movie",
  };

  try {
    const user = await User.findById(req.user._id);
    const existingIndex = user.library.watched.findIndex(
      (i) => i.id === movieData.id
    );
    const isAlreadyWatched = existingIndex !== -1;

    if (watchedType === "remove") {
      if (!isAlreadyWatched) {
        return res
          .status(400)
          .json({ message: "Bu içerik izlenmemiş durumda" });
      }

      // İzlenenlerden kaldırırken tüm ilgili kategorilerden de kaldır
      user.library.watched = user.library.watched.filter(
        (i) => i.id !== movieData.id
      );
      user.library.watchedTogether = user.library.watchedTogether.filter(
        (i) => i.id !== movieData.id
      );
      user.library.favorites = user.library.favorites.filter(
        (i) => i.id !== movieData.id
      );
      user.library.disliked = user.library.disliked.filter(
        (i) => i.id !== movieData.id
      );
      user.library.liked = user.library.liked.filter(
        (i) => i.id !== movieData.id
      );

      // Partner varsa ortak kütüphaneden de kaldır
      if (user.partner) {
        const sharedLibrary = await SharedLibrary.findOne({
          users: { $all: [user._id, user.partner] },
        });
        if (sharedLibrary) {
          sharedLibrary.watched = sharedLibrary.watched.filter(
            (i) => i.id !== movieData.id
          );
          sharedLibrary.favorites = sharedLibrary.favorites.filter(
            (i) => i.id !== movieData.id
          );
          await sharedLibrary.save();
          io.to(user.partner).emit("libraryUpdate");
        }

        // Partnerden de kaldır eğer birlikte izlendiyse
        const partner = await User.findById(user.partner);
        if (partner) {
          const partnerWatchedItem = partner.library.watched.find(
            (i) => i.id === movieData.id
          );
          if (partnerWatchedItem && partnerWatchedItem.watchedTogether) {
            partner.library.watched = partner.library.watched.filter(
              (i) => i.id !== movieData.id
            );
            partner.library.watchedTogether =
              partner.library.watchedTogether.filter(
                (i) => i.id !== movieData.id
              );
            await partner.save();
            io.to(user.partner).emit("libraryUpdate");
          }
        }
      }

      // İzlenme durumunu kaldır
      await Review.deleteOne({ userId: user._id, movieId: movieData.id, type });

      user.notifications.push({
        type: "library_update",
        message: `"${movieData.title}" tüm listelerden kaldırıldı`,
        read: true,
        createdAt: new Date(),
      });

      await user.save();
      io.to(user._id).emit("libraryUpdate");
      io.to(user._id).emit("notificationUpdate");

      res.json({
        message: "İzlenme kaldırıldı",
        library: user.library,
        watchedStatus: { user: false, partner: false, together: false },
      });
    } else {
      // İzlendi olarak işaretle
      if (isAlreadyWatched) {
        return res.status(409).json({ message: "Bu içerik zaten izlenmiş" });
      }

      user.library.watchlist = user.library.watchlist.filter(
        (i) => i.id !== movieData.id
      );
      movieData.watchedDate = new Date();
      movieData.watchedTogether = watchedType === "together";
      user.library.watched.push(movieData);

      if (watchedType === "together") {
        user.library.watchedTogether.push(movieData);
      }

      let watchedStatus = {
        user: true,
        partner: false,
        together: watchedType === "together",
      };

      if (watchedType === "together" && user.partner) {
        const partner = await User.findById(user.partner);
        if (partner) {
          partner.library.watched.push({ ...movieData, watchedTogether: true });
          partner.library.watchedTogether.push({ ...movieData });
          await partner.save();
          watchedStatus.partner = true;
          io.to(user.partner).emit("libraryUpdate");
        }

        const sharedLibrary = await SharedLibrary.findOne({
          users: { $all: [user._id, user.partner] },
        });
        if (sharedLibrary) {
          sharedLibrary.watched.push({ ...movieData });
          await sharedLibrary.save();
          io.to(user.partner).emit("libraryUpdate");
        }
      }

      user.notifications.push({
        type: "library_update",
        message: `"${movieData.title}" izlendi olarak işaretlendi`,
        read: true,
        createdAt: new Date(),
      });

      await user.save();
      io.to(user._id).emit("libraryUpdate");
      io.to(user._id).emit("notificationUpdate");

      res.json({
        message: "İzlenme işaretlendi",
        library: user.library,
        watchedStatus,
      });
    }
  } catch (error) {
    console.error("Watched error:", error);
    res.status(500).json({ message: "İzlenme işlemi başarısız" });
  }
});

// 📊 REVIEWS
app.post("/api/reviews/:type/:id", authMiddleware, async (req, res) => {
  const { type, id } = req.params;
  let { rating, comment, movieData } = req.body;

  if (!["movie", "tv"].includes(type)) {
    return res.status(400).json({ message: "Geçersiz içerik tipi" });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Geçerli bir puan (1-5) gerekli" });
  }

  if (!movieData || !movieData.id) {
    console.error("❌ Invalid movieData:", movieData);
    return res.status(400).json({ message: "Geçersiz içerik verisi" });
  }

  movieData = {
    id: movieData.id.toString(),
    title: movieData.title || movieData.name,
    poster_path: movieData.poster_path,
    release_date: movieData.release_date || movieData.first_air_date,
    vote_average: movieData.vote_average,
    type: movieData.type || "movie",
  };

  try {
    const user = await User.findById(req.user._id);
    if (!user.library.watched.some((i) => i.id === id)) {
      return res.status(400).json({
        message: "Bu içerik izlenmeden puanlanamaz veya yorum yapılamaz",
      });
    }

    const review = await Review.findOneAndUpdate(
      { userId: user._id, movieId: id, type },
      { rating, comment, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    const itemIndex = user.library.watched.findIndex((i) => i.id === id);
    if (itemIndex !== -1) {
      user.library.watched[itemIndex].userRating = rating;
      user.library.watched[itemIndex].userComment = comment;
      if (user.library.favorites.some((i) => i.id === id)) {
        user.library.favorites[
          user.library.favorites.findIndex((i) => i.id === id)
        ].userRating = rating;
        user.library.favorites[
          user.library.favorites.findIndex((i) => i.id === id)
        ].userComment = comment;
      }
      if (user.library.disliked.some((i) => i.id === id)) {
        user.library.disliked[
          user.library.disliked.findIndex((i) => i.id === id)
        ].userRating = rating;
        user.library.disliked[
          user.library.disliked.findIndex((i) => i.id === id)
        ].userComment = comment;
      }
      if (user.library.liked.some((i) => i.id === id)) {
        user.library.liked[
          user.library.liked.findIndex((i) => i.id === id)
        ].userRating = rating;
        user.library.liked[
          user.library.liked.findIndex((i) => i.id === id)
        ].userComment = comment;
      }
    }

    let partnerReview = null;
    if (user.partner) {
      const partner = await User.findById(user.partner);
      if (partner) {
        partnerReview = await Review.findOne({
          userId: partner._id,
          movieId: id,
          type,
        });
      }
    }

    user.notifications.push({
      type: "library_update",
      message: `"${movieData.title}" için değerlendirme eklendi`,
      read: true,
      createdAt: new Date(),
    });

    await user.save();
    io.to(user._id).emit("notificationUpdate");
    console.log(`✅ Değerlendirme eklendi: ${id} (${type})`);
    res.json({
      message: "Değerlendirme kaydedildi",
      userReview: review,
      partnerReview,
    });
  } catch (error) {
    console.error("❌ Review error:", error);
    res.status(500).json({ message: "Değerlendirme kaydedilemedi" });
  }
});

// 📊 GET REVIEWS
app.get("/api/reviews/:type/:id", authMiddleware, async (req, res) => {
  const { type, id } = req.params;

  if (!["movie", "tv"].includes(type)) {
    return res.status(400).json({ message: "Geçersiz içerik tipi" });
  }

  try {
    const user = await User.findById(req.user._id);
    const userReview = await Review.findOne({
      userId: user._id,
      movieId: id,
      type,
    });
    let partnerReview = null;
    let watchedStatus = {
      user: user.library.watched.some((i) => i.id === id),
      partner: false,
      together: user.library.watchedTogether.some((i) => i.id === id),
    };

    if (user.partner) {
      const partner = await User.findById(user.partner);
      if (partner) {
        partnerReview = await Review.findOne({
          userId: partner._id,
          movieId: id,
          type,
        });
        watchedStatus.partner = partner.library.watched.some(
          (i) => i.id === id
        );
      }
    }

    res.json({
      userReview: userReview
        ? {
            rating: userReview.rating,
            comment: userReview.comment,
            watched: watchedStatus.user,
          }
        : { rating: 0, comment: "", watched: watchedStatus.user },
      partnerReview,
      watchedStatus,
    });
  } catch (error) {
    console.error("❌ Get reviews error:", error);
    res.status(500).json({ message: "Değerlendirmeler alınamadı" });
  }
});

// 👥 PARTNER LIBRARY
app.get("/api/library/partner", authMiddleware, async (req, res) => {
  if (!req.user.partner) {
    return res.status(400).json({ message: "Partner tanımlı değil" });
  }

  try {
    const partner = await User.findById(req.user.partner).select("library");
    if (!partner) {
      return res.status(404).json({ message: "Partner bulunamadı" });
    }

    const partnerReviews = await Review.find({ userId: partner._id });
    const enrichedLibrary = {
      favorites: partner.library.favorites.map((item) => ({
        ...item,
        userRating: partnerReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: partnerReviews.find((r) => r.movieId === item.id)?.comment,
      })),
      watchlist: partner.library.watchlist,
      disliked: partner.library.disliked.map((item) => ({
        ...item,
        userRating: partnerReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: partnerReviews.find((r) => r.movieId === item.id)?.comment,
      })),
      watched: partner.library.watched.map((item) => ({
        ...item,
        userRating: partnerReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: partnerReviews.find((r) => r.movieId === item.id)?.comment,
      })),
      liked: partner.library.liked.map((item) => ({
        ...item,
        userRating: partnerReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: partnerReviews.find((r) => r.movieId === item.id)?.comment,
      })),
      watchedTogether: partner.library.watchedTogether.map((item) => ({
        ...item,
        userRating: partnerReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: partnerReviews.find((r) => r.movieId === item.id)?.comment,
      })),
    };

    res.json(enrichedLibrary);
  } catch (error) {
    console.error("❌ Partner library fetch error:", error);
    res.status(500).json({ message: "Partner kütüphanesi alınamadı" });
  }
});

// 💕 SHARED LIBRARY
app.get("/api/library/shared", authMiddleware, async (req, res) => {
  if (!req.user.partner) {
    return res.status(400).json({ message: "Partner tanımlı değil" });
  }

  try {
    const partner = await User.findById(req.user.partner);
    if (!partner) {
      return res.status(404).json({ message: "Partner bulunamadı" });
    }

    let sharedLibrary = await SharedLibrary.findOne({
      users: { $all: [req.user._id, partner._id] },
    });
    if (!sharedLibrary) {
      sharedLibrary = new SharedLibrary({
        users: [req.user._id, partner._id],
        favorites: [],
        watchlist: [],
        watched: [],
        compatibility: [],
      });
      await sharedLibrary.save();
    }

    const userReviews = await Review.find({ userId: req.user._id });
    const partnerReviews = await Review.find({ userId: partner._id });

    const enrichedLibrary = {
      favorites: sharedLibrary.favorites.map((item) => ({
        ...item,
        userRating: userReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: userReviews.find((r) => r.movieId === item.id)?.comment,
        partnerRating: partnerReviews.find((r) => r.movieId === item.id)
          ?.rating,
        partnerComment: partnerReviews.find((r) => r.movieId === item.id)
          ?.comment,
      })),
      watchlist: sharedLibrary.watchlist,
      watched: sharedLibrary.watched.map((item) => ({
        ...item,
        userRating: userReviews.find((r) => r.movieId === item.id)?.rating,
        userComment: userReviews.find((r) => r.movieId === item.id)?.comment,
        partnerRating: partnerReviews.find((r) => r.movieId === item.id)
          ?.rating,
        partnerComment: partnerReviews.find((r) => r.movieId === item.id)
          ?.comment,
      })),
      compatibility: sharedLibrary.compatibility,
    };

    io.to(req.user._id).emit("sharedLibraryUpdate");
    if (partner) {
      io.to(partner._id).emit("sharedLibraryUpdate");
    }
    res.json(enrichedLibrary);
  } catch (error) {
    console.error("❌ Shared library fetch error:", error);
    res.status(500).json({ message: "Ortak kütüphane alınamadı" });
  }
});

// 📬 GET NOTIFICATIONS
app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "notifications.from",
      "username name profilePicture"
    );
    res.json(user.notifications); // Tüm bildirimleri döndür
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    res.status(500).json({ message: "Bildirimler alınamadı" });
  }
});

// 📬 SYSTEM NOTIFICATIONS
app.get("/api/notifications/system", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const systemNotifications = user.notifications.filter(
      (n) => n.type === "system" || n.type === "library_update"
    );
    res.json(systemNotifications);
  } catch (error) {
    console.error("❌ System notifications error:", error);
    res.status(500).json({ message: "Sistem bildirimleri alınamadı" });
  }
});

// 👥 PARTNER REQUEST
// 👥 PARTNER REQUEST
app.post("/api/partner/request", authMiddleware, async (req, res) => {
  const { username } = req.body;
  const sender = req.user;

  if (!username) {
    return res.status(400).json({ message: "Kullanıcı adı gerekli" });
  }
  if (!sender?._id) {
    return res.status(401).json({ message: "Kullanıcı doğrulanamadı" });
  }

  try {
    const recipient = await User.findOne({ username });
    if (!recipient) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    if (!recipient._id || !sender._id) {
      return res.status(500).json({ message: "Kullanıcı kimlikleri eksik" });
    }
    if (recipient._id.toString() === sender._id.toString()) {
      return res
        .status(400)
        .json({ message: "Kendinize davet gönderemezsiniz" });
    }
    if (recipient.partner) {
      return res
        .status(400)
        .json({ message: "Bu kullanıcı zaten bir partnere sahip" });
    }
    if (sender.partner) {
      return res.status(400).json({ message: "Zaten bir partneriniz var" });
    }

    const existingRequest = recipient.notifications.find(
      (n) =>
        n.from && // from alanının varlığını kontrol et
        n.from._id && // from._id'nin varlığını kontrol et
        n.from._id.toString() === sender._id.toString() &&
        n.type === "partner_request" &&
        n.status === "pending"
    );
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Bu kullanıcıya zaten bir davet gönderilmiş" });
    }

    const notification = {
      _id: new mongoose.Types.ObjectId(),
      type: "partner_request",
      from: {
        _id: sender._id,
        username: sender.username,
        name: sender.name,
        profilePicture: sender.profilePicture || "",
      },
      status: "pending",
      createdAt: new Date(),
      read: false,
    };

    recipient.notifications.push(notification);
    await recipient.save();

    io.to(recipient._id.toString()).emit("notificationUpdate", {
      message: `${sender.username} size partner daveti gönderdi`,
      notification,
    });

    res
      .status(200)
      .json({ message: `${recipient.username}'e davet gönderildi` });
  } catch (error) {
    console.error("Partner davet hatası:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ✅ PARTNER ACCEPT
app.post("/api/partner/accept", authMiddleware, async (req, res) => {
  const { notificationId } = req.body;
  console.log("✅ Partner accept attempt:", { notificationId });

  try {
    const user = await User.findById(req.user._id);
    const notification = user.notifications.find(
      (n) => n._id.toString() === notificationId && n.status === "pending"
    );
    if (!notification) {
      return res
        .status(400)
        .json({ message: "Geçersiz veya zaten işlenmiş davet" });
    }

    const sender = await User.findById(notification.from);
    if (!sender) {
      return res
        .status(404)
        .json({ message: "Davet gönderen kullanıcı bulunamadı" });
    }
    if (sender.partner || user.partner) {
      return res
        .status(400)
        .json({ message: "Biriniz zaten bir partneri var" });
    }

    user.partner = sender._id;
    sender.partner = user._id;
    notification.status = "accepted";

    // Yeni SharedLibrary oluştur
    let sharedLibrary = await SharedLibrary.findOne({
      users: { $all: [user._id, sender._id] },
    });
    if (!sharedLibrary) {
      sharedLibrary = new SharedLibrary({
        users: [user._id, sender._id],
        favorites: [],
        watchlist: [],
        watched: [],
        compatibility: [],
      });
      await sharedLibrary.save();
    }

    // Arşivden eski verileri geri yükle
    const archive = await Archive.findOne({
      users: { $all: [user._id, sender._id] },
    });
    let isPreviousPartner = false;

    if (archive) {
      // SharedLibrary'yi arşiv verileriyle güncelle
      await SharedLibrary.updateOne(
        { users: { $all: [user._id, sender._id] } },
        { $set: archive.sharedLibrary }
      );

      // Her iki kullanıcının da watchedTogether flaglarını geri yükle
      user.library.watched = user.library.watched.map((item) => {
        const archivedItem = archive.sharedLibrary.watched.find(
          (w) => w.id === item.id
        );
        if (archivedItem) {
          return { ...item, watchedTogether: true };
        }
        return item;
      });

      sender.library.watched = sender.library.watched.map((item) => {
        const archivedItem = archive.sharedLibrary.watched.find(
          (w) => w.id === item.id
        );
        if (archivedItem) {
          return { ...item, watchedTogether: true };
        }
        return item;
      });

      isPreviousPartner = true;
      // Arşivi silme - tekrar kullanılabilir
    }

    const welcomeMessage = isPreviousPartner
      ? `Partner bağlantınız yeniden kuruldu! Geçmiş ortak izleme verileriniz aktif.`
      : `Yeni partnerinizle bağlantı kuruldu!`;

    user.notifications.push({
      type: "system",
      message: welcomeMessage,
      read: true,
      createdAt: new Date(),
    });
    sender.notifications.push({
      type: "system",
      message: welcomeMessage,
      read: true,
      createdAt: new Date(),
    });

    await user.save();
    await sender.save();

    io.to(user._id).emit("partnerUpdate");
    io.to(sender._id).emit("partnerUpdate");
    io.to(user._id).emit("notificationUpdate");
    io.to(sender._id).emit("notificationUpdate");

    console.log(
      `✅ Partner request accepted: ${sender.username} and ${user.username} (Previous: ${isPreviousPartner})`
    );
    res.json({
      message: "Davet kabul edildi",
      previousPartner: isPreviousPartner,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        partner: {
          id: sender._id,
          username: sender.username,
          name: sender.name,
          profilePicture: sender.profilePicture,
        },
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("❌ Partner accept error:", error);
    res.status(500).json({ message: "Davet kabul edilemedi" });
  }
});

// ❌ PARTNER REJECT
app.post("/api/partner/reject", authMiddleware, async (req, res) => {
  const { notificationId } = req.body;
  console.log("❌ Partner reject attempt:", { notificationId });

  try {
    const user = await User.findById(req.user._id);
    const notification = user.notifications.find(
      (n) => n._id.toString() === notificationId && n.status === "pending"
    );
    if (!notification) {
      return res
        .status(400)
        .json({ message: "Geçersiz veya zaten işlenmiş davet" });
    }

    notification.status = "rejected";
    user.notifications.push({
      type: "system",
      message: `Partnerlik daveti reddedildi`,
      read: true,
      createdAt: new Date(),
    });

    await user.save();
    io.to(user._id).emit("notificationUpdate");

    console.log(`✅ Partner request rejected: ${user.username}`);
    res.json({ message: "Davet reddedildi" });
  } catch (error) {
    console.error("❌ Partner reject error:", error);
    res.status(500).json({ message: "Davet reddedilemedi" });
  }
});

// 🗑️ PARTNER REMOVE
// Partner kaldırma endpoint'ini güncelle
app.delete("/api/user/partner", authMiddleware, async (req, res) => {
  const { preserve = "true" } = req.query; // Default olarak preserve=true

  try {
    const user = await User.findById(req.user._id);
    if (!user.partner) {
      return res.status(400).json({ message: "Partner tanımlı değil" });
    }

    const partner = await User.findById(user.partner);
    const partnerId = user.partner;

    // Ortak kütüphaneyi arşivle (preserve=true ise)
    const sharedLibrary = await SharedLibrary.findOne({
      users: { $all: [user._id, partnerId] },
    });
    if (sharedLibrary && preserve === "true") {
      // Mevcut arşivi güncelle veya yeni oluştur
      const existingArchive = await Archive.findOne({
        users: { $all: [user._id, partnerId] },
      });

      if (existingArchive) {
        existingArchive.sharedLibrary = {
          favorites: sharedLibrary.favorites,
          watchlist: sharedLibrary.watchlist,
          watched: sharedLibrary.watched,
          compatibility: sharedLibrary.compatibility,
        };
        existingArchive.archivedAt = new Date();
        await existingArchive.save();
      } else {
        const archive = new Archive({
          users: [user._id, partnerId],
          sharedLibrary: {
            favorites: sharedLibrary.favorites,
            watchlist: sharedLibrary.watchlist,
            watched: sharedLibrary.watched,
            compatibility: sharedLibrary.compatibility,
          },
        });
        await archive.save();
      }
    }

    // SharedLibrary'yi sil
    if (sharedLibrary) {
      await SharedLibrary.deleteOne({ _id: sharedLibrary._id });
    }

    if (preserve === "true") {
      // Verileri koru - sadece watchedTogether flaglarını false yap ama verileri sakla
      user.library.watched = user.library.watched.map((item) => ({
        ...item,
        watchedTogether: false, // Rozet görünmez olsun ama veri kalsın
      }));
      // WatchedTogether listesini temizlemeyin - arşivde saklanacak
    } else {
      // Tamamen sil
      user.library.watchedTogether = [];
      user.library.watched = user.library.watched.filter(
        (item) => !item.watchedTogether
      );
    }

    user.partner = null;
    user.notifications.push({
      type: "system",
      message:
        preserve === "true"
          ? "Partner bağlantınız kaldırıldı. Ortak izleme geçmişiniz korundu."
          : "Partner bağlantınız kaldırıldı.",
      read: true,
      createdAt: new Date(),
    });

    if (partner) {
      if (preserve === "true") {
        partner.library.watched = partner.library.watched.map((item) => ({
          ...item,
          watchedTogether: false,
        }));
      } else {
        partner.library.watchedTogether = [];
        partner.library.watched = partner.library.watched.filter(
          (item) => !item.watchedTogether
        );
      }

      partner.partner = null;
      partner.notifications.push({
        type: "system",
        message:
          preserve === "true"
            ? "Partner bağlantınız kaldırıldı. Ortak izleme geçmişiniz korundu."
            : "Partner bağlantınız kaldırıldı.",
        read: true,
        createdAt: new Date(),
      });
      await partner.save();
      io.to(partnerId).emit("partnerUpdate");
      io.to(partnerId).emit("notificationUpdate");
    }

    await user.save();
    io.to(user._id).emit("partnerUpdate");
    io.to(user._id).emit("notificationUpdate");

    console.log(
      "✅ Partner removed from user (preserve=" + preserve + "):",
      user.email
    );
    res.json({
      success: true,
      message:
        preserve === "true"
          ? "Partner kaldırıldı, geçmiş verileriniz korundu"
          : "Partner kaldırıldı",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        partner: user.partner,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("❌ Partner remove error:", error);
    res.status(500).json({ message: "Partner kaldırma başarısız" });
  }
});

app.get("/api/movies/popular/:type", authMiddleware, async (req, res) => {
  const { type } = req.params;
  const { page = 1 } = req.query;

  if (!["movie", "tv"].includes(type)) {
    return res.status(400).json({ message: "Geçersiz içerik tipi" });
  }

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/${type}/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=${page}`
    );
    res.json({
      results: response.data.results,
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    });
  } catch (error) {
    console.error("❌ Popular content error:", error);
    res.status(500).json({ message: "Popüler içerikler alınamadı" });
  }
});

// Kullanıcı profil görüntüleme endpoint'i
app.get("/api/users/profile/:username", authMiddleware, async (req, res) => {
  const { username } = req.params;

  try {
    const targetUser = await User.findOne({ username }).select(
      "username name profilePicture library createdAt"
    );
    if (!targetUser) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // Kullanıcı istatistikleri
    const stats = {
      favoritesCount: targetUser.library.favorites.length,
      watchedCount: targetUser.library.watched.length,
      watchlistCount: targetUser.library.watchlist.length,
      dislikedCount: targetUser.library.disliked.length,
      averageRating: 0,
      topGenres: [],
      joinDate: targetUser.createdAt,
    };

    // Ortalama puan hesapla
    const reviews = await Review.find({ userId: targetUser._id });
    if (reviews.length > 0) {
      stats.averageRating = (
        reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      ).toFixed(1);
    }

    // Top türleri hesapla (watched listesindeki içeriklerin türleri)
    const genreCounts = {};
    targetUser.library.watched.forEach((item) => {
      if (item.genre_ids) {
        item.genre_ids.forEach((genreId) => {
          genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
        });
      }
    });

    const sortedGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genreId, count]) => ({ genreId: parseInt(genreId), count }));

    stats.topGenres = sortedGenres;

    // Son izlenen 5 film/dizi
    const recentlyWatched = targetUser.library.watched
      .sort((a, b) => new Date(b.watchedDate) - new Date(a.watchedDate))
      .slice(0, 5);

    res.json({
      profile: {
        username: targetUser.username,
        name: targetUser.name,
        profilePicture: targetUser.profilePicture,
        hasPartner: !!targetUser.partner,
        stats,
        recentlyWatched,
      },
    });
  } catch (error) {
    console.error("❌ User profile error:", error);
    res.status(500).json({ message: "Profil bilgileri alınamadı" });
  }
});

// 👥 USER SEARCH
app.get("/api/users/search", authMiddleware, async (req, res) => {
  const { query } = req.query;

  // Arama teriminin geçerliliğini kontrol et
  if (!query || query.trim().length < 1) {
    return res.status(400).json({ message: "Arama terimi gereklidir" });
  }

  try {
    console.log(`Arama terimi: ${query}`); // Hata ayıklaması için log ekle
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } }, // Kullanıcı adında arama
        { name: { $regex: query, $options: "i" } }, // İsimde arama (ekstra)
      ],
      _id: { $ne: req.user._id }, // Kendi profilini hariç tut
    }).select("username name profilePicture library partner"); // Gerekli alanları seç

    if (!users || users.length === 0) {
      console.log("Eşleşen kullanıcı bulunamadı");
      return res.json({ users: [], message: "Eşleşen kullanıcı bulunamadı" });
    }

    const usersWithStats = users.map((user) => ({
      ...user.toObject(), // Mongoose belgesini düz bir JS nesnesine dönüştür
      hasPartner: !!user.partner,
      stats: {
        favoritesCount: user.library.favorites.length,
        watchedCount: user.library.watched.length,
        likedCount: user.library.liked.length,
        watchedTogetherCount: user.library.watchedTogether.length,
      },
      canInvite: !user.partner, // Davet gönderilebilirliğini kontrol et
    }));

    console.log(`Bulunan kullanıcı sayısı: ${usersWithStats.length}`);
    res.json(usersWithStats);
  } catch (error) {
    console.error("❌ Kullanıcı arama hatası:", error);
    res
      .status(500)
      .json({ message: "Kullanıcılar alınamadı", error: error.message });
  }
});

// 📽️ POPULAR MOVIES
app.get("/api/movies/popular", authMiddleware, async (req, res) => {
  const { page = 1 } = req.query;

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=${page}`
    );
    res.json({
      results: response.data.results,
      page: response.data.page,
      total_pages: response.data.total_pages,
    });
  } catch (error) {
    console.error("❌ Popular movies error:", error);
    res.status(500).json({ message: "Popüler içerikler alınamadı" });
  }
});

// 🤖 AI RECOMMENDATIONS
app.post("/api/ai/recommendations", authMiddleware, async (req, res) => {
  const { type, limit = 40 } = req.body; // Varsayılan olarak 40 öneri, frontend'den gelen limit parametresini al

  // Geçerli öneri tiplerini kontrol et
  if (!["personal", "partner", "shared"].includes(type)) {
    return res.status(400).json({ message: "Geçersiz öneri tipi" });
  }

  try {
    let recommendations = [];

    // Kişisel öneriler
    if (type === "personal") {
      const user = await User.findById(req.user._id);
      recommendations = await generateRecommendations(
        user.library.favorites,
        user.library.watched,
        limit
      );
    }
    // Partner önerileri
    else if (type === "partner" && req.user.partner) {
      const partner = await User.findById(req.user.partner);
      if (!partner) {
        return res.status(404).json({ message: "Partner bulunamadı" });
      }
      recommendations = await generateRecommendations(
        partner.library.favorites,
        partner.library.watched,
        limit
      );
    }
    // Ortak öneriler
    else if (type === "shared" && req.user.partner) {
      const partner = await User.findById(req.user.partner);
      if (!partner) {
        return res.status(404).json({ message: "Partner bulunamadı" });
      }
      const sharedLibrary = await SharedLibrary.findOne({
        users: { $all: [req.user._id, partner._id] },
      });
      recommendations = await generateRecommendations(
        sharedLibrary?.favorites || [],
        sharedLibrary?.watched || [],
        limit
      );

      const userReviews = await Review.find({ userId: req.user._id });
      const partnerReviews = await Review.find({ userId: partner._id });
      const compatibility = recommendations.map((rec) => {
        const userRating =
          userReviews.find((r) => r.movieId === rec.movie.id)?.rating || 0;
        const partnerRating =
          partnerReviews.find((r) => r.movieId === rec.movie.id)?.rating || 0;
        const score =
          userRating && partnerRating
            ? 100 - Math.abs(userRating - partnerRating) * 20
            : 50;
        return { movie: rec.movie, score };
      });
      await SharedLibrary.updateOne(
        { users: { $all: [req.user._id, partner._id] } },
        { $set: { compatibility } },
        { upsert: true }
      );
    }

    res.json({ recommendations });
  } catch (error) {
    console.error("❌ AI önerileri alınırken hata:", error.message);
    res.status(500).json({ message: "Öneriler alınamadı: " + error.message });
  }
});

async function generateRecommendations(favorites, watched, limit = 40) {
  // TMDB API anahtarı kontrolü
  if (!TMDB_API_KEY) {
    console.error("TMDB_API_KEY tanımlı değil");
    return [];
  }

  // Favori veya izlenen film yoksa popüler filmler döndür
  if (!favorites.length && !watched.length) {
    console.log("Yeterli veri yok, popüler filmler döndürülüyor");
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`
      );
      // Popüler filmlerden istenen limit kadar (40) al
      return response.data.results.slice(0, limit).map((movie) => ({
        movie: {
          id: movie.id.toString(),
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          type: "movie",
        },
        reason: "Popüler filmler",
      }));
    } catch (error) {
      console.error("Popüler filmler alınamadı:", error);
      return [];
    }
  }

  const favoriteIds = favorites.map((f) => f.id);
  let recommendations = [];

  // Daha fazla öneri için her favori filmden daha fazla benzer film al
  for (const id of favoriteIds.slice(0, 8)) {
    // İlk 8 favori filme bak
    try {
      console.log(`ID ${id} için benzer filmler alınıyor`);
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${id}/similar?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`
      );

      if (response.data && response.data.results) {
        // Her film için 10 benzer film al (önceki 5 yerine)
        const similarMovies = response.data.results
          .slice(0, 10)
          .map((movie) => ({
            movie: {
              id: movie.id.toString(),
              title: movie.title,
              poster_path: movie.poster_path,
              release_date: movie.release_date,
              vote_average: movie.vote_average,
              type: "movie",
            },
            reason: "Favorilerinize benzer",
          }));
        recommendations.push(...similarMovies);
      }
    } catch (error) {
      console.error(`ID ${id} için benzer filmler alınamadı:`, error.message);
    }
  }

  // Tekrar eden önerileri kaldır
  const uniqueRecommendations = recommendations.reduce((unique, current) => {
    const isDuplicate = unique.some(
      (item) => item.movie.id === current.movie.id
    );
    if (!isDuplicate) {
      unique.push(current);
    }
    return unique;
  }, []);

  console.log(`${uniqueRecommendations.length} adet öneri oluşturuldu`);
  // İstenen limit kadar (40) öneri döndür
  return uniqueRecommendations.slice(0, limit);
}
app.put("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(req.user._id);
    const notification = user.notifications.find(
      (n) => n._id.toString() === id
    );
    if (!notification) {
      return res.status(404).json({ message: "Bildirim bulunamadı" });
    }

    notification.read = true;
    await user.save();
    io.to(user._id).emit("notificationUpdate");
    res.json({ message: "Bildirim okundu olarak işaretlendi" });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Bildirim güncelleme başarısız" });
  }
});

// 🔄 USER UPDATE
app.put("/api/user/update", authMiddleware, async (req, res) => {
  try {
    const { username, name, email, password, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }
      user.username = username;
    }

    if (name) user.name = name;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Bu e-posta zaten kullanılıyor" });
      }
      user.email = email;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }

    user.notifications.push({
      type: "system",
      message: "Profiliniz güncellendi",
      read: true,
      createdAt: new Date(),
    });

    await user.save();
    io.to(user._id).emit("notificationUpdate");

    console.log("✅ User updated:", user.email);
    res.json({
      message: "Kullanıcı başarıyla güncellendi",
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        partner: user.partner,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("❌ User update error:", error);
    res.status(500).json({ message: "Kullanıcı güncelleme başarısız" });
  }
});

// 404 Handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.originalUrl} bulunamadı` });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error("💥 Global error:", error);
  res.status(500).json({
    message: "Beklenmeyen sunucu hatası",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});
