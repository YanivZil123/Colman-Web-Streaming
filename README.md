# 🎬 Colman Web Streaming Platform

A Netflix/Disney+ style streaming platform with multi-profile support, watch tracking, and content management.

---

## � Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account (cloud database)

### Installation

```bash
# Clone repository
git clone https://github.com/YanivZil123/Colman-Web-Streaming.git
cd Colman-Web-Streaming

# Install dependencies
npm install

# Create .env file with your MongoDB Atlas connection string
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/colman-web-streaming
SESSION_SECRET=your-secure-secret-key
OMDB_API_KEY=your-omdb-api-key
PORT=3000

# Run the app
npm start
```

Server runs at `http://localhost:3000`. Database auto-seeds on first run with admin user and sample genres

---

## 📁 Project Structure

```
├── public/
│   ├── views/          # HTML pages (home, movies, series, player, admin, etc.)
│   ├── scripts/        # Client-side JS (api.js, home.js, player.js, etc.)
│   ├── styles/         # CSS files (disney-plus.css, etc.)
│   └── uploads/        # User content (videos, posters, thumbnails)
│
├── src/server/
│   ├── controllers/    # Business logic (auth, profiles, titles, watch, likes)
│   ├── models/         # MongoDB schemas (User, Title, WatchHabits, Genre)
│   ├── routes/         # API endpoints
│   ├── middleware/     # Authentication
│   └── config/         # Environment & database seeding
│
└── server.js           # App entry point
```

---

## ✨ Main Features

### Core Functionality
- 🔐 **Authentication**: Secure login/signup with bcrypt, session management, user/admin roles
- 👤 **Multi-Profile**: Up to 5 profiles per account with custom avatars, profile-specific watch data
- 🎥 **Content**: Movies & series with episodes, genres, metadata, video streaming
- 📺 **Video Player**: HTML5 player with progress tracking, resume playback, episode navigation
- 📊 **Watch Tracking**: Continue watching, already watched, watch history analytics
- ❤️ **Likes**: Interactive like system with Disney+ style animations
- 🏠 **Smart Home**: Dynamic sections (continue watching, new content, most liked, by genre)
- 🔍 **Search**: Global search and genre filtering
- 🛠️ **Admin**: Content upload, episode management, file handling
- 🎨 **UI/UX**: Disney+ inspired dark theme with smooth animations

### Technology Stack
**Backend**: Node.js, Express, MongoDB Atlas, Mongoose, bcrypt, express-session, multer  
**Frontend**: Vanilla JavaScript, HTML5, CSS3  
**Dev Tools**: nodemon, ESM modules

---

## 📡 Key API Endpoints

```
Authentication
POST   /api/auth/signup, /api/auth/login, /api/auth/logout

Profiles
GET    /api/profiles
POST   /api/profiles

Content
GET    /api/titles, /api/titles/:id
POST   /api/admin/titles (admin only)

Watch Progress
POST   /api/watch/progress
GET    /api/home/continue-watching
GET    /api/home/already-watched

Likes
POST   /api/likes
DELETE /api/likes/:titleId

Watch Habits
GET    /api/watchhabits/profile/:profileId/habits
GET    /api/watchhabits/user/stats
```

---

## 🔑 Default Admin Login

**Username**: `admin`  
**Password**: `admin1`

---


**Happy Streaming! 🎬🍿**
