import React from 'react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => (
  <div className="container" style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', color: '#ccc' }}>
    <h1 style={{ color: '#fff', marginBottom: '16px' }}>Terms of Service</h1>
    <p>Welcome to Nive. By accessing or using our interactive story platform, you agree to be bound by these terms.</p>
    <h3 style={{ color: '#fff', marginTop: '20px' }}>1. Story Content & Choices</h3>
    <p>All stories, characters, and branching decisions are proprietary or licensed to Nive. Unauthorized reproduction is prohibited.</p>
    <h3 style={{ color: '#fff', marginTop: '20px' }}>2. Virtual Coins</h3>
    <p>Coins purchased or earned through reading are virtual items intended solely for in-app unlocks.</p>
    <div style={{ marginTop: '30px' }}>
      <Link to="/home" className="btn">Back to Home</Link>
    </div>
  </div>
);

export const PrivacyPage: React.FC = () => (
  <div className="container" style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', color: '#ccc' }}>
    <h1 style={{ color: '#fff', marginBottom: '16px' }}>Privacy Policy</h1>
    <p>Your privacy is important to us. Nive only collects data necessary to provide and personalize your reading experience.</p>
    <h3 style={{ color: '#fff', marginTop: '20px' }}>Information We Collect</h3>
    <p>We store your reading progress, bookmarks, preferences, and account credentials securely.</p>
    <div style={{ marginTop: '30px' }}>
      <Link to="/home" className="btn">Back to Home</Link>
    </div>
  </div>
);

export const NotFoundPage: React.FC = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh', textAlign: 'center', color: '#fff', padding: '20px' }}>
    <div>
      <h1 style={{ fontSize: '72px', margin: 0, color: '#E50914', fontWeight: 800 }}>404</h1>
      <h2 style={{ margin: '10px 0 20px' }}>Story Not Found</h2>
      <p style={{ color: '#888', marginBottom: '24px' }}>The page you are looking for has diverged into another dimension.</p>
      <Link to="/home" className="btn">Return Home</Link>
    </div>
  </div>
);
