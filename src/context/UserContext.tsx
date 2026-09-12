import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from './AuthContext';
import { UserProfile } from '../types';

const USER_KEY = 'nive_user';

function getDefaultUser(): UserProfile {
  return {
    username: 'Reader',
    email: '',
    avatar: 'assets/avatars/avatar1.png',
    bio: 'Passionate reader & storyteller.',
    followers: [],
    following: [],
    level: 1,
    xp: 0,
    booksRead: 0,
    chaptersCompleted: 0,
    chaptersRead: 0,
    pagesRead: 0,
    minutesRead: 0,
    readingSeconds: 0,
    activeDays: [],
    readChapters: [],
    achievements: [],
    specialBadges: [],
    readingGoals: {
      dailyChapters: 1,
      weeklyActiveDays: 3,
      monthlyPages: 100
    },
    coins: 100,
    streak: 0,
    lastReadDate: '',
    lastChapter: {},
    bookmarks: [],
    library: [],
    favorites: [],
    completedStories: [],
    unlockedStories: [],
    readingProgress: {},
    unlockedChapters: {},
    premium: false,
    role: 'reader',
    onboardingComplete: true,
    joined: new Date().toISOString()
  };
}

interface UserContextType {
  user: UserProfile;
  addCoins: (amount: number) => void;
  deductCoins: (amount: number) => boolean;
  addXp: (amount: number) => void;
  toggleFavorite: (storyId: string) => void;
  toggleBookmark: (storyId: string, chapterId: string) => void;
  addToLibrary: (storyId: string) => void;
  removeFromLibrary: (storyId: string) => void;
  isStoryUnlocked: (storyId: string) => boolean;
  unlockStory: (storyId: string, cost: number) => boolean;
  isChapterUnlocked: (storyId: string, chapterId: string) => boolean;
  unlockChapter: (storyId: string, chapterId: string, cost?: number) => boolean;
  updateReadingProgress: (storyId: string, chapterId: string, percent: number) => void;
  recordFinishedChapter: (storyId: string, chapterId: string, wordCount?: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? { ...getDefaultUser(), ...JSON.parse(saved) } : getDefaultUser();
    } catch {
      return getDefaultUser();
    }
  });

  // Load user data from Supabase (primary) or Firestore when currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    // Immediately ensure user.id and current auth fields are populated
    setUser(prev => {
      const merged: UserProfile = {
        ...prev,
        id: currentUser.uid,
        email: currentUser.email || prev.email,
        username: prev.username && prev.username !== 'Reader' ? prev.username : (currentUser.displayName || prev.username || 'Reader'),
        avatar: currentUser.photoURL || prev.avatar || 'assets/avatars/avatar1.png'
      };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    const fetchProfile = async () => {
      // Try Supabase first
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.uid)
            .single();
          if (!error && data) {
            const profile: Partial<UserProfile> = {
              id: currentUser.uid,
              username: data.username || currentUser.displayName || 'Reader',
              email: data.email || currentUser.email || '',
              avatar: data.avatar || currentUser.photoURL || 'assets/avatars/avatar1.png',
              bio: data.bio || '',
              coins: data.coins ?? 100,
              level: data.level ?? 1,
              xp: data.xp ?? 0,
              role: data.role || 'reader',
              premium: Boolean(data.premium),
              streak: data.streak ?? 0,
              library: data.library || [],
              favorites: data.favorites || [],
              bookmarks: data.bookmarks || [],
              readChapters: data.read_chapters || [],
              chaptersCompleted: data.chapters_completed ?? 0,
              chaptersRead: data.chapters_read ?? 0,
              pagesRead: data.pages_read ?? 0,
              readingProgress: data.reading_progress || {},
              unlockedStories: data.unlocked_stories || [],
              unlockedChapters: data.unlocked_chapters || {},
              followers: data.followers || [],
              following: data.following || [],
            };
            setUser(prev => {
              const merged = { ...prev, ...profile, id: currentUser.uid };
              localStorage.setItem(USER_KEY, JSON.stringify(merged));
              return merged;
            });
            return;
          }
        } catch (err) {
          console.warn('Error fetching user profile from Supabase:', err);
        }
      }

      // Firestore fallback
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfile>;
          setUser(prev => {
            const merged = { ...prev, ...data, id: currentUser.uid, email: currentUser.email || prev.email };
            localStorage.setItem(USER_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('Error fetching user profile from Firestore:', err);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const saveUserData = (updatedOrFn: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    setUser(prev => {
      const updated = typeof updatedOrFn === 'function' ? updatedOrFn(prev) : updatedOrFn;
      if (currentUser) {
        updated.id = currentUser.uid;
      }
      
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
      } catch (lsErr) {
        console.warn('[UserContext] LocalStorage quota or write warning:', lsErr);
      }

      if (currentUser) {
        // Sync to Supabase (primary) - only send existing columns in users table
        if (isSupabaseConfigured()) {
          supabase.from('users').upsert({
            id: currentUser.uid,
            username: updated.username || currentUser.displayName || 'Reader',
            email: updated.email || currentUser.email || '',
            avatar: updated.avatar || 'assets/avatars/avatar1.png',
            bio: updated.bio || '',
            coins: updated.coins ?? 100,
            level: updated.level ?? 1,
            xp: updated.xp ?? 0,
            role: updated.role || 'reader',
            unlocked_stories: updated.unlockedStories || [],
            updated_at: new Date().toISOString()
          }).then(
            ({ error }) => {
              if (error) console.warn('[UserContext] Supabase user sync notice:', error.message);
            },
            err => {
              console.warn('[UserContext] Failed to sync user to Supabase:', err);
            }
          );
        }

        // Also sync to Firestore as backup
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          setDoc(userRef, { ...updated, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => {
            console.warn('[UserContext] Failed to sync user to Firestore:', err);
          });
        } catch (fsErr) {
          console.warn('[UserContext] Firestore doc write error:', fsErr);
        }
      }
      return updated;
    });
  };

  const addCoins = (amount: number) => {
    saveUserData(prev => ({ ...prev, coins: (prev.coins || 0) + amount }));
  };

  const deductCoins = (amount: number): boolean => {
    let success = false;
    setUser(prev => {
      if ((prev.coins || 0) < amount) {
        success = false;
        return prev;
      }
      success = true;
      const updated = { ...prev, coins: (prev.coins || 0) - amount };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, { coins: updated.coins, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
      return updated;
    });
    return success;
  };

  const addXp = (amount: number) => {
    saveUserData(prev => {
      const newXp = (prev.xp || 0) + amount;
      const newLevel = Math.floor(newXp / 100) + 1;
      return {
        ...prev,
        xp: newXp,
        level: newLevel
      };
    });
  };

  const toggleFavorite = (storyId: string) => {
    saveUserData(prev => {
      const favs = prev.favorites || [];
      const updated = favs.includes(storyId)
        ? favs.filter(id => id !== storyId)
        : [...favs, storyId];
      return { ...prev, favorites: updated };
    });
  };

  const toggleBookmark = (storyId: string, chapterId: string) => {
    saveUserData(prev => {
      const bookmarks = prev.bookmarks || [];
      const exists = bookmarks.some(b => b.storyId === storyId && b.chapterId === chapterId);
      const updated = exists
        ? bookmarks.filter(b => !(b.storyId === storyId && b.chapterId === chapterId))
        : [...bookmarks, { storyId, chapterId, timestamp: new Date().toISOString() }];
      return { ...prev, bookmarks: updated };
    });
  };

  const addToLibrary = (storyId: string) => {
    saveUserData(prev => {
      const lib = prev.library || [];
      if (!lib.includes(storyId)) {
        return { ...prev, library: [...lib, storyId] };
      }
      return prev;
    });
  };

  const removeFromLibrary = (storyId: string) => {
    saveUserData(prev => ({
      ...prev,
      library: (prev.library || []).filter(id => id !== storyId)
    }));
  };



  const isChapterUnlocked = (storyId: string, chapterId: string): boolean => {
    if (user.premium) return true;
    const unlocked = user.unlockedChapters?.[storyId] || [];
    return unlocked.includes(chapterId);
  };

  const unlockChapter = (storyId: string, chapterId: string, cost = 0): boolean => {
    if (isChapterUnlocked(storyId, chapterId)) return true;
    let success = false;
    setUser(prev => {
      if (cost > 0 && (prev.coins || 0) < cost) {
        success = false;
        return prev;
      }
      success = true;
      const currentUnlocked = prev.unlockedChapters?.[storyId] || [];
      const newUnlocked = {
        ...prev.unlockedChapters,
        [storyId]: [...currentUnlocked, chapterId]
      };
      const updated = {
        ...prev,
        coins: (prev.coins || 0) - cost,
        unlockedChapters: newUnlocked
      };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, { coins: updated.coins, unlockedChapters: newUnlocked, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
      return updated;
    });
    return success;
  };

  const isStoryUnlocked = (storyId: string): boolean => {
    if (user.premium) return true;
    return (user.unlockedStories || []).includes(storyId);
  };

  const unlockStory = (storyId: string, cost = 50): boolean => {
    if (isStoryUnlocked(storyId)) return true;
    let success = false;
    setUser(prev => {
      if (cost > 0 && (prev.coins || 0) < cost) {
        success = false;
        return prev;
      }
      success = true;
      const currentUnlocked = prev.unlockedStories || [];
      const updated = {
        ...prev,
        coins: (prev.coins || 0) - cost,
        unlockedStories: [...currentUnlocked, storyId]
      };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          coins: updated.coins,
          unlockedStories: updated.unlockedStories,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
      return updated;
    });
    return success;
  };

  const updateReadingProgress = (storyId: string, chapterId: string, percent: number) => {
    saveUserData(prev => ({
      ...prev,
      readingProgress: {
        ...prev.readingProgress,
        [storyId]: {
          chapterId,
          percent: Math.min(100, Math.max(0, percent)),
          updatedAt: new Date().toISOString()
        }
      },
      lastChapter: { storyId, chapterId }
    }));
  };

  const recordFinishedChapter = (storyId: string, chapterId: string, wordCount = 1000) => {
    saveUserData(prev => {
      const read = prev.readChapters || [];
      const isNew = !read.includes(chapterId);
      const updatedRead = isNew ? [...read, chapterId] : read;
      
      const today = new Date().toISOString().split('T')[0];
      let newStreak = prev.streak || 0;
      if (prev.lastReadDate !== today) {
        newStreak = (prev.streak || 0) + 1;
      }

      const pages = Math.ceil(wordCount / 250);
      const addedXp = 25;
      const addedCoins = 5;

      return {
        ...prev,
        readChapters: updatedRead,
        chaptersCompleted: (prev.chaptersCompleted || 0) + 1,
        chaptersRead: (prev.chaptersRead || 0) + 1,
        pagesRead: (prev.pagesRead || 0) + pages,
        xp: (prev.xp || 0) + addedXp,
        level: Math.floor(((prev.xp || 0) + addedXp) / 100) + 1,
        coins: (prev.coins || 0) + addedCoins,
        streak: newStreak,
        lastReadDate: today
      };
    });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    saveUserData(prev => ({ ...prev, ...updates }));
  };

  const refreshUser = () => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) setUser({ ...getDefaultUser(), ...JSON.parse(saved) });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      addCoins,
      deductCoins,
      addXp,
      toggleFavorite,
      toggleBookmark,
      addToLibrary,
      removeFromLibrary,
      isStoryUnlocked,
      unlockStory,
      isChapterUnlocked,
      unlockChapter,
      updateReadingProgress,
      recordFinishedChapter,
      updateProfile,
      refreshUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
