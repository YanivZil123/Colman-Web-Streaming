#!/bin/bash

# Colman Web Streaming - Setup Script
# This script sets up the development environment

set -e  # Exit on error

echo "🚀 Setting up Colman Web Streaming project..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please update the .env file with your MongoDB connection string:"
    echo "   - Open .env file"
    echo "   - Replace MONGO_URL with your actual MongoDB connection string"
    echo "   - Format: mongodb+srv://username:password@cluster.mongodb.net/database-name"
    echo "   - Or for local: mongodb://localhost:27017/colman-web-streaming"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check if MongoDB connection string is still a placeholder
if grep -q "username:password@cluster.mongodb.net" .env 2>/dev/null; then
    echo "⚠️  WARNING: .env file still contains placeholder MongoDB URL"
    echo "   Please update MONGO_URL in .env with your actual MongoDB connection string"
    echo ""
fi

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your MongoDB connection string"
echo "2. Run 'npm run dev' to start the development server"
echo ""

