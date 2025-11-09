import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaPhone, FaLinkedin, FaGithub, FaTwitter, FaMapMarkerAlt } from 'react-icons/fa';
import './About.css';

const About = () => {
  return (
    <div className="about-page">

      {/* Hero Section */}
      <div className="about-hero">
        <div className="container">
          <h1 className="about-hero-title">Empowering Communities in Crisis</h1>
          <p className="hero-subtitle">Technology for rapid, connected, and compassionate disaster response.</p>
        </div>
      </div>


      {/* Founder Section */}
      <div className="container">
        <div className="founder-section glass-card">
          <div className="founder-image-container">
            <img
              src={process.env.PUBLIC_URL + "/myphoto.jpg"}
              alt="ShriKrishna Patel - Founder"
              className="founder-image"
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = e.target.nextElementSibling;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
            <div className="founder-image-placeholder" style={{ display: 'none' }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#00b7ff' }}>SP</span>
            </div>
          </div>
          <div className="founder-content">
            <h2 className="founder-title">Metta Sandeep</h2>
            <p className="founder-role">Developer</p>
            <p className="founder-description">
              "I believe technology can unite people in times of need. Crisis Connect was built to empower communities, volunteers, and agencies to respond together—faster, smarter, and with heart."
            </p>
          </div>
        </div>


        {/* Contact Information */}
        <div className="contact-section">
          <h2>Contact</h2>
          <div className="contact-grid">
            <div className="contact-card">
              <FaEnvelope className="contact-icon" />
              <span>Email</span>
              <a href="mailto:krishnaspattel@gmail.com">mettasandeep12345@gmail.com</a>
            </div>
            <div className="contact-card">
              <FaMapMarkerAlt className="contact-icon" />
              <span>Location</span>
              <p>Jalandhar,Punjab</p>
            </div>
            <div className="contact-card">
              <FaLinkedin className="contact-icon" />
              <span>LinkedIn</span>
              <a href="https://www.linkedin.com/in/sandeepmetta25/" target="_blank" rel="noopener noreferrer">
                /in/sandeepmetta25
              </a>
            </div>
            <div className="contact-card">
              <FaGithub className="contact-icon" />
              <span>GitHub</span>
              <a href="https://github.com/S1ndeep" target="_blank" rel="noopener noreferrer">
                S1ndeep
              </a>
            </div>
            <div className="contact-card">
              <FaTwitter className="contact-icon" />
              <span>Twitter</span>
              <a href="https://x.com/krishnapatel_10?t=CS0_hEx3Dtx8e4ih7evqFA&s=09" target="_blank" rel="noopener noreferrer">
                @sandeepmetta25
              </a>
            </div>
          </div>
        </div>


        {/* Mission & Vision */}
        <div className="mission-section">
          <div className="mission-card glass-card">
            <h2>Our Mission</h2>
            <p>
              Build a real-time platform that unites communities, volunteers, and agencies for rapid, effective disaster response.
            </p>
          </div>
          <div className="mission-card glass-card">
            <h2>Our Vision</h2>
            <p>
              A world where no one faces crisis alone—where technology empowers everyone to help, connect, and recover together.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="cta-section glass-card">
          <h2>Ready to Make a Difference?</h2>
          <p>Join our community—sign up to help, or reach out if you need support.</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary">Join as Volunteer</Link>
            <Link to="/map" className="btn btn-secondary">Explore Crisis Map</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;




