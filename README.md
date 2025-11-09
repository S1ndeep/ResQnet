# Disaster Management & Volunteer Coordination System

A comprehensive MERN stack application for coordinating disaster response efforts between civilians, volunteers, and official agencies.

## Features

- **Multi-Level User Roles:**
  - **Civilians:** Submit "Help Needed" requests with location
  - **Registered Volunteers:** View and claim help requests on map
  - **Admin/Agency:** Verify requests, prioritize, broadcast alerts, manage resources

- **Interactive Map Dashboard:** Real-time map showing help requests and resources using Leaflet
- **Real-Time Updates:** Socket.io integration for instant updates
- **Resource Management:** CRUD system for shelters, food distribution, medical stations

## Tech Stack

- **Frontend:** React, React Router, Socket.io-client, Leaflet/React-Leaflet
- **Backend:** Node.js, Express, MongoDB, Socket.io
- **Authentication:** JWT-based authentication with role-based access control

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Step 1: Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `backend` folder:

```env
MONGODB_URI=mongodb://localhost:27017/disaster-management
JWT_SECRET=your-secret-key-here-change-this-in-production
PORT=5000
CLIENT_URL=http://localhost:3000
```

**Important:** Change `JWT_SECRET` to a secure random string in production!

### Step 3: Start MongoDB

Make sure MongoDB is running on your system:
```bash
# On Windows (if installed as service, it should start automatically)
# Or start manually:
mongod

# On Mac/Linux:
sudo systemctl start mongod
# or
mongod
```

### Step 4: Run the Application

From the root directory:

```bash
# Start both server and client concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm start
```

The server will run on `http://localhost:5000` and the client on `http://localhost:3000`.

## Usage

### Creating an Admin Account

You can create an admin account by:
1. Registering normally and then updating the role in MongoDB:
```javascript
// In MongoDB shell or MongoDB Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

2. Or register with role "admin" directly (if you modify the registration to allow it)

### User Roles

1. **Civilians:** 
   - Register/login
   - Submit help requests with location
   - View their own requests

2. **Volunteers:** 
   - Register/login as volunteer
   - View map with all help requests
   - Claim requests to provide assistance
   - Update request status

3. **Admin:** 
   - Login as admin
   - View and manage all requests
   - Verify and prioritize requests
   - Add/edit/delete resources (shelters, food, medical stations)
   - Manage volunteer assignments

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Help Requests
- `GET /api/requests` - Get all requests (filtered by role)
- `GET /api/requests/:id` - Get single request
- `POST /api/requests` - Create request (Civilians)
- `PUT /api/requests/:id` - Update request
- `POST /api/requests/:id/claim` - Claim request (Volunteers)
- `DELETE /api/requests/:id` - Delete request

### Resources
- `GET /api/resources` - Get all resources
- `GET /api/resources/:id` - Get single resource
- `POST /api/resources` - Create resource (Admin)
- `PUT /api/resources/:id` - Update resource (Admin)
- `DELETE /api/resources/:id` - Delete resource (Admin)

### Volunteers
- `GET /api/volunteers` - Get all volunteers (Admin)
- `GET /api/volunteers/:id/claims` - Get volunteer's claimed requests
- `GET /api/volunteers/stats` - Get volunteer statistics

## Real-Time Features

The application uses Socket.io for real-time updates:
- New help requests appear instantly on all connected clients
- Request status changes update in real-time
- Resource additions/updates sync across all users
- Claim actions notify all users

## Map Features

- Uses OpenStreetMap tiles (free, no API key required)
- Color-coded markers based on priority
- Resource markers with different icons
- Click markers to see details and actions

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGODB_URI in `.env` file
- For MongoDB Atlas, use the connection string provided

### Socket.io Connection Issues
- Ensure server is running on port 5000
- Check CORS settings in server.js
- Verify CLIENT_URL in server `.env` matches your frontend URL

### Port Already in Use
- Change PORT in server `.env` file
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill
  ```

## Development

### Project Structure
```
disaster-management-system/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   └── server.js        # Express server
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── App.js       # Main app component
│   └── package.json
└── package.json
```

## License

ISC

## Contributing

Feel free to submit issues and enhancement requests!
