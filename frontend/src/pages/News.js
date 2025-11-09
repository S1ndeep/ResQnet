import React from 'react';
import { FaNewspaper, FaExclamationTriangle, FaShieldAlt, FaUsers, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import './News.css';

const News = () => {
  const newsItems = [
    {
      id: 1,
      title: 'Emergency Preparedness: Essential Items for Your Disaster Kit',
      category: 'Safety Tips',
      date: '2024-01-15',
      excerpt: 'Learn what essential items you should have in your emergency disaster kit to stay safe during crises.',
      icon: <FaShieldAlt />,
      color: '#17a2b8'
    },
    {
      id: 2,
      title: 'Understanding Different Types of Natural Disasters',
      category: 'Educational',
      date: '2024-01-12',
      excerpt: 'A comprehensive guide to understanding various natural disasters and how to prepare for each type.',
      icon: <FaExclamationTriangle />,
      color: '#ffc107'
    },
    {
      id: 3,
      title: 'Community Response: How Volunteers Make a Difference',
      category: 'Community',
      date: '2024-01-10',
      excerpt: 'Stories from volunteers who have made a significant impact in disaster relief efforts.',
      icon: <FaUsers />,
      color: '#28a745'
    },
    {
      id: 4,
      title: 'Real-Time Crisis Mapping: Your Guide to Staying Safe',
      category: 'Technology',
      date: '2024-01-08',
      excerpt: 'How to use real-time crisis mapping tools to stay informed about emergencies in your area.',
      icon: <FaMapMarkerAlt />,
      color: '#007bff'
    },
    {
      id: 5,
      title: 'Emergency Contacts: Save These Numbers Now',
      category: 'Resources',
      date: '2024-01-05',
      excerpt: 'Important emergency contact numbers and resources you should have saved for quick access.',
      icon: <FaPhone />,
      color: '#dc3545'
    },
    {
      id: 6,
      title: 'Winter Storm Preparedness: What You Need to Know',
      category: 'Seasonal',
      date: '2024-01-03',
      excerpt: 'Essential tips for preparing your home and family for winter storms and extreme cold weather.',
      icon: <FaShieldAlt />,
      color: '#6f42c1'
    }
  ];

  return (
    <div className="news-page">
      <div className="container">
        <div className="news-header">
          <h1>
            <FaNewspaper style={{ marginRight: '15px', color: 'var(--accent-color)' }} />
            Latest News & Updates
          </h1>
          <p>Stay informed about disaster management, safety tips, and crisis response updates.</p>
        </div>

        <div className="news-grid">
          {newsItems.map((item) => (
            <div key={item.id} className="news-card">
              <div className="news-card-icon" style={{ color: item.color }}>
                {item.icon}
              </div>
              <div className="news-card-content">
                <div className="news-card-header">
                  <span className="news-category">{item.category}</span>
                  <span className="news-date">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <button className="news-read-more">Read More →</button>
              </div>
            </div>
          ))}
        </div>

        <div className="news-subscribe">
          <h3>Stay Updated</h3>
          <p>Subscribe to receive the latest news and emergency alerts directly to your inbox.</p>
          <div className="news-subscribe-form">
            <input type="email" placeholder="Enter your email address" />
            <button className="btn btn-primary">Subscribe</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default News;



