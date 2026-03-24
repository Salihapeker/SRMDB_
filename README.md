📽️ SRMDB

SRMDB (Social & Recommendation Movie Database), kullanıcıların film ve dizileri keşfedebileceği, kütüphaneler oluşturabileceği ve partneriyle paylaşabileceği bir platformdur.

🚀 Özellikler

🔑 Kullanıcı Girişi / Kayıt (JWT ile güvenli oturum)

🎬 Film & Dizi Arama (TMDb API üzerinden)

⭐ Kütüphane Yönetimi

Favoriler

İzlenecekler listesi

Beğenilmeyenler

👯 Ortak Kütüphane (partner davetiyle)

💬 Yorum ve Değerlendirme (puanlama + emoji desteği)

🎯 Kişiselleştirilmiş Öneriler (yapay zeka destekli)

📱 Modern UI (React + TailwindCSS)

🛠️ Teknolojiler

Frontend: React, React Router, TailwindCSS, Framer Motion

Backend: Node.js, Express.js

Database: MongoDB

Authentication: JWT

API: The Movie Database (TMDb)

📦 Kurulum

Projeyi yerel ortamında çalıştırmak için:

# 1. Repoyu klonla

git clone https://github.com/Salihapeker/srmdb.git

# 2. Backend bağımlılıklarını yükle

cd backend
npm install

# 3. Frontend bağımlılıklarını yükle

cd ../frontend
npm install

# 4. Ortam değişkenlerini ayarla

cp .env.example .env # kendi API keylerini gir

# 5. Backend başlat

cd backend
npm start

# 6. Frontend başlat

cd ../frontend
npm start

⚙️ Ortam Değişkenleri

✅ Backend için .env.example
MONGO_URI=mongodb://localhost:27017/srmdb
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=development
TMDB_API_KEY=your_tmdb_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_custom_secret_key

✅ Frontend için .env.example
REACT_APP_TMDB_API_KEY=your_tmdb_api_key_here
REACT_APP_API_URL=http://localhost:5000

📌 Yol Haritası

Kullanıcı girişi ve kayıt sistemi

Film/dizi arama ve kütüphane yönetimi

Görev ve rozet sistemi

🤝 Katkı

Katkı sağlamak istersen:

Bu repoyu forkla

Yeni bir branch oluştur (git checkout -b feature/yenilik)

Değişikliklerini commit et (git commit -m 'feat: yeni özellik eklendi')

Branch’i pushla (git push origin feature/yenilik)

Pull request aç 🎉


<img width="1919" height="1071" alt="Ekran görüntüsü 2026-03-24 130555" src="https://github.com/user-attachments/assets/38f07919-0be1-4f4d-88cb-c44df81427af" />

<img width="1919" height="1077" alt="Ekran görüntüsü 2026-03-24 130857" src="https://github.com/user-attachments/assets/284f1435-ae31-4354-a68d-5106db6271da" />

<img width="1919" height="1079" alt="Ekran görüntüsü 2026-03-24 130920" src="https://github.com/user-attachments/assets/9c3305c0-d7d6-402a-8bd9-8637b8effc7b" />

<img width="1919" height="1079" alt="Ekran görüntüsü 2026-03-24 131004" src="https://github.com/user-attachments/assets/556b9cd7-d7f1-4f60-b812-19dc80502d3e" />



