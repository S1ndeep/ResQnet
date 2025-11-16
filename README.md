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
);
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

## Docker (Local development)

This project includes Dockerfiles for the `backend` and `frontend` and a `docker-compose.yml` to run everything locally (including MongoDB).

Warning: The `backend/.env` file currently contains sensitive credentials. Do NOT commit it to public repositories. When using Docker compose for local development, the file is referenced with `env_file` so values are available to the backend container. For production, use a secrets manager or environment variables supplied by your hosting platform.

Quick start (requires Docker + Docker Compose):

```pwsh
# From repository root
docker compose build
docker compose up
```

- The backend will be available at `http://localhost:5000`.
- The frontend will be available at `http://localhost:3000` (served by nginx in the container).

To bring the stack down:

```pwsh
docker compose down -v
```

If you prefer running the frontend using `npm start` (development mode with hot reload) while the backend runs in Docker, remove the `frontend` service from `docker-compose.yml` and run `cd frontend; npm start` locally.

## Jenkins CI/CD Pipeline

This project includes Jenkins integration for continuous integration and continuous deployment (CI/CD). The pipeline is defined in the `Jenkinsfile` and includes stages for building, testing, and deploying your application.

### Quick Start with Jenkins (via Docker Compose)

The `docker-compose.yml` includes a Jenkins service that runs on port `8080`. To add Jenkins to your stack:

```pwsh
# Start the full stack with Jenkins
docker compose up -d

# Access Jenkins at http://localhost:8080/jenkins/
# Note: Jenkins initial setup wizard will ask for the admin password
```

### Get Jenkins Admin Password

When Jenkins starts for the first time, it generates a random admin password. Retrieve it with:

```pwsh
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Set Up Jenkins

1. Navigate to `http://localhost:8080/jenkins/`
2. Enter the admin password from the command above
3. Select "Install suggested plugins"
4. Create your first admin user
5. Skip the instance configuration (use default `http://localhost:8080/jenkins/`)

### Configure Git Repository in Jenkins

1. **Create a new Pipeline job:**
   - Click "New Item"
   - Enter a job name (e.g., `crisis-connect-pipeline`)
   - Select "Pipeline"
   - Click "OK"

2. **Configure the pipeline:**
   - Under "Pipeline", select "Pipeline script from SCM"
   - Choose "Git" as the SCM
   - Enter your repository URL (e.g., `https://github.com/yourusername/crisis-connect.git`)
   - Set "Script Path" to `Jenkinsfile` (default)
   - Click "Save"

3. **Build the pipeline:**
   - Click "Build Now"
   - View logs in the console output

### Jenkinsfile Stages

The `Jenkinsfile` includes the following stages:

- **Checkout**: Clone code from repository
- **Install Dependencies**: Install backend and frontend npm dependencies
- **Lint**: Check code quality for backend and frontend
- **Build Frontend**: Build the React application
- **Test**: Run backend and frontend tests (when configured)
- **Build Docker Images**: Create Docker images for both services
- **Push Docker Images**: Push images to a Docker registry (on `main` branch only)
- **Deploy**: Deploy to production (customize as needed)
- **Cleanup**: Clean up Docker resources

### Configure Docker Registry Credentials

To push images to Docker Hub or a private registry:

1. In Jenkins, go to "Manage Jenkins" > "Manage Credentials"
2. Click "Global" > "Add Credentials"
3. Choose "Username with password"
4. Enter your Docker registry credentials
5. Set the ID to `docker-registry-creds`
6. Click "Create"

### Docker-in-Docker Support

Jenkins is configured to access the Docker daemon on the host machine, allowing it to build and push Docker images. The `docker` command is available inside the Jenkins container.

### Stop Jenkins

```pwsh
# Stop the Jenkins service (keeps data in jenkins-home volume)
docker compose stop jenkins

# Stop and remove all services (removes jenkins-home volume)
docker compose down -v
```

### Troubleshooting

- **Jenkins not starting**: Check logs with `docker compose logs jenkins`
- **Docker build fails in Jenkins**: Verify Docker socket is mounted correctly in `docker-compose.yml`
- **Pipeline fails at "Push Docker Images"**: Ensure Docker registry credentials are configured in Jenkins
- **Permission denied errors**: You may need to add the Jenkins user to the Docker group on the host

### Advanced: Custom Pipeline Configuration

Edit the `Jenkinsfile` to:
- Add more stages (e.g., security scanning, code coverage)
- Configure notifications (email, Slack)
- Add deployment steps (Kubernetes, cloud platforms)
- Customize Docker image names and tags

Refer to the [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/) for more details.
