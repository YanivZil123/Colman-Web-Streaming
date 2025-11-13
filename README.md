# Colman Web Streaming Platform

A modern, Netflix-style web streaming platform built with Node.js, Express, and MongoDB. Features user authentication, profile management, content cataloging, watch progress tracking, and personalized recommendations.

## 🎬 Features

- **User Authentication**: Secure sign-up and sign-in with session management
- **Multi-Profile Support**: Create and manage multiple profiles per user account
- **Content Catalog**: Browse movies and series organized by genres
- **Watch Progress Tracking**: Resume watching from where you left off
- **Personalized Recommendations**: AI-powered content suggestions based on watch history
- **Watch Statistics**: Track viewing habits and daily watch statistics per profile
- **Like System**: Like/unlike movies and series
- **Search Functionality**: Search titles by name
- **Admin Panel**: Manage content (movies and series) through admin interface
- **Responsive Design**: Modern, Disney+-inspired UI that works on all devices

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **bcrypt** - Password hashing
- **express-session** - Session management
- **multer** - File upload handling

### Frontend
- **Vanilla JavaScript** - No frameworks, pure JS
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Fetch API** - AJAX requests

### Development Tools
- **nodemon** - Auto-restart on file changes
- **ESM Modules** - ES6 module system

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB Atlas account** (or local MongoDB instance)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YanivZil123/Colman-Web-Streaming.git
cd Colman-Web-Streaming
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database-name

# Session Secret (generate a random string for production)
SESSION_SECRET=your-secret-key-here

# OMDB API Key (optional, for fetching movie metadata)
OMDB_API_KEY=your-omdb-api-key
```

**Note**: For production, use a strong, randomly generated `SESSION_SECRET`.

### 4. Run Setup Script (Optional)

The project includes a `setup.sh` script that automates dependency installation and environment setup:

```bash
chmod +x setup.sh
./setup.sh
```

## 🎯 Usage

### Development Mode

Start the development server with auto-reload:

```bash
npm run dev
```

The server will start at `http://localhost:3000`. Database auto-seeds on first run with admin user and sample genres.

### Production Mode

```bash
NODE_ENV=production npm run dev
```

## 📁 Project Structure

```
Colman-Web-Streaming/
├── public/                 # Static files
│   ├── views/            # HTML pages (home, movies, series, player, admin, etc.)
│   ├── scripts/         # Client-side JavaScript (api.js, home.js, player.js, etc.)
│   ├── styles/           # CSS stylesheets (disney-plus.css, etc.)
│   ├── images/          # Image assets
│   ├── assets/          # Additional assets
│   └── uploads/         # User-uploaded content (videos, posters, thumbnails)
├── src/
│   └── server/
│       ├── app.js       # Express app configuration
│       ├── config/     # Configuration files (environment & database seeding)
│       ├── controllers/ # Request handlers (auth, profiles, titles, watch, likes)
│       ├── middleware/  # Custom middleware (authentication)
│       ├── models/      # Database models (User, Title, WatchHabits, Genre)
│       └── routes/      # API endpoints
├── server.js            # Application entry point
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## 🔐 Default Credentials

After seeding the database, you can login with:

- **Username**: `admin`
- **Password**: `admin1`

**⚠️ Warning**: Change the default admin password in production!

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

### Profiles
- `GET /api/profiles` - Get user profiles
- `POST /api/profiles` - Create new profile
- `DELETE /api/profiles/:id` - Delete profile

### Content
- `GET /api/titles` - Get titles (with optional filters)
- `GET /api/titles/:id` - Get title details
- `GET /api/home/continue` - Get continue watching content
- `GET /api/home/recommended` - Get personalized recommendations
- `GET /api/home/most-liked-movies` - Get most popular movies
- `GET /api/home/most-liked-series` - Get most popular series
- `GET /api/home/already-watched` - Get already watched content
- `POST /api/admin/titles` - Create new title (admin only)

### Watch Progress
- `GET /api/watch/progress` - Get watch progress
- `POST /api/watch/progress` - Update watch progress
- `POST /api/watch/finish` - Mark content as finished

### Likes
- `POST /api/likes` - Like a title
- `DELETE /api/likes/:titleId` - Unlike a title

### Watch Habits
- `GET /api/watchhabits/profile/:profileId/habits` - Get profile watch habits
- `GET /api/watchhabits/user/stats` - Get user statistics

## 🗄️ Database Schema

### Users
- User accounts with authentication credentials
- Embedded profiles array

### Profiles
- Subdocuments within User model
- Profile name, avatar, and preferences

### Titles (Movies/Series)
- Content metadata (name, description, genres, etc.)
- Poster and thumbnail URLs
- Episode information for series

### Watch Habits
- Per-profile watch progress tracking
- Watch history with session details
- Like/unlike status

## 🎨 Features in Detail

### Profile Management
- Create up to 5 profiles per user
- Custom profile avatars
- Profile-specific watch history and preferences

### Watch Progress
- Automatic progress tracking
- Resume from last watched position
- Daily watch statistics
- Session-based tracking

### Recommendations
- Genre-based recommendations
- Most popular content (by likes)
- Personalized suggestions per profile

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | Secret key for session encryption | Required |
| `MONGO_URL` | MongoDB connection string | Required |
| `OMDB_API_KEY` | OMDB API key for metadata fetching | Optional |

## 📝 Scripts

### Seed Example Data

To populate the database with example data (users, profiles, watch habits):

```bash
node src/server/config/seedExampleData.js
```

This script creates:
- 4 example users with 3 profiles each
- Realistic watch habits and history
- Like/unlike data for recommendations

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify your `MONGO_URL` is correct
- Check MongoDB Atlas IP whitelist settings
- Ensure network connectivity

### Session Issues
- Verify `SESSION_SECRET` is set
- Clear browser cookies if experiencing auth issues

### File Upload Issues
- Ensure `uploads/` directory exists and has write permissions
- Check `multer` configuration in admin routes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of a course assignment and is for educational purposes.

## 👥 Authors

- **yaniv-berniker-213371776**
- **yaniv-zilberson-214269292**

## 🙏 Acknowledgments

- Disney+ for UI/UX inspiration
- MongoDB Atlas for cloud database hosting
- Express.js community for excellent documentation

---

**Note**: This is an educational project. Ensure all sensitive data is properly secured before deploying to production.

**Happy Streaming! 🎬🍿**
