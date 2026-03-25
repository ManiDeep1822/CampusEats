# CampusEats - Campus Food Delivery Platform

A complete, production-ready MERN stack web application for handling food orders on a campus setting.

## Features
*   **Role-Based Access Control**: Separate flows for Students, Vendors, and Delivery Boys.
*   **Real-time Tracking**: Integrated `socket.io` for live order progress tracing and notifications.
*   **Aesthetic UI**: Swiggy/Zomato-inspired frontend crafted with Tailwind CSS and Framer Motion.
*   **Full-stack Stack**: MongoDB + Express + React + Node.js (MERN) Architecture.
*   **State Management**: Optimized data sharing with Redux Toolkit and modern Context API integrations.
*   **JWT Security**: Custom protected routes for multi-tiered portal access.

## Project Structure
*   `server/`: Contains Node.js backend logic, Mongoose models, and Socket.IO integrations.
*   `client/`: React-based UI application powered by Vite.

## Setup Instructions

### 1. Prerequisites
Ensure you have Node.js and MongoDB installed perfectly. Also confirm you have an instance of MongoDB running (e.g. `mongodb://localhost:27017`).

### 2. Installation
Navigate into both the server and client folders to install all dependencies.
```bash
# In the root `campuseats` directory:
cd server
npm install

cd ../client
npm install
```

### 3. Environment Setup
The project already comes configured with default `.env` files in both `server/` and `client/` pointing to default local hostnames. 
- Ensure `MONGO_URI` in `server/.env` properly resolves your MongoDB setup.

### 4. Database Seeding
To populate initial sample data including demo users, vendors, and items:
```bash
cd server
node seed.js
```

### 5. Running the Application
Spin up the server and client in two separate terminal shells:

**Backend (Server)**:
```bash
cd server
node server.js
```
The server defaults to port `5000`.

**Frontend (Client)**:
```bash
cd client
npm run dev
```
Access the client usually at `http://localhost:5173`.

## Test Credentials
*   **Student**: `rahul@campus.edu` / `123456`
*   **Vendor (Chai Corner)**: `chai@campus.edu` / `123456`
*   **Delivery Boy**: `rider1@campus.edu` / `123456`

## Future Scope (Roadmap)
- Integration of Google Maps API for precise tracking mechanisms.
- PWA Configuration for native-app feels directly on Mobile Devices.
- Transitioning Mock Payment Gateway endpoints to actual aggregators like Razorpay.
- Adding native background Push Notifications using Web-Push.
