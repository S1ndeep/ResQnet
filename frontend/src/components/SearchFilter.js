import React, { useState } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import './SearchFilter.css';

const SearchFilter = ({ onFilterChange, showDateFilter = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters({ search: value, category, priority, status, startDate, endDate });
  };

  const handleFilterChange = (filterType, value) => {
    let updatedFilters = { search: searchTerm, category, priority, status, startDate, endDate };
    
    switch (filterType) {
      case 'category':
        setCategory(value);
        updatedFilters.category = value;
        break;
      case 'priority':
        setPriority(value);
        updatedFilters.priority = value;
        break;
      case 'status':
        setStatus(value);
        updatedFilters.status = value;
        break;
      case 'startDate':
        setStartDate(value);
        updatedFilters.startDate = value;
        break;
      case 'endDate':
        setEndDate(value);
        updatedFilters.endDate = value;
        break;
      default:
        break;
    }
    
    applyFilters(updatedFilters);
  };

  const applyFilters = (filters) => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('');
    setPriority('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    applyFilters({ search: '', category: '', priority: '', status: '', startDate: '', endDate: '' });
  };

  const hasActiveFilters = searchTerm || category || priority || status || startDate || endDate;

  return (
    <div className="search-filter-container">
      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search requests..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <button
          className={`filter-toggle ${hasActiveFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <FaFilter />
          {hasActiveFilters && <span className="filter-badge"></span>}
        </button>
        {hasActiveFilters && (
          <button
            className="clear-filters"
            onClick={clearFilters}
            title="Clear all filters"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="medical">Medical</option>
              <option value="shelter">Shelter</option>
              <option value="food">Food</option>
              <option value="rescue">Rescue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="claimed">Claimed</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {showDateFilter && (
            <>
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;




