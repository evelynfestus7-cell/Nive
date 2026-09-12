import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStory, getChapters } from '../../services/database';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../components/common/Toast';
import { Story, Chapter } from '../../types';

const STORY_UNLOCK_COST = 50;  // coins to unlock a paid story for the first time
const CHAPTER_UNLOCK_COST = 20; // coins per locked chapter

export const StoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnlockStoryModal, setShowUnlockStoryModal] = useState(false);

  const { user, toggleFavorite, addToLibrary, removeFromLibrary, isChapterUnlocked, unlockChapter, isStoryUnlocked, unlockStory } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    Promise.all([getStory(id), getChapters(id)]).then(([s, chs]) => {
      setStory(s);
      setChapters(chs);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888' }}>Loading story...</div>;
  }

  if (!story) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888' }}>
        <h2>Story not found</h2>
        <button className="btn" onClick={() => navigate('/home')} style={{ marginTop: '16px' }}>Back to Home</button>
      </div>
    );
  }

  const isFav = (user.favorites || []).includes(story.id);
  const isInLib = (user.library || []).includes(story.id);
  const firstChapterId = chapters[0]?.id || '1';

  // A story is "paid" if coinsRequired > 0
  const storyIsPaid = (story.coinsRequired || 0) > 0;
  const storyUnlocked = !storyIsPaid || isStoryUnlocked(story.id);

  const handleStartReading = () => {
    if (!storyUnlocked) {
      setShowUnlockStoryModal(true);
    } else {
      navigate(`/reader/${story.id}/${firstChapterId}`);
    }
  };

  const handleConfirmUnlockStory = () => {
    if ((user.coins || 0) < STORY_UNLOCK_COST) {
      showToast(`You need ${STORY_UNLOCK_COST} coins to unlock this story. Visit the Store!`, 'warning');
      navigate('/store');
      return;
    }
    const success = unlockStory(story.id, STORY_UNLOCK_COST);
    if (success) {
      showToast(`🎉 Story unlocked! -${STORY_UNLOCK_COST} coins. Enjoy reading!`, 'success');
      setShowUnlockStoryModal(false);
      navigate(`/reader/${story.id}/${firstChapterId}`);
    } else {
      showToast('Not enough coins to unlock this story.', 'error');
    }
  };

  const handleChapterClick = (chapter: Chapter, idx: number) => {
    // First chapter is always free
    const isFirstChapter = idx === 0;
    if (isFirstChapter) {
      navigate(`/reader/${story.id}/${chapter.id}`);
      return;
    }

    // Chapters 2+ require story to be unlocked first
    if (!storyUnlocked) {
      setShowUnlockStoryModal(true);
      return;
    }

    const cost = chapter.coinsCost ?? CHAPTER_UNLOCK_COST;
    const unlocked = isChapterUnlocked(story.id, chapter.id);

    if (unlocked) {
      navigate(`/reader/${story.id}/${chapter.id}`);
    } else {
      if ((user.coins || 0) < cost) {
        showToast(`Need ${cost} coins to unlock this chapter. Visit the Store!`, 'warning');
        navigate('/store');
      } else {
        const success = unlockChapter(story.id, chapter.id, cost);
        if (success) {
          showToast(`✅ Chapter unlocked! -${cost} coins`, 'success');
          navigate(`/reader/${story.id}/${chapter.id}`);
        } else {
          showToast('Failed to unlock chapter', 'error');
        }
      }
    }
  };

  return (
    <div className="story-detail-wrapper" style={{ paddingBottom: '90px' }}>
      {/* BANNER HEADER */}
      <div
        style={{
          height: '240px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundImage: `url('${story.bannerImage || story.coverImage || 'assets/covers/default.png'}')`,
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.95) 100%)'
          }}
        />
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      {/* STORY INFO CONTAINER */}
      <div className="container" style={{ padding: '0 20px', marginTop: '-40px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <img
            src={story.coverImage || 'assets/covers/default.png'}
            alt={story.title}
            style={{
              width: '110px',
              height: '160px',
              borderRadius: '10px',
              objectFit: 'cover',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: '12px',
                background: 'rgba(229, 9, 20, 0.15)',
                color: '#ff4d58',
                border: '1px solid rgba(229, 9, 20, 0.3)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 700
              }}
            >
              {story.genre || 'Interactive Fiction'}
            </span>
            <h1 style={{ fontSize: '22px', color: '#fff', margin: '8px 0 4px', fontWeight: 700 }}>
              {story.title}
            </h1>
            <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
              By {story.author || 'Nive Studio'} • ★ {story.rating || 5.0}
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '12px', margin: '20px 0' }}>
          <button
            className="btn"
            style={{ flex: 2, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={handleStartReading}
          >
            <span className="material-symbols-outlined">auto_stories</span>
            <span>Start Reading</span>
          </button>

          <button
            className="btn ghost"
            style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              if (isInLib) {
                removeFromLibrary(story.id);
                showToast('Removed from Library', 'info');
              } else {
                addToLibrary(story.id);
                showToast('Added to Library!', 'success');
              }
            }}
          >
            <span className="material-symbols-outlined">{isInLib ? 'check' : 'bookmark_add'}</span>
            <span>{isInLib ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toggleFavorite(story.id);
              showToast(isFav ? 'Removed from favorites' : 'Added to favorites', 'success');
            }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              width: '48px',
              display: 'grid',
              placeItems: 'center',
              color: isFav ? '#ef4444' : '#fff',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined">{isFav ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/story/${story.id}/experience`)}
          style={{ width: '100%', border: '1px solid rgba(168,85,247,0.45)', borderRadius: '12px', background: 'rgba(168,85,247,0.12)', color: '#e9d5ff', padding: '11px 14px', cursor: 'pointer', fontWeight: 700 }}
        >
          ✦ Explore Story Lab — branches, maps, reactions & rewards
        </button>

        {/* SYNOPSIS */}
        <div style={{ margin: '24px 0' }}>
          <h2 style={{ fontSize: '16px', color: '#fff', fontWeight: 600, marginBottom: '8px' }}>Synopsis</h2>
          <p style={{ fontSize: '14px', color: '#bbb', lineHeight: '1.6', margin: 0 }}>
            {story.description || 'Step into an interactive tale where every decision shapes your destiny.'}
          </p>
        </div>

        {!storyUnlocked ? (
          <div style={{ margin: '30px 0', padding: '24px', textAlign: 'center', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '34px' }}>lock</span>
            <h2 style={{ fontSize: '18px', color: '#fff', margin: '10px 0 6px' }}>Unlock this story</h2>
            <p style={{ fontSize: '13px', color: '#bbb', lineHeight: 1.5, margin: '0 0 16px' }}>
              This is a premium story. Unlock it for <strong style={{ color: '#fbbf24' }}>{STORY_UNLOCK_COST} coins</strong> to access all chapters, or read Chapter 1 for free.
            </p>
            <button type="button" className="btn" onClick={handleConfirmUnlockStory} style={{ padding: '10px 20px', fontWeight: 700 }}>
              🪙 Unlock for {STORY_UNLOCK_COST} coins
            </button>
          </div>
        ) : (
        <div style={{ margin: '30px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', color: '#fff', fontWeight: 600, margin: 0 }}>
              Chapters ({chapters.length})
            </h2>
            <span style={{ fontSize: '12px', color: '#888' }}>
              {story.status === 'completed' ? 'Completed' : 'Ongoing'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chapters.map((ch, idx) => {
              const cost = ch.coinsCost || 20;
              const isFree = cost === 0 || idx === 0;
              const unlocked = isFree || isChapterUnlocked(story.id, ch.id);

              return (
                <div
                  key={ch.id}
                  onClick={() => handleChapterClick(ch, idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                      Chapter {ch.order || idx + 1}
                    </span>
                    <h3 style={{ fontSize: '15px', color: '#fff', margin: '2px 0 0', fontWeight: 500 }}>
                      {ch.title || `Part ${idx + 1}`}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!unlocked && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#fbbf24',
                          background: 'rgba(251,191,36,0.15)',
                          padding: '3px 8px',
                          borderRadius: '8px'
                        }}
                      >
                        🪙 {cost}
                      </span>
                    )}
                    <span className="material-symbols-outlined" style={{ color: unlocked ? '#D4AF37' : '#666', fontSize: '20px' }}>
                      {unlocked ? 'play_arrow' : 'lock'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* STORY UNLOCK MODAL */}
      {showUnlockStoryModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setShowUnlockStoryModal(false)}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: '20px',
              padding: '32px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>
              Unlock {story.title}
            </h2>
            <p style={{ color: '#bbb', fontSize: '13px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Get unlimited access to all chapters of this story for a one-time cost of <strong style={{ color: '#fbbf24' }}>{STORY_UNLOCK_COST} coins</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px', fontSize: '13px', color: '#888' }}>
              <span>Your balance:</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>🪙 {user.coins || 0} coins</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowUnlockStoryModal(false)}
                style={{
                  flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                  color: '#aaa', cursor: 'pointer', fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmUnlockStory}
                style={{ flex: 2, padding: '12px', fontWeight: 700 }}
              >
                🪙 Unlock for {STORY_UNLOCK_COST} coins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
