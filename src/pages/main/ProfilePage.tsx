import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { getUserList, getStories } from '../../services/database';
import { UserProfile, Story } from '../../types';

const GENRE_OPTIONS = [
  'Fantasy', 'Romance', 'Sci-Fi', 'Mystery', 'Thriller', 'Adventure', 'Horror', 'Supernatural'
];

const PRESET_AVATARS = [
  'assets/avatars/avatar1.png',
  'assets/avatars/avatar2.png',
  'assets/avatars/avatar3.png',
  'assets/avatars/avatar4.png',
  'assets/avatars/avatar5.png',
  'assets/avatars/avatar6.png'
];

interface AchievementItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rewardCoins: number;
  rewardXp: number;
  isUnlocked: (u: UserProfile) => boolean;
}

const ACHIEVEMENTS_LIST: AchievementItem[] = [
  {
    id: 'first_chapter',
    name: 'First Steps',
    desc: 'Read your first interactive chapter',
    icon: 'auto_stories',
    rewardCoins: 10,
    rewardXp: 25,
    isUnlocked: (u) => (u.chaptersCompleted || 0) >= 1 || (u.readChapters || []).length >= 1
  },
  {
    id: 'streak_3',
    name: 'Dedicated Reader',
    desc: 'Maintain a 3-day reading streak',
    icon: 'local_fire_department',
    rewardCoins: 25,
    rewardXp: 50,
    isUnlocked: (u) => (u.streak || 1) >= 3
  },
  {
    id: 'collector_5',
    name: 'Shelf Collector',
    desc: 'Save 5 stories to your personal shelf',
    icon: 'bookmarks',
    rewardCoins: 30,
    rewardXp: 60,
    isUnlocked: (u) => (u.library || []).length >= 5
  },
  {
    id: 'stories_3',
    name: 'Plot Master',
    desc: 'Complete 3 full interactive stories',
    icon: 'military_tech',
    rewardCoins: 50,
    rewardXp: 100,
    isUnlocked: (u) => (u.booksRead || 0) >= 3 || (u.completedStories || []).length >= 3
  },
  {
    id: 'level_5',
    name: 'Story Connoisseur',
    desc: 'Reach Level 5 in reading experience',
    icon: 'workspace_premium',
    rewardCoins: 100,
    rewardXp: 200,
    isUnlocked: (u) => (u.level || 1) >= 5
  }
];

const compressImage = (file: File, maxSize = 200, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, addCoins, addXp, removeFromLibrary } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'shelf' | 'achievements'>('overview');
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.username || 'Reader');
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editAvatar, setEditAvatar] = useState(user.avatar || 'assets/avatars/avatar1.png');
  const [editGenres, setEditGenres] = useState<string[]>(user.genres || ['Fantasy', 'Romance']);
  const [compressing, setCompressing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Follower / Following sub-modals
  const [listModalTitle, setListModalTitle] = useState<string | null>(null);
  const [listModalUsers, setListModalUsers] = useState<UserProfile[]>([]);
  const [listModalLoading, setListModalLoading] = useState(false);

  useEffect(() => {
    getStories().then(setAllStories);
  }, []);

  const xpCurrent = (user.xp || 0) % 100;
  const xpTarget = 100;

  // Filter user's saved shelf stories
  const shelfStories = allStories.filter(s => (user.library || []).includes(s.id));

  // Claim achievement reward
  const handleClaimReward = (ach: AchievementItem) => {
    const claimed = user.achievements || [];
    if (claimed.includes(ach.id)) return;

    addCoins(ach.rewardCoins);
    addXp(ach.rewardXp);
    updateProfile({
      achievements: [...claimed, ach.id]
    });
    showToast(`🎉 Reward Claimed! +${ach.rewardCoins} Coins & +${ach.rewardXp} XP!`, 'success');
  };

  // Open list of followers or following
  const handleOpenUserListModal = async (title: string, userIds: string[]) => {
    setListModalTitle(title);
    setListModalLoading(true);
    try {
      const all = await getUserList();
      const matched = all.filter(u => userIds.includes(u.id || '') || userIds.includes(u.email));
      setListModalUsers(matched);
    } catch {
      setListModalUsers([]);
    } finally {
      setListModalLoading(false);
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'warning');
      return;
    }

    try {
      setCompressing(true);
      showToast('Optimizing photo...', 'info');
      const compressed = await compressImage(file, 200, 0.85);
      setEditAvatar(compressed);
      showToast('Avatar preview updated!', 'success');
    } catch (err) {
      console.warn('Error compressing avatar image:', err);
      showToast('Could not process image. Please try another photo.', 'error');
    } finally {
      setCompressing(false);
    }
  };

  const toggleGenreSelection = (genre: string) => {
    setEditGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Please enter a display name', 'warning');
      return;
    }
    setSavingProfile(true);
    try {
      updateProfile({
        username: editName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar,
        genres: editGenres
      });
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showToast('Failed to save profile. Please try again.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const followersCount = (user.followers || []).length;
  const followingCount = (user.following || []).length;

  return (
    <div className="profile-page-wrapper container" style={{ padding: '20px 16px 100px', maxWidth: '840px', margin: '0 auto' }}>
      {/* PROFILE HEADER CARD */}
      <div
        style={{
          background: '#111',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <img
            src={user.avatar || 'assets/avatars/avatar1.png'}
            alt="Avatar"
            style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e50914', background: '#222' }}
            onError={(e) => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
          />

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
                {user.username || 'Reader'}
              </h1>
              {user.premium && (
                <span style={{ fontSize: '11px', background: 'linear-gradient(135deg, #d4af37, #f59e0b)', color: '#000', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>
                  VIP PASS
                </span>
              )}
            </div>

            <p style={{ fontSize: '14px', color: '#aaa', margin: '6px 0 10px', lineHeight: 1.4 }}>
              {user.bio || 'Interactive narrative adventurer.'}
            </p>

            {/* FAVORITE GENRES BADGES */}
            {user.genres && user.genres.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {user.genres.map((g, i) => (
                  <span key={i} style={{ background: 'rgba(229,9,20,0.15)', color: '#ff7878', border: '1px solid rgba(229,9,20,0.3)', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '14px' }}>
                    #{g}
                  </span>
                ))}
              </div>
            )}

            {/* REAL SOCIAL COUNTERS */}
            <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: '#888' }}>
              <span
                onClick={() => handleOpenUserListModal('My Followers', user.followers || [])}
                style={{ cursor: 'pointer' }}
              >
                <strong style={{ color: '#fff' }}>{followersCount}</strong> Followers
              </span>
              <span
                onClick={() => handleOpenUserListModal('I am Following', user.following || [])}
                style={{ cursor: 'pointer' }}
              >
                <strong style={{ color: '#fff' }}>{followingCount}</strong> Following
              </span>
              <span>🪙 <strong style={{ color: '#d4af37' }}>{user.coins || 0}</strong> Coins</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditName(user.username || 'Reader');
              setEditBio(user.bio || '');
              setEditAvatar(user.avatar || 'assets/avatars/avatar1.png');
              setEditGenres(user.genres || ['Fantasy', 'Romance']);
              setIsEditing(true);
            }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '10px 18px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#e50914' }}>edit</span>
            <span>Edit Profile</span>
          </button>
        </div>

        {/* XP PROGRESS BAR */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
            <span>⭐ Level {user.level || 1} Reader</span>
            <span>{xpCurrent} / {xpTarget} XP (Next Level: Lvl {(user.level || 1) + 1})</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.round((xpCurrent / xpTarget) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #e50914, #d4af37)',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>

      {/* PROFILE TABS: OVERVIEW, MY SHELF, MILESTONES & REWARDS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveProfileTab('overview')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeProfileTab === 'overview' ? '2px solid #e50914' : '2px solid transparent',
            color: activeProfileTab === 'overview' ? '#fff' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: activeProfileTab === 'overview' ? '#e50914' : '#888' }}>bar_chart</span>
          <span>Stats & Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('shelf')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeProfileTab === 'shelf' ? '2px solid #e50914' : '2px solid transparent',
            color: activeProfileTab === 'shelf' ? '#fff' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: activeProfileTab === 'shelf' ? '#e50914' : '#888' }}>bookmarks</span>
          <span>My Shelf ({shelfStories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('achievements')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeProfileTab === 'achievements' ? '2px solid #e50914' : '2px solid transparent',
            color: activeProfileTab === 'achievements' ? '#fff' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: activeProfileTab === 'achievements' ? '#e50914' : '#888' }}>military_tech</span>
          <span>Rewards & Badges</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & READING TILES */}
      {activeProfileTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <div style={{ background: '#111', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#e50914' }}>{user.booksRead || 0}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Stories Completed</div>
          </div>
          <div style={{ background: '#111', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#d4af37' }}>{user.chaptersCompleted || (user.readChapters || []).length}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Chapters Read</div>
          </div>
          <div style={{ background: '#111', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#d4af37' }}>🪙 {user.coins || 0}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Wallet Balance</div>
          </div>
          <div style={{ background: '#111', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#e50914' }}>🔥 {user.streak || 1}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Day Streak</div>
          </div>
        </div>
      )}

      {/* TAB 2: MY SHELF (SAVED STORIES) */}
      {activeProfileTab === 'shelf' && (
        <div>
          {shelfStories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#111', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#666', marginBottom: '12px' }}>bookmarks</span>
              <h3 style={{ color: '#fff', margin: '0 0 6px' }}>Your Shelf is Empty</h3>
              <p style={{ color: '#888', fontSize: '13px', maxWidth: '360px', margin: '0 auto 16px' }}>
                Tap "+ My Shelf" on any story card or detail page to save your favorite books here.
              </p>
              <button onClick={() => navigate('/home')} className="btn" style={{ padding: '8px 18px', background: '#e50914' }}>
                Browse Stories
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {shelfStories.map(story => {
                const prog = user.readingProgress?.[story.id];
                return (
                  <div
                    key={story.id}
                    style={{
                      background: '#111',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <div
                      onClick={() => navigate(`/story/${story.id}`)}
                      style={{ cursor: 'pointer', height: '220px', position: 'relative' }}
                    >
                      <img
                        src={story.coverImage || 'assets/covers/default.png'}
                        alt={story.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {prog && prog.percent > 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.2)' }}>
                          <div style={{ width: `${prog.percent}%`, height: '100%', background: '#e50914' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {story.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', margin: '2px 0 10px' }}>
                        {story.genre} • ★ {story.rating || '5.0'}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => navigate(`/story/${story.id}`)}
                          className="btn"
                          style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 700, background: '#e50914' }}
                        >
                          Read
                        </button>
                        <button
                          onClick={() => removeFromLibrary(story.id)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#ef4444', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                          title="Remove from Shelf"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACHIEVEMENTS, MILESTONES & REWARDS */}
      {activeProfileTab === 'achievements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {ACHIEVEMENTS_LIST.map(ach => {
            const unlocked = ach.isUnlocked(user);
            const claimed = (user.achievements || []).includes(ach.id);

            return (
              <div
                key={ach.id}
                style={{
                  background: '#111',
                  borderRadius: '16px',
                  border: claimed
                    ? '1px solid rgba(34,197,94,0.3)'
                    : unlocked
                    ? '1px solid rgba(212,175,55,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: claimed
                        ? 'rgba(34,197,94,0.15)'
                        : unlocked
                        ? 'rgba(212,175,55,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: claimed ? '1px solid #22c55e' : unlocked ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                      display: 'grid',
                      placeItems: 'center',
                      color: claimed ? '#22c55e' : unlocked ? '#d4af37' : '#666'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>{ach.icon}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{ach.name}</h4>
                      {claimed ? (
                        <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.2)', color: '#22c55e', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                          CLAIMED ✓
                        </span>
                      ) : unlocked ? (
                        <span style={{ fontSize: '10px', background: 'rgba(212,175,55,0.2)', color: '#d4af37', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                          READY TO CLAIM!
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#888', padding: '2px 6px', borderRadius: '6px' }}>
                          LOCKED 🔒
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>{ach.desc}</p>
                    <div style={{ fontSize: '11px', color: '#d4af37', marginTop: '4px', fontWeight: 600 }}>
                      Reward: +{ach.rewardCoins} Coins • +{ach.rewardXp} XP
                    </div>
                  </div>
                </div>

                <div>
                  {claimed ? (
                    <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 700 }}>✓ Completed</span>
                  ) : unlocked ? (
                    <button
                      type="button"
                      onClick={() => handleClaimReward(ach)}
                      style={{
                        background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                        color: '#000',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                      }}
                    >
                      Claim Reward
                    </button>
                  ) : (
                    <button
                      disabled
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        color: '#666',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }}
                    >
                      In Progress
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#18181b',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.15)',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Edit Your Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc', display: 'block', marginBottom: '8px' }}>
                  Profile Picture
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={editAvatar}
                    alt="Preview"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e50914' }}
                  />

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ background: '#e50914', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Upload New Photo
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {PRESET_AVATARS.map((av, i) => (
                    <img
                      key={i}
                      src={av}
                      alt={`Avatar ${i}`}
                      onClick={() => setEditAvatar(av)}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: editAvatar === av ? '2px solid #e50914' : '1px solid rgba(255,255,255,0.1)' }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc', display: 'block', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc', display: 'block', marginBottom: '6px' }}>
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Tell readers about your reading tastes and theories..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc', display: 'block', marginBottom: '8px' }}>
                  Favorite Genres
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {GENRE_OPTIONS.map(g => {
                    const selected = editGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenreSelection(g)}
                        style={{
                          background: selected ? '#e50914' : 'rgba(255,255,255,0.06)',
                          border: selected ? '1px solid #e50914' : '1px solid rgba(255,255,255,0.1)',
                          color: selected ? '#fff' : '#aaa',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {selected ? `✓ ${g}` : `+ ${g}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={savingProfile || compressing}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #e50914, #990000)',
                    color: '#fff',
                    fontWeight: 700,
                    opacity: savingProfile || compressing ? 0.7 : 1,
                    cursor: savingProfile || compressing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingProfile ? 'Saving...' : compressing ? 'Optimizing...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING LIST MODAL */}
      {listModalTitle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#18181b',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.15)',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>{listModalTitle}</h3>
              <button
                onClick={() => setListModalTitle(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {listModalLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>Loading users...</div>
            ) : listModalUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No users in this list yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listModalUsers.map(lu => (
                  <div key={lu.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                    <img src={lu.avatar || 'assets/avatars/avatar1.png'} alt={lu.username} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{lu.username}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Level {lu.level || 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
