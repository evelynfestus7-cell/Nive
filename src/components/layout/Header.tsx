import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

export const Header: React.FC = () => {
  const { user } = useUser();
  const location = useLocation();

  const isSearchActive = location.pathname === '/search' ? 'active' : '';
  const isStoreActive = location.pathname === '/store' ? 'active' : '';
  const isProfileActive = location.pathname === '/profile' ? 'active' : '';

  return (
    <header className="app-header">
      <div className="brand">
        <Link to="/home" className="brand-link" aria-label="Nive Home">
          <img src="assets/logos/logo.png" alt="Nive" className="logo" />
          <span className="brand-name">Nive</span>
        </Link>
      </div>
      <div className="header-right">
        <Link to="/search" className={`header-icon-btn ${isSearchActive}`} aria-label="Search" title="Search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <span className="header-btn-label">Search</span>
        </Link>
        <Link to="/store" className={`header-icon-btn store-badge-btn ${isStoreActive}`} aria-label="Store" title="Store">
          <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
          <span id="headerCoinCount" className="coin-badge">🪙 {user.coins || 0}</span>
        </Link>
        <Link to="/profile" className={`header-icon-btn profile-btn ${isProfileActive}`} aria-label="Profile" title="Profile">
          <img 
            src={user.avatar || 'assets/avatars/avatar1.png'} 
            className="header-avatar" 
            alt="Profile"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="material-symbols-outlined profile-fallback-icon" style={{ display: 'none' }} aria-hidden="true">
            person
          </span>
          <span className="header-btn-label">Profile</span>
        </Link>
      </div>
    </header>
  );
};
