import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStories } from '../../services/database';
import { Story } from '../../types';

const POPULAR_TAGS = ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Completed', 'Thriller'];

export const SearchPage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nive_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    getStories().then(setStories);
  }, []);

  const saveRecent = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('nive_recent_searches', JSON.stringify(updated));
  };

  const results = useMemo(() => {
    let list = [...stories];
    if (activeTag) {
      list = list.filter(
        s => s.genre?.toLowerCase() === activeTag.toLowerCase() ||
             (activeTag === 'Completed' && s.status === 'completed')
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        s => s.title?.toLowerCase().includes(q) ||
             s.author?.toLowerCase().includes(q) ||
             s.description?.toLowerCase().includes(q) ||
             s.genre?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stories, query, activeTag]);

  return (
    <div className="search-page-wrapper container" style={{ padding: '20px 16px', maxWidth: '800px', margin: '0 auto' }}>
      {/* SEARCH BAR */}
      <div className="search-bar-wrap" style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '28px',
        padding: '10px 18px',
        gap: '10px'
      }}>
        <span className="material-symbols-outlined" style={{ color: '#888' }}>search</span>
        <input
          type="text"
          placeholder="Search by story title, author, or keyword..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveRecent(query);
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '15px',
            outline: 'none'
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* QUICK FILTER TAGS */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '16px 0', scrollbarWidth: 'none' }}>
        {POPULAR_TAGS.map(tag => {
          const isActive = activeTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(isActive ? null : tag)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                background: isActive ? 'rgba(229, 9, 20, 0.25)' : 'rgba(255,255,255,0.05)',
                color: isActive ? '#fff' : '#aaa',
                border: isActive ? '1px solid #E50914' : '1px solid rgba(255,255,255,0.06)',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* RECENT SEARCHES */}
      {!query && recentSearches.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>RECENT SEARCHES</span>
            <button
              type="button"
              onClick={() => {
                setRecentSearches([]);
                localStorage.removeItem('nive_recent_searches');
              }}
              style={{ background: 'transparent', border: 'none', color: '#E50914', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear All
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {recentSearches.map(term => (
              <span
                key={term}
                onClick={() => setQuery(term)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  color: '#ccc',
                  cursor: 'pointer'
                }}
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH RESULTS */}
      <div style={{ marginTop: '10px' }}>
        <h2 style={{ fontSize: '16px', color: '#aaa', fontWeight: 500, marginBottom: '16px' }}>
          {query || activeTag ? `Results (${results.length})` : 'Popular Recommendations'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
          {results.map(story => (
            <div
              key={story.id}
              onClick={() => {
                if (query) saveRecent(query);
                navigate(`/story/${story.id}`);
              }}
              style={{
                background: '#111',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  height: '190px',
                  backgroundImage: `url('${story.coverImage || 'assets/covers/default.png'}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div style={{ padding: '10px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {story.title}
                </h3>
                <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>
                  {story.genre || 'Story'} • ★ {story.rating || 5.0}
                </p>
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            No stories found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
