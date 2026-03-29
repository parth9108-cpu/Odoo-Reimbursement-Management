#!/bin/bash

echo "Setting up Expenso MVP..."

echo ""
echo "Installing root dependencies..."
npm install

echo ""
echo "Installing server dependencies..."
cd server
npm install

echo ""
echo "Installing client dependencies..."
cd ../client
npm install

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "1. Make sure MongoDB is running"
echo "2. Run: npm run dev"
echo ""
echo "To seed demo data:"
echo "1. cd server"
echo "2. npm run seed"
echo ""

