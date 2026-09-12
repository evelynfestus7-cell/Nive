import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeStories } from '../../services/database';
import { useUser } from '../../context/UserContext';
import { Story } from '../../types';

export const HomePage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { user, addToLibrary, removeFromLibrary } = useUser();
  const navigate = useNavigate();
  const autoPlayRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = subscribeStories(list => {
      setStories(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter featured stories (fallback to top rated if < 2 marked as featured)
  const featuredStories = stories.filter(s => s.featured);
  const heroList = featuredStories.length >= 2 
    ? featuredStories 
    : [...stories].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);

  // Auto-advance hero carousel every 5.5 seconds (unless paused on hover)
  useEffect(() => {
    if (heroList.length <= 1 || isHovered) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % heroList.length);
    }, 5500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [heroList.length, isHovered]);

  const currentHero = heroList[currentHeroIndex] || heroList[0];

  const handleNextHero = () => {
    if (heroList.length > 0) {
      setCurrentHeroIndex((currentHeroIndex + 1) % heroList.length);
    }
  };

  const handlePrevHero = () => {
    if (heroList.length > 0) {
      setCurrentHeroIndex((currentHeroIndex - 1 + heroList.length) % heroList.length);
    }
  };

  // Categorized story lists
  const trendingList = [...stories].sort((a, b) => (b.readCount || 0) - (a.readCount || 0)).slice(0, 10);
  const fantasyList = stories.filter(s => s.genre?.toLowerCase() === 'fantasy').slice(0, 10);
  const romanceList = stories.filter(s => s.genre?.toLowerCase() === 'romance').slice(0, 10);
  const mysteryList = stories.filter(s => s.genre?.toLowerCase() === 'mystery' || s.genre?.toLowerCase() === 'thriller').slice(0, 10);
  const sciFiList = stories.filter(s => s.genre?.toLowerCase() === 'sci-fi' || s.genre?.toLowerCase() === 'adventure').slice(0, 10);

  // Continue reading calculation
  const continueStories = stories.filter(s => {
    const prog = user.readingProgress?.[s.id];
    return prog && prog.percent > 0 && prog.percent < 100;
  });

  const isCurrentInLibrary = currentHero ? (user.library || []).includes(currentHero.id) : false;

  const handleToggleShelf = (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    if ((user.library || []).includes(storyId)) {
      removeFromLibrary(storyId);
    } else {
      addToLibrary(storyId);
    }
  };

  return (
    <div className="home-main" style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 16px 100px' }}>
      {/* CINEMATIC NETFLIX-STYLE HERO CAROUSEL */}
      {currentHero && (
        <div
          className="netflix-hero-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'relative',
            minHeight: '460px',
            borderRadius: '24px',
            overflow: 'hidden',
            marginTop: '16px',
            marginBottom: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            background: '#0a0a0c'
          }}
        >
          {/* BACKGROUND WALLPAPER WITH DYNAMIC BLUR & GRADIENT OVERLAY */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url('${currentHero.bannerImage || currentHero.coverImage || 'assets/covers/default.png'}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 25%',
              filter: 'brightness(0.35) saturate(1.2)',
              transform: 'scale(1.05)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />

          {/* VIGNETTE GRADIENTS */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, #0a0a0c 0%, rgba(10,10,12,0.85) 45%, rgba(10,10,12,0.3) 100%), linear-gradient(0deg, #0a0a0c 0%, transparent 60%)'
            }}
          />

          {/* HERO CONTENT CONTAINER */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '40px 48px',
              gap: '40px',
              flexWrap: 'wrap'
            }}
          >
            {/* LEFT TYPOGRAPHY & DETAILS */}
            <div style={{ flex: '1 1 420px', maxWidth: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #E50914, #b20710)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(229,9,20,0.4)'
                  }}
                >
                  <span style={{ color: '#D4AF37', marginRight: '4px' }}>★</span> NIVE SPOTLIGHT
                </span>

                <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ★ {currentHero.rating || '5.0'}
                </span>

                <span style={{ fontSize: '13px', color: '#ccc', fontWeight: 600 }}>
                  • {currentHero.genre || 'Interactive Fiction'}
                </span>

                <span style={{ fontSize: '12px', color: '#06b6d4', background: 'rgba(6,182,212,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  {currentHero.totalChapters || 5} Chapters
                </span>

                {currentHero.coinsRequired === 0 ? (
                  <span style={{ fontSize: '12px', color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    FREE
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    🪙 {currentHero.coinsRequired} Coins
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1.15,
                  margin: '0 0 14px 0',
                  textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                  letterSpacing: '-0.5px'
                }}
              >
                {currentHero.title}
              </h1>

              <p
                style={{
                  fontSize: '15px',
                  color: '#d1d5db',
                  lineHeight: 1.6,
                  margin: '0 0 24px 0',
                  maxHeight: '76px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  textShadow: '0 2px 10px rgba(0,0,0,0.9)'
                }}
              >
                {currentHero.description || 'Step into an interactive world where every decision shapes your fate.'}
              </p>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/story/${currentHero.id}`)}
                  style={{
                    background: 'linear-gradient(135deg, #E50914, #b20710)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 28px',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(229, 9, 20, 0.4)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>play_arrow</span>
                  <span>Start Reading</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleToggleShelf(e, currentHero.id)}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                    borderRadius: '14px',
                    padding: '14px 22px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {isCurrentInLibrary ? 'bookmark_added' : 'bookmark_add'}
                  </span>
                  <span>{isCurrentInLibrary ? 'In Shelf' : '+ My Shelf'}</span>
                </button>
              </div>
            </div>

            {/* RIGHT 3D SHOWCASE COVER CARD (Prominent & Crisp Cover Art) */}
            <div
              onClick={() => navigate(`/story/${currentHero.id}`)}
              style={{
                flex: '0 0 auto',
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
            >
              <div
                style={{
                  width: '200px',
                  height: '280px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.3)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  position: 'relative',
                  background: '#18181b'
                }}
              >
                <img
                  src={currentHero.coverImage || 'assets/covers/default.png'}
                  alt={currentHero.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as any).src = 'assets/covers/default.png'; }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.85) 100%)'
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textAlign: 'center',
                    textShadow: '0 2px 8px rgba(0,0,0,0.9)'
                  }}
                >
                  Interactive Story
                </div>
              </div>
            </div>
          </div>

          {/* CAROUSEL CONTROLS: LEFT & RIGHT CHEVRONS */}
          {heroList.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevHero}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  transition: 'background 0.2s'
                }}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              <button
                type="button"
                onClick={handleNextHero}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  transition: 'background 0.2s'
                }}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>

              {/* NETFLIX-STYLE PROGRESS PILLS */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 20,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {heroList.map((h, idx) => (
                  <div
                    key={h.id}
                    onClick={() => setCurrentHeroIndex(idx)}
                    style={{
                      width: currentHeroIndex === idx ? '28px' : '8px',
                      height: '6px',
                      borderRadius: '4px',
                      background: currentHeroIndex === idx ? '#E50914' : 'rgba(255,255,255,0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* CONTINUE READING ROW (IF ACTIVE) */}
      {continueStories.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#06b6d4' }}>history_toggle_off</span>
            <span>Continue Your Journey</span>
          </h2>

          <div className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '12px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {continueStories.map(story => {
              const prog = user.readingProgress?.[story.id];
              return (
                <div
                  key={story.id}
                  onClick={() => navigate(`/reader/${story.id}/${prog?.chapterId || '1'}`)}
                  style={{
                    flex: '0 0 160px',
                    cursor: 'pointer',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ height: '210px', position: 'relative' }}>
                    <img
                      src={story.coverImage || 'assets/covers/default.png'}
                      alt={story.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px', background: 'rgba(255,255,255,0.1)' }}>
                      <div style={{ width: `${prog?.percent || 0}%`, height: '100%', background: '#06b6d4' }} />
                    </div>
                  </div>
                  <div style={{ padding: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#06b6d4', marginTop: '2px' }}>
                      {prog?.percent || 0}% Read
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TOP 10 TRENDING ROW (NETFLIX STYLE WITH NUMBERED RANK CARDS) */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>local_fire_department</span>
          <span>Top 10 Trending Releases</span>
        </h2>

        <div className="no-scrollbar" style={{ display: 'flex', gap: '20px', overflowX: 'auto', overflowY: 'hidden', paddingTop: '10px', paddingBottom: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ flex: '0 0 180px', height: '250px', background: '#18181b', borderRadius: '14px' }} />
            ))
          ) : (
            trendingList.map((story, rank) => (
              <div
                key={story.id}
                onClick={() => navigate(`/story/${story.id}`)}
                style={{
                  flex: '0 0 200px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.25s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
              >
                {/* BIG NETFLIX NUMBER RANK */}
                <div
                  style={{
                    fontSize: '110px',
                    fontWeight: 900,
                    lineHeight: 0.8,
                    color: '#111',
                    WebkitTextStroke: '2px rgba(168,85,247,0.8)',
                    position: 'relative',
                    left: '12px',
                    zIndex: 1,
                    userSelect: 'none'
                  }}
                >
                  {rank + 1}
                </div>

                {/* STORY CARD */}
                <div
                  style={{
                    width: '150px',
                    height: '220px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#18181b',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  <img
                    src={story.coverImage || 'assets/covers/default.png'}
                    alt={story.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '24px 8px 8px',
                      background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.95))'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.title}
                    </div>
                    <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '2px' }}>
                      ★ {story.rating || '5.0'} • {story.genre}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FANTASY & ADVENTURE WORLDS */}
      {fantasyList.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#D4AF37' }}>auto_awesome</span>
            <span>Epic Fantasy & Magic</span>
          </h2>

          <div className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '14px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {fantasyList.map(story => (
              <div
                key={story.id}
                onClick={() => navigate(`/story/${story.id}`)}
                style={{
                  flex: '0 0 160px',
                  height: '240px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 14px 34px rgba(168,85,247,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                }}
              >
                <img
                  src={story.coverImage || 'assets/covers/default.png'}
                  alt={story.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '26px 10px 10px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92))' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                    ★ {story.rating || '5.0'} • {story.totalChapters || 5} Chs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ROMANCE & FORBIDDEN PATHS */}
      {romanceList.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#ec4899' }}>favorite</span>
            <span>Romance & Passionate Choices</span>
          </h2>

          <div className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '14px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {romanceList.map(story => (
              <div
                key={story.id}
                onClick={() => navigate(`/story/${story.id}`)}
                style={{
                  flex: '0 0 160px',
                  height: '240px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <img
                  src={story.coverImage || 'assets/covers/default.png'}
                  alt={story.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '26px 10px 10px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92))' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                    ★ {story.rating || '5.0'} • {story.totalChapters || 5} Chs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MYSTERY & THRILLER */}
      {mysteryList.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#06b6d4' }}>visibility</span>
            <span>Mystery, Suspense & Dark Thrillers</span>
          </h2>

          <div className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '14px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {mysteryList.map(story => (
              <div
                key={story.id}
                onClick={() => navigate(`/story/${story.id}`)}
                style={{
                  flex: '0 0 160px',
                  height: '240px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <img
                  src={story.coverImage || 'assets/covers/default.png'}
                  alt={story.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '26px 10px 10px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92))' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                    ★ {story.rating || '5.0'} • {story.totalChapters || 5} Chs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SCI-FI & ADVENTURE */}
      {sciFiList.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#22d3ee' }}>rocket_launch</span>
            <span>Sci-Fi & Epic Adventures</span>
          </h2>

          <div className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '14px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {sciFiList.map(story => (
              <div
                key={story.id}
                onClick={() => navigate(`/story/${story.id}`)}
                style={{
                  flex: '0 0 160px',
                  height: '240px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 14px 34px rgba(34,211,238,0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                }}
              >
                <img
                  src={story.coverImage || 'assets/covers/default.png'}
                  alt={story.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '26px 10px 10px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92))' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {story.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#22d3ee', marginTop: '2px' }}>
                    ★ {story.rating || '5.0'} • {story.totalChapters || 5} Chs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
