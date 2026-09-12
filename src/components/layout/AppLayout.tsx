import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-content" style={{ paddingBottom: '85px' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
