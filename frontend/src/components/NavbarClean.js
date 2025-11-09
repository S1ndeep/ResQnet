import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function NavbarClean() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="container">
        <Link to="/" className="navbar-brand" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
          🚨 Crisis Connect
        </Link>

        <button
          ref={btnRef}
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((s) => !s)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`} ref={menuRef}>
          <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/about" onClick={() => setMobileOpen(false)}>About</Link>
          <Link to="/news" onClick={() => setMobileOpen(false)}>News</Link>
          <Link to="/alerts" onClick={() => setMobileOpen(false)}>Alerts</Link>
          <Link to="/contact" onClick={() => setMobileOpen(false)}>Contact</Link>

          {mobileOpen && (
            <div className="mobile-auth-block">
              {!loading && user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  {user.role === 'civilian' && (<Link to="/report-incident" onClick={() => setMobileOpen(false)}>Report Incident</Link>)}
                  {user.role === 'volunteer' && (<Link to="/volunteer" onClick={() => setMobileOpen(false)}>Volunteer</Link>)}
                  <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                </>
              ) : !loading ? (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>Register</Link>
                </>
              ) : null}
              <div style={{ padding: 8 }}><ThemeToggle /></div>
            </div>
          )}
        </div>

        <div className="navbar-controls">
          {!loading && user ? (
            <div className="user-dropdown" ref={menuRef}>
              <button className="user-btn" onClick={() => setUserMenuOpen((s) => !s)} aria-expanded={userMenuOpen}>
                {user.name} ▾
              </button>
              {userMenuOpen && (
                <div className="user-menu">
                  <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                  <Link to="/map" onClick={() => setUserMenuOpen(false)}>Map View</Link>
                  {user.role === 'civilian' && (<Link to="/report-incident" onClick={() => setUserMenuOpen(false)}>Report</Link>)}
                  {user.role === 'volunteer' && (<Link to="/volunteer" onClick={() => setUserMenuOpen(false)}>Volunteer Portal</Link>)}
                  {user.role === 'admin' && (<Link to="/admin" onClick={() => setUserMenuOpen(false)}>Admin</Link>)}
                  <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                  <div style={{ padding: 8 }}><ThemeToggle /></div>
                </div>
              )}
            </div>
          ) : !loading ? (
            <div className="auth-controls">
              <Link to="/login" className="btn btn-primary">Login</Link>
              <div className="register-prompt">Don't have an account? <Link to="/register">Register</Link></div>
              <div style={{ marginLeft: 12 }}><ThemeToggle /></div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}><ThemeToggle /></div>
          )}
        </div>
      </div>
    </nav>
  );
}
