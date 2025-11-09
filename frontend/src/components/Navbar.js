import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  // Close menus on escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      // Close mobile menu if clicking outside
      if (mobileOpen && 
          menuRef.current && 
          !menuRef.current.contains(e.target) && 
          !btnRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
      
      // Close user menu if clicking outside
      if (userMenuOpen && 
          userMenuRef.current && 
          !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileOpen, userMenuOpen]);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="container">
        {/* Brand/Logo */}
        <Link to="/" className="navbar-brand" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
          🚨 🆘 ResQnet
        </Link>

        {/* Mobile menu button */}
        <button
          ref={btnRef}
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Navigation links */}
        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`} ref={menuRef}>
          <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/about" onClick={() => setMobileOpen(false)}>About</Link>
          <Link to="/news" onClick={() => setMobileOpen(false)}>News</Link>
          <Link to="/contact" onClick={() => setMobileOpen(false)}>Contact</Link>

          {/* Show these links only in mobile menu */}
          {mobileOpen && (
            <div className="mobile-auth-block">
              {!loading && (
                user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                      Dashboard
                    </Link>
                    {user.role === 'volunteer' && (
                      <Link to="/volunteer" className="volunteer-link" onClick={() => setMobileOpen(false)}>
                        Volunteer Portal
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)}>
                        Admin Dashboard
                      </Link>
                    )}
                    <button className="btn btn-secondary" onClick={handleLogout}>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>Register</Link>
                  </>
                )
              )}
            </div>
          )}
        </div>

        {/* Right side: Theme toggle and auth */}
        <div className="navbar-right">
          <ThemeToggle />
          
          {!loading && (
            user ? (
              <div className="user-menu" ref={userMenuRef}>
                <button
                  className="user-name"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                >
                  <span>{user.name || 'User'}</span>
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        {user.name || 'User'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {user.email}
                      </div>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}>
                        Dashboard
                      </Link>
                      {user.role === 'volunteer' && (
                        <Link to="/volunteer" className="volunteer-link" onClick={() => setUserMenuOpen(false)}>
                          Volunteer Portal
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)}>
                          Admin Dashboard
                        </Link>
                      )}
                      <hr />
                      <button onClick={handleLogout} className="btn btn-secondary">
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-primary">Login</Link>
                <div className="register-prompt">
                  New user? <Link to="/register">Register here</Link>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}