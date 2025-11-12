# Colman-Web-Streaming

A Netflix-style web streaming platform built with Node.js, Express, and MongoDB.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit `.env` and set your configuration:
- `MONGO_URL`: Your MongoDB connection string
- `SESSION_SECRET`: A secure random string for session encryption
- `PORT`: Server port (default: 3000)

### 3. Run the Server
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | Secret key for session encryption | `dev-secret-change-in-production` |
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017/colman-web-streaming` |

## Default Admin User

After seeding, you can login with:
- **Username**: `admin`
- **Password**: `admin1`