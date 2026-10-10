# 📽️ SRMDB

**🌐 Canlı / Live:** [srmdb.vercel.app](https://srmdb.vercel.app) &nbsp;·&nbsp; 🇹🇷 Türkçe &nbsp;·&nbsp; [🇬🇧 English](#-english)

SRMDB (Social & Recommendation Movie Database), kullanıcıların film ve dizileri keşfedebileceği, kütüphaneler oluşturabileceği ve partneriyle paylaşabileceği bir platformdur.

## 🚀 Özellikler

- 🔑 Kullanıcı Girişi / Kayıt (JWT ile güvenli oturum)
- 🎬 Film & Dizi Arama (TMDb API üzerinden)
- ⭐ Kütüphane Yönetimi
  - Favoriler
  - İzlenecekler listesi
  - Beğenilmeyenler
- 👯 Ortak Kütüphane (partner davetiyle)
- 💬 Yorum ve Değerlendirme (puanlama + emoji desteği)
- 🎯 Kişiselleştirilmiş Öneriler (yapay zeka destekli)
- 📱 Modern UI (React, karanlık/aydınlık tema, WebGL arka plan)

## 🛠️ Teknolojiler

- **Frontend:** React, React Router, Axios, Socket.IO client, OGL (WebGL)
- **Backend:** Node.js, Express.js, Socket.IO, Mongoose
- **Database:** MongoDB
- **Authentication:** JWT
- **API:** The Movie Database (TMDb), Google Gemini, Groq

## 📦 Kurulum

Projeyi yerel ortamında çalıştırmak için:

```bash
# 1. Repoyu klonla
git clone https://github.com/Salihapeker/SRMDB_.git
cd SRMDB_

# 2. Backend bağımlılıklarını yükle
cd srmdb-backend
npm install

# 3. Frontend bağımlılıklarını yükle
cd ..
npm install

# 4. Ortam değişkenlerini ayarla
cp srmdb-backend/.env.example srmdb-backend/.env   # kendi API keylerini gir
cp .env.example .env

# 5. Backend başlat
cd srmdb-backend
npm start

# 6. Frontend başlat (yeni bir terminalde, proje kök dizininde)
npm start
```

## ⚙️ Ortam Değişkenleri

✅ **Backend için `.env.example`** (`srmdb-backend/.env.example`)

```env
MONGO_URI=mongodb://localhost:27017/srmdb
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=development
TMDB_API_KEY=your_tmdb_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

✅ **Frontend için `.env.example`** (proje kök dizini)

```env
REACT_APP_TMDB_API_KEY=your_tmdb_api_key_here
REACT_APP_API_URL=http://localhost:5000
```

## 📌 Yol Haritası

- Kullanıcı girişi ve kayıt sistemi
- Film/dizi arama ve kütüphane yönetimi
- Görev ve rozet sistemi

## 🤝 Katkı

Katkı sağlamak istersen:

1. Bu repoyu forkla
2. Yeni bir branch oluştur (`git checkout -b feature/yenilik`)
3. Değişikliklerini commit et (`git commit -m 'feat: yeni özellik eklendi'`)
4. Branch'i pushla (`git push origin feature/yenilik`)
5. Pull request aç 🎉

## 📸 Ekran Görüntüleri

<img width="1919" height="1071" alt="Ekran görüntüsü 2026-03-24 130555" src="https://github.com/user-attachments/assets/38f07919-0be1-4f4d-88cb-c44df81427af" />

<img width="1919" height="1077" alt="Ekran görüntüsü 2026-03-24 130857" src="https://github.com/user-attachments/assets/284f1435-ae31-4354-a68d-5106db6271da" />

<img width="1919" height="1079" alt="Ekran görüntüsü 2026-03-24 130920" src="https://github.com/user-attachments/assets/9c3305c0-d7d6-402a-8bd9-8637b8effc7b" />

<img width="1919" height="1079" alt="Ekran görüntüsü 2026-03-24 131004" src="https://github.com/user-attachments/assets/556b9cd7-d7f1-4f60-b812-19dc80502d3e" />

---

## 🇬🇧 English

**SRMDB** (Social & Recommendation Movie Database) is a full-stack web app where users discover movies and TV shows, build personal libraries and share a library with a partner. It also gives AI-powered recommendations based on what you have watched.

**🌐 Live demo:** [srmdb.vercel.app](https://srmdb.vercel.app)

> The backend runs on Render's free tier and sleeps when idle, so the first request may take up to a minute while the server wakes up.

### Features

- 🔑 **Authentication:** sign up / log in with JWT stored in an HTTP-only cookie
- 🎬 **Search:** movies, TV shows and people via the TMDb API, with trailers and streaming providers
- ⭐ **Library:** favorites, watchlist, watched, liked and disliked lists
- 👯 **Shared library:** invite a partner and keep a "watched together" list
- 💬 **Reviews:** ratings and comments with emoji support
- 🎯 **AI recommendations:** personalised suggestions from Google Gemini, with Groq (Llama) as a fallback
- 🔔 **Real-time notifications:** partner invites and updates over Socket.IO
- 🌗 **Dark / light theme**

### Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, React Router, Axios, Socket.IO client, OGL (WebGL background) |
| Backend | Node.js, Express, Socket.IO, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT, bcrypt |
| External APIs | TMDb, Google Gemini, Groq |
| Hosting | Vercel (frontend), Render (backend) |

### Getting started

```bash
git clone https://github.com/Salihapeker/SRMDB_.git
cd SRMDB_

# Backend
cd srmdb-backend
npm install
cp .env.example .env        # fill in your own keys
npm start                   # http://localhost:5000

# Frontend (new terminal, project root)
cd ..
npm install
cp .env.example .env
npm start                   # http://localhost:3000
```

### Environment variables

| Variable | Where | Description |
|---|---|---|
| `MONGO_URI` | backend | MongoDB connection string |
| `JWT_SECRET` | backend | Secret used to sign login tokens |
| `PORT` | backend | Server port (default `5000`) |
| `NODE_ENV` | backend | `production` enables secure, cross-site cookies |
| `TMDB_API_KEY` | backend | TMDb API key |
| `GEMINI_API_KEY` | backend | Google Gemini API key (AI recommendations) |
| `GROQ_API_KEY` | backend | Groq API key (fallback model) |
| `REACT_APP_API_URL` | frontend | Backend URL |
| `REACT_APP_TMDB_API_KEY` | frontend | TMDb API key for client-side requests |

### Project structure

```
SRMDB_/
├── public/              # static assets
├── src/                 # React frontend
│   ├── components/      # header, footer, AI chat, route guard…
│   ├── context/         # AI chat context
│   ├── pages/           # dashboard, library, movie detail, recommendations…
│   └── services/api.js  # Axios client (retries while the backend wakes up)
└── srmdb-backend/
    └── server.js        # Express API + Socket.IO + MongoDB models
```

### Roadmap

- [x] Sign up / log in
- [x] Movie & TV search and library management
- [ ] Tasks and badges
