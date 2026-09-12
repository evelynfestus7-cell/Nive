import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeStories } from '../../services/database';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../components/common/Toast';
import { Story } from '../../types';

export const LibraryPage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(true);

  const { user, toggleFavorite, addToLibrary, removeFromLibrary } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeStories(list => {
      setStories(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    stories.forEach(s => {
      if (s.genre) set.add(s.genre);
    });
    return ['All', ...Array.from(set)];
  }, [stories]);

  const filteredStories = useMemo(() => {
    let result = [...stories];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }

    if (selectedGenre !== 'All') {
      result = result.filter(s => s.genre === selectedGenre);
    }

    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'alpha') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'recent') {
      result.reverse();
    }

    return result;
  }, [stories, searchQuery, selectedGenre, sortBy]);

  const savedStories = useMemo(() => {
    return stories.filter(s => (user.library || []).includes(s.id));
  }, [stories, user.library]);

  const favoriteStories = useMemo(() => {
    return stories.filter(s => (user.favorites || []).includes(s.id));
  }, [stories, user.favorites]);

  const handleToggleFav = (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    toggleFavorite(storyId);
    const isFav = (user.favorites || []).includes(storyId);
    showToast(isFav ? 'Removed from favorites' : 'Added to favorites', 'success');
  };

  const renderBookCard = (story: Story) => {
    const isFav = (user.favorites || []).includes(story.id);
    const isInLib = (user.library || []).includes(story.id);

    return (
      <div
        key={story.id}
        className="library-book-card"
        onClick={() => navigate(`/story/${story.id}`)}
        style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#111',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        <div
          style={{
            height: '180px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundImage: `url('${story.coverImage || 'assets/covers/default.png'}')`,
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={(e) => handleToggleFav(e, story.id)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: isFav ? '#ef4444' : '#fff'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {isFav ? 'favorite' : 'favorite_border'}
            </span>
          </button>
        </div>
        <div style={{ padding: '10px 12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {story.title}
          </h3>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            {story.genre || 'Story'} • ★ {story.rating || 5.0}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="library-page-wrapper">
      <header className="library-header container">
        <div className="library-top">
          <div>
            <h1>Library</h1>
            <div id="librarySummary" className="library-summary">
              {loading ? 'Loading stories...' : `${stories.length} interactive titles available`}
            </div>
          </div>

          <div className="search-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              id="searchInput"
              className="search"
              type="search"
              placeholder="Search library..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                id="clearSearch"
                className="icon-btn"
                type="button"
                onClick={() => setSearchQuery('')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>

        <div className="filters">
          <div className="categories" id="genreList">
            {genres.map(g => (
              <button
                key={g}
                type="button"
                className={`genre-btn ${selectedGenre === g ? 'active' : ''}`}
                onClick={() => setSelectedGenre(g)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: selectedGenre === g ? 'rgba(229, 9, 20, 0.25)' : 'rgba(255,255,255,0.05)',
                  color: selectedGenre === g ? '#fff' : '#aaa',
                  border: selectedGenre === g ? '1px solid #E50914' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="sort">
            <select
              id="sortSelect"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: '#111',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 12px',
                borderRadius: '8px'
              }}
            >
              <option value="featured">Featured</option>
              <option value="rating">Top Rated</option>
              <option value="recent">Newest</option>
              <option value="alpha">A to Z</option>
            </select>
          </div>
        </div>
      </header>

      <main className="content-area container" style={{ padding: '20px 16px' }}>
        {/* BROWSE ALL */}
        <section className="section">
          <div className="section-title" style={{ fontSize: '18px', fontWeight: 'bold', margin: '20px 0 12px' }}>
            Browse Stories
          </div>
          <div
            className="grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '16px'
            }}
          >
            {filteredStories.map(renderBookCard)}
          </div>
          {filteredStories.length === 0 && (
            <div className="empty-note muted" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
              No stories match your filters.
            </div>
          )}
        </section>

        {/* MY LIBRARY */}
        <section className="section" style={{ marginTop: '30px' }}>
          <div className="section-title" style={{ fontSize: '18px', fontWeight: 'bold', margin: '20px 0 12px' }}>
            My Library ({savedStories.length})
          </div>
          {savedStories.length > 0 ? (
            <div
              className="grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '16px'
              }}
            >
              {savedStories.map(renderBookCard)}
            </div>
          ) : (
            <div className="empty-note muted" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Add stories to your library to see them here.
            </div>
          )}
        </section>

        {/* FAVORITES */}
        <section className="section" style={{ marginTop: '30px' }}>
          <div className="section-title" style={{ fontSize: '18px', fontWeight: 'bold', margin: '20px 0 12px' }}>
            Favorites ({favoriteStories.length})
          </div>
          {favoriteStories.length > 0 ? (
            <div
              className="grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '16px'
              }}
            >
              {favoriteStories.map(renderBookCard)}
            </div>
          ) : (
            <div className="empty-note muted" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No favorite stories yet. Click the heart on any story cover.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
