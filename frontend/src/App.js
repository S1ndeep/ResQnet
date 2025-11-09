import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/NavbarClean';
import AlertBanner from './components/AlertBanner';
import Home from './pages/Home';
import About from './pages/About';
import News from './pages/News';
import Alerts from './pages/Alerts';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import AdminDashboard from './pages/AdminDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AlertDetails from './pages/AlertDetails';
import ReportIncident from './components/ReportIncident';
import TaskManagement from './components/TaskManagement';
import VolunteerTaskView from './components/VolunteerTaskView';
import IncidentManagement from './pages/IncidentManagement';
import VolunteerManagement from './components/VolunteerManagement';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <div className="App">
          {/* Skip link for keyboard users */}
          <a href="#main-content" className="skip-link">Skip to content</a>
          <Navbar />
          <AlertBanner />
          <main id="main-content" className="main-content container">
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/news" element={<News />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/map"
              element={
                <PrivateRoute>
                  <MapView />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute requiredRole="admin">
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/volunteer"
              element={
                <PrivateRoute requiredRole={['volunteer', 'admin']}>
                  <VolunteerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/alert/:id"
              element={
                <PrivateRoute requiredRole={['volunteer', 'admin']}>
                  <AlertDetails />
                </PrivateRoute>
              }
            />
            <Route
              path="/report-incident"
              element={
                <PrivateRoute requiredRole="civilian">
                  <ReportIncident />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/incidents"
              element={
                <PrivateRoute requiredRole="admin">
                  <IncidentManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/tasks"
              element={
                <PrivateRoute requiredRole="admin">
                  <TaskManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/volunteers"
              element={
                <PrivateRoute requiredRole="admin">
                  <VolunteerManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/volunteer/tasks"
              element={
                <PrivateRoute requiredRole={['volunteer', 'admin']}>
                  <VolunteerTaskView />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

