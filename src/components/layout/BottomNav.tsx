import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', to: '/home' },
  { id: 'library', label: 'Library', icon: 'local_library', to: '/library' },
  { id: 'social', label: 'Social', icon: 'groups', to: '/social' },
  { id: 'settings', label: 'Settings', icon: 'settings', to: '/settings' }
];

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.id}
          to={item.to}
          className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          data-nav-id={item.id}
          aria-label={item.label}
        >
          <span className="material-symbols-outlined nav-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
