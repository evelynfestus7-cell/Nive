import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeStories, deleteStoryRecord } from '../../services/database';
import { useToast } from '../../components/common/Toast';
import { Story } from '../../types';

export const ManageStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeStories(list => {
      setStories(list);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (storyId: string) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    try {
      await deleteStoryRecord(storyId);
      showToast('Story deleted permanently across all devices', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error deleting story', 'error');
    }
  };

  const filtered = stories.filter(s => {
    const matchesSearch = !searchTerm || s.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = !selectedGenre || s.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="container" style={{ padding: '30px 16px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button
            onClick={() => navigate('/admin')}
            style={{ background: 'transparent', border: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '8px' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Dashboard</span>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>Manage Stories</h1>
        </div>

        <button
          className="btn"
          onClick={() => navigate('/admin/stories/new')}
          style={{ padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-outlined">add</span>
          <span>New Story</span>
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          placeholder="Search by title..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 14px',
            borderRadius: '10px',
            color: '#fff'
          }}
        />

        <select
          value={selectedGenre}
          onChange={e => setSelectedGenre(e.target.value)}
          style={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 14px',
            borderRadius: '10px',
            color: '#fff'
          }}
        >
          <option value="">All Genres</option>
          <option value="Fantasy">Fantasy</option>
          <option value="Sci-Fi">Sci-Fi</option>
          <option value="Romance">Romance</option>
          <option value="Mystery">Mystery</option>
          <option value="Thriller">Thriller</option>
        </select>
      </div>

      {/* STORIES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filtered.map(s => (
          <div
            key={s.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}
          >
            <div
              style={{
                height: '150px',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: `url('${s.coverImage || 'assets/covers/default.png'}')`
              }}
            />

            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#E50914', fontWeight: 700, textTransform: 'uppercase' }}>
                {s.genre || 'General'}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '4px 0 6px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 14px', minHeight: '34px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.description}
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate(`/admin/stories/edit/${s.id}`)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={() => navigate(`/story/${s.id}`)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#16a34a',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Preview
                </button>

                <button
                  onClick={() => handleDelete(s.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
