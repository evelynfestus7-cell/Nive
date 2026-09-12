import { supabase, isSupabaseConfigured } from './supabase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Story, Chapter, Choice, UserProfile, StoreSettings, BankTransferRequest } from '../types';

let _cachedStories: Story[] | null = null;

// LocalStorage custom stories fallback for offline
export function getCustomStories(): Story[] {
  try {
    return JSON.parse(localStorage.getItem('nive_custom_stories') || '[]');
  } catch {
    return [];
  }
}

export function saveCustomStories(list: Story[]) {
  try {
    localStorage.setItem('nive_custom_stories', JSON.stringify(list || []));
  } catch (e) {
    console.error('Failed to save custom stories:', e);
  }
}

// ----------------------------------------------------
// REAL-TIME STORY LISTENERS & CRUD (SUPABASE + FIREBASE FALLBACK)
// ----------------------------------------------------

/**
 * Subscribe to all stories in real time.
 * Automatically uses Supabase if configured, falling back to Firestore/local cache.
 */
export function subscribeStories(callback: (stories: Story[]) => void): () => void {
  if (isSupabaseConfigured()) {
    // Initial fetch from Supabase
    getStories().then(stories => {
      if (stories.length > 0) callback(stories);
    });

    // Real-time WebSocket channel for Supabase
    const channel = supabase
      .channel('public:stories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        async () => {
          const updated = await getStories();
          callback(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Firebase fallback if Supabase environment keys are not configured yet
  const storiesCol = collection(db, 'stories');
  const unsubscribe = onSnapshot(storiesCol, (snapshot) => {
    if (!snapshot.empty) {
      const stories: Story[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      _cachedStories = stories;
      saveCustomStories(stories);
      callback(stories);
    } else {
      loadFallbackStories().then(fallback => {
        _cachedStories = fallback;
        callback(fallback);
      });
    }
  }, () => {
    const local = getCustomStories();
    if (local.length > 0) {
      callback(local);
    } else {
      loadFallbackStories().then(callback);
    }
  });

  return unsubscribe;
}

/**
 * Get stories once (with Supabase, Firestore & JSON fallback)
 */
export async function getStories(): Promise<Story[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('stories').select('*');
      if (!error && data && data.length > 0) {
        const mappedStories: Story[] = data.map(item => ({
          id: String(item.id),
          title: item.title || '',
          author: item.author || 'Anonymous',
          description: item.description || '',
          genre: item.genre || 'Fantasy',
          tags: item.tags || [],
          coverImage: item.cover_image || item.coverImage || '',
          bannerImage: item.banner_image || item.bannerImage || '',
          status: item.status || 'ongoing',
          featured: Boolean(item.featured),
          trending: Boolean(item.trending),
          coinsRequired: Number(item.coins_required || item.coinsRequired || 0),
          rating: Number(item.rating || 5.0),
          readCount: Number(item.read_count || item.readCount || 0),
          totalChapters: Number(item.total_chapters || item.totalChapters || 0),
          updatedAt: item.updated_at || new Date().toISOString()
        }));
        _cachedStories = mappedStories;
        saveCustomStories(mappedStories);
        return mappedStories;
      }
    } catch (err) {
      console.warn('[Nive DB] Supabase fetch error, trying fallback:', err);
    }
  }

  // Firebase Firestore Fallback
  try {
    const snap = await getDocs(collection(db, 'stories'));
    if (!snap.empty) {
      const stories = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      _cachedStories = stories;
      saveCustomStories(stories);
      return stories;
    }
  } catch (err) {
    console.warn('[Nive DB] Firestore fetch error:', err);
  }

  const local = getCustomStories();
  if (local.length > 0) {
    return local;
  }

  return loadFallbackStories();
}

/**
 * Load fallback packaged stories (initial seed)
 */
async function loadFallbackStories(): Promise<Story[]> {
  try {
    const res = await fetch('data/stories.json');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

/**
 * Get single story by ID
 */
export async function getStory(storyId: string): Promise<Story | null> {
  if (!storyId) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      if (!error && data) {
        return {
          id: String(data.id),
          title: data.title || '',
          author: data.author || '',
          description: data.description || '',
          genre: data.genre || '',
          tags: data.tags || [],
          coverImage: data.cover_image || data.coverImage || '',
          bannerImage: data.banner_image || data.bannerImage || '',
          status: data.status || 'ongoing',
          featured: Boolean(data.featured),
          trending: Boolean(data.trending),
          coinsRequired: Number(data.coins_required || data.coinsRequired || 0),
          rating: Number(data.rating || 5.0),
          readCount: Number(data.read_count || data.readCount || 0),
          totalChapters: Number(data.total_chapters || data.totalChapters || 0),
          updatedAt: data.updated_at
        };
      }
    } catch (e) {
      console.warn('[Nive DB] Supabase single story error:', e);
    }
  }

  const stories = await getStories();
  return stories.find(s => String(s.id) === String(storyId)) || null;
}

/**
 * Subscribe to chapters for a story in real time
 */
export function subscribeChapters(storyId: string, callback: (chapters: Chapter[]) => void): () => void {
  if (isSupabaseConfigured()) {
    getChapters(storyId).then(callback);
    const channel = supabase
      .channel(`public:chapters:${storyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chapters', filter: `story_id=eq.${storyId}` },
        async () => {
          const updated = await getChapters(storyId);
          callback(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const chaptersCol = collection(db, 'stories', String(storyId), 'chapters');
  return onSnapshot(chaptersCol, (snapshot) => {
    if (!snapshot.empty) {
      const chs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Chapter))
        .sort((a, b) => (Number(a.order || a.id) || 0) - (Number(b.order || b.id) || 0));
      callback(chs);
    } else {
      getChapters(storyId).then(callback);
    }
  }, () => {
    getChapters(storyId).then(callback);
  });
}

/**
 * Fetch chapters for a story
 */
export async function getChapters(storyId: string): Promise<Chapter[]> {
  if (!storyId) return [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('order_num', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(c => {
          const rawChoices = Array.isArray(c.choices) ? c.choices : [];
          const choices: Choice[] = rawChoices.map((ch: any) => ({
            text: ch.text || '',
            nextChapterId: ch.nextChapterId || (ch.next ? (ch.next.includes('--') ? ch.next : `${storyId}--${ch.next}`) : ''),
            coinsCost: Number(ch.coinsCost || ch.coins_cost || 0)
          }));

          return {
            id: String(c.id),
            storyId: String(c.story_id || storyId),
            title: c.title || '',
            order: c.order_num || c.order || 1,
            content: c.content || '',
            wordCount: c.word_count || 0,
            coinsCost: c.coins_cost || 0,
            choices,
            updatedAt: c.updated_at
          };
        });
      }
    } catch (e) {
      console.warn('[Nive DB] Could not load Supabase chapters:', e);
    }
  }

  // Firestore & local fallback
  try {
    const snap = await getDocs(collection(db, 'stories', String(storyId), 'chapters'));
    if (!snap.empty) {
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Chapter))
        .sort((a, b) => (Number(a.order || a.id) || 0) - (Number(b.order || b.id) || 0));
    }
  } catch (e) {
    console.warn('[Nive DB] Could not load Firestore chapters:', e);
  }

  try {
    const res = await fetch('data/chapters.json');
    if (res.ok) {
      const allChapters = await res.json();
      const list = allChapters[storyId] || [];
      return list.map((c: any, idx: number) => {
        const rawChoices = Array.isArray(c.choices) ? c.choices : [];
        const choices: Choice[] = rawChoices.map((ch: any) => ({
          text: ch.text || '',
          nextChapterId: ch.nextChapterId || (ch.next ? (ch.next.includes('--') ? ch.next : `${storyId}--${ch.next}`) : ''),
          coinsCost: Number(ch.coinsCost || ch.coins_cost || 0)
        }));
        return {
          id: c.id ? `${storyId}--${c.id}` : `${storyId}--ch-${idx + 1}`,
          storyId,
          title: c.title || `Chapter ${idx + 1}`,
          order: idx + 1,
          content: c.content || '',
          wordCount: c.content ? c.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0,
          coinsCost: c.coinsCost || 0,
          choices
        };
      });
    }
  } catch {}

  return [];
}

/**
 * Fetch single chapter
 */
export async function getChapter(storyId: string, chapterId: string): Promise<Chapter | null> {
  if (!storyId || !chapterId) return null;
  const chapters = await getChapters(storyId);
  return chapters.find(c => 
    String(c.id) === String(chapterId) || 
    String(c.id) === `${storyId}--${chapterId}` ||
    String(c.id).replace(`${storyId}--`, '') === String(chapterId)
  ) || null;
}

// ----------------------------------------------------
// ADMIN OPERATIONS (SUPABASE + FIRESTORE FALLBACK)
// ----------------------------------------------------

/**
 * Admin: Save or update story
 */
export async function saveStoryToFirestore(story: Story): Promise<void> {
  if (!story.id) return;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('stories').upsert({
        id: story.id,
        title: story.title,
        author: story.author,
        description: story.description,
        genre: story.genre,
        tags: story.tags || [],
        cover_image: story.coverImage,
        banner_image: story.bannerImage,
        status: story.status || 'ongoing',
        featured: story.featured || false,
        trending: story.trending || false,
        coins_required: story.coinsRequired || 0,
        rating: story.rating || 5.0,
        read_count: story.readCount || 0,
        total_chapters: story.totalChapters || 0,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[Nive DB] Error upserting to Supabase:', e);
    }
  }

  // Backup write to Firestore
  try {
    const storyRef = doc(db, 'stories', String(story.id));
    await setDoc(storyRef, {
      ...story,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch {}
}

/**
 * Admin: Delete story
 */
export async function deleteStoryRecord(storyId: string): Promise<void> {
  if (!storyId) return;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('chapters').delete().eq('story_id', storyId);
      await supabase.from('stories').delete().eq('id', storyId);
    } catch (e) {
      console.warn('[Nive DB] Error deleting from Supabase:', e);
    }
  }

  try {
    const chaptersSnap = await getDocs(collection(db, 'stories', String(storyId), 'chapters'));
    const deletePromises = chaptersSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, 'stories', String(storyId)));
  } catch {}

  const local = getCustomStories().filter(s => String(s.id) !== String(storyId));
  saveCustomStories(local);
}

/**
 * Admin: Save chapter
 */
export async function saveChapterToFirestore(storyId: string, chapter: Chapter): Promise<void> {
  if (!storyId || !chapter.id) return;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('chapters').upsert({
        id: chapter.id,
        story_id: storyId,
        title: chapter.title,
        order_num: chapter.order || 1,
        content: chapter.content,
        word_count: chapter.wordCount || 0,
        coins_cost: chapter.coinsCost || 0,
        choices: chapter.choices || [],
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[Nive DB] Supabase save chapter error:', e);
    }
  }

  try {
    await setDoc(doc(db, 'stories', String(storyId), 'chapters', String(chapter.id)), {
      ...chapter,
      storyId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch {}
}

/**
 * Admin: Delete chapter
 */
export async function deleteChapterRecord(storyId: string, chapterId: string): Promise<void> {
  if (!storyId || !chapterId) return;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('chapters').delete().eq('id', chapterId);
    } catch {}
  }

  try {
    await deleteDoc(doc(db, 'stories', String(storyId), 'chapters', String(chapterId)));
  } catch {}
}

/**
 * Admin: Get all users
 */
/**
 * Get all live registered users
 */
export async function getUserList(): Promise<UserProfile[]> {
  let liveUsers: UserProfile[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data && data.length > 0) {
        liveUsers = data.map(u => ({
          id: String(u.id),
          username: u.username || 'Reader',
          email: u.email || '',
          avatar: u.avatar || '',
          bio: u.bio || '',
          followers: u.followers || [],
          following: u.following || [],
          level: u.level || 1,
          xp: u.xp || 0,
          booksRead: u.books_read || 0,
          chaptersCompleted: u.chapters_completed || 0,
          chaptersRead: u.chapters_read || 0,
          pagesRead: u.pages_read || 0,
          minutesRead: u.minutes_read || 0,
          readingSeconds: u.reading_seconds || 0,
          activeDays: u.active_days || [],
          readChapters: u.read_chapters || [],
          achievements: u.achievements || [],
          specialBadges: u.special_badges || [],
          readingGoals: u.reading_goals || { dailyChapters: 3, weeklyActiveDays: 5, monthlyPages: 100 },
          coins: u.coins || 50,
          streak: u.streak || 1,
          lastReadDate: u.last_read_date || '',
          lastChapter: u.last_chapter || {},
          bookmarks: u.bookmarks || [],
          library: u.library || [],
          favorites: u.favorites || [],
          completedStories: u.completed_stories || [],
          unlockedStories: u.unlocked_stories || [],
          readingProgress: u.reading_progress || {},
          unlockedChapters: u.unlocked_chapters || {},
          premium: Boolean(u.premium),
          role: u.role || 'reader',
          onboardingComplete: Boolean(u.onboarding_complete)
        }));
      }
    } catch (e) {
      console.warn('[Nive DB] Could not load Supabase users:', e);
    }
  }

  if (liveUsers.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        liveUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      }
    } catch (err) {
      console.warn('[Nive DB] Could not load users:', err);
    }
  }

  return liveUsers;
}

/**
 * Admin: Update user
 */
export async function updateUserRecord(id: string, updates: Partial<UserProfile>): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('users').upsert({
        id,
        role: updates.role,
        coins: updates.coins,
        avatar: updates.avatar,
        bio: updates.bio,
        username: updates.username,
        followers: updates.followers,
        following: updates.following,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[Nive DB] Supabase updateUserRecord error:', e);
    }
  }

  try {
    await setDoc(doc(db, 'users', String(id)), {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch {}
}

/**
 * Get user profile by ID
 */
export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (!error && data) {
        return {
          id: String(data.id),
          username: data.username || 'Reader',
          email: data.email || '',
          avatar: data.avatar || 'assets/avatars/avatar1.png',
          bio: data.bio || '',
          genres: data.genres || [],
          followers: data.followers || [],
          following: data.following || [],
          level: data.level || 1,
          xp: data.xp || 0,
          booksRead: data.books_read || 0,
          chaptersCompleted: data.chapters_completed || 0,
          chaptersRead: data.chapters_read || 0,
          pagesRead: data.pages_read || 0,
          minutesRead: data.minutes_read || 0,
          readingSeconds: data.reading_seconds || 0,
          activeDays: data.active_days || [],
          readChapters: data.read_chapters || [],
          achievements: data.achievements || [],
          specialBadges: data.special_badges || [],
          readingGoals: data.reading_goals || { dailyChapters: 3, weeklyActiveDays: 5, monthlyPages: 100 },
          coins: data.coins || 50,
          streak: data.streak || 1,
          lastReadDate: data.last_read_date || '',
          lastChapter: data.last_chapter || {},
          bookmarks: data.bookmarks || [],
          library: data.library || [],
          favorites: data.favorites || [],
          completedStories: data.completed_stories || [],
          unlockedStories: data.unlocked_stories || [],
          readingProgress: data.reading_progress || {},
          unlockedChapters: data.unlocked_chapters || {},
          premium: Boolean(data.premium),
          role: data.role || 'reader',
          onboardingComplete: Boolean(data.onboarding_complete)
        };
      }
    } catch {}
  }

  const all = await getUserList();
  return all.find(u => String(u.id) === String(userId)) || null;
}

/**
 * Real Follow / Unfollow User
 */
export async function toggleFollowUser(currentUserId: string, targetUserId: string): Promise<{ isFollowing: boolean }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { isFollowing: false };
  }

  // 1. Resolve current user (DB or local storage)
  let currentUser = await getUserProfileById(currentUserId);
  if (!currentUser) {
    try {
      const local = localStorage.getItem('nive_user');
      if (local) currentUser = JSON.parse(local);
    } catch {}
  }

  // 2. Resolve target user from DB
  const targetUser = await getUserProfileById(targetUserId);

  const currentFollowing = Array.isArray(currentUser?.following) ? [...currentUser.following] : [];
  const targetFollowers = Array.isArray(targetUser?.followers) ? [...targetUser.followers] : [];

  const isAlreadyFollowing = currentFollowing.includes(targetUserId);

  const newFollowing = isAlreadyFollowing
    ? currentFollowing.filter(id => id !== targetUserId)
    : [...currentFollowing, targetUserId];

  const newFollowers = isAlreadyFollowing
    ? targetFollowers.filter(id => id !== currentUserId)
    : [...targetFollowers, currentUserId];

  // 3. Immediately persist locally in nive_user
  try {
    const local = localStorage.getItem('nive_user');
    if (local) {
      const parsed = JSON.parse(local);
      parsed.following = newFollowing;
      localStorage.setItem('nive_user', JSON.stringify(parsed));
    }
  } catch {}

  // 4. Asynchronously persist to database
  try {
    updateUserRecord(currentUserId, { following: newFollowing }).catch(() => {});
    if (targetUser) {
      updateUserRecord(targetUserId, { followers: newFollowers }).catch(() => {});
    }
  } catch {}

  return { isFollowing: !isAlreadyFollowing };
}

/**
 * Default Store & Bank Settings
 */
const DEFAULT_STORE_SETTINGS: StoreSettings = {
  bankName: 'Kuda Microfinance Bank',
  accountNumber: '2019482910',
  accountName: 'Nive Interactive Fiction Ltd',
  instructions: 'Please include your Transaction Reference in your transfer remark. Upload your payment screenshot and send to WhatsApp for instant confirmation.',
  currencySymbol: '₦',
  whatsappNumber: '2348123456789',
  paystackPublicKey: 'pk_test_8484a0d9b4be463f82987151e36c28f95c55be0c',
  enableBankTransfer: true,
  enablePaystack: true,
  exchangeRateNgn: 1000
};

const STORE_SETTINGS_KEY = 'nive_store_bank_settings';
const BANK_TRANSFERS_KEY = 'nive_bank_transfer_requests';

/**
 * Get Store & Bank Settings
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'store_settings').single();
      if (!error && data && data.value) {
        return { ...DEFAULT_STORE_SETTINGS, ...data.value };
      }
    } catch {}
  }

  try {
    const local = localStorage.getItem(STORE_SETTINGS_KEY);
    if (local) {
      return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(local) };
    }
  } catch {}

  return DEFAULT_STORE_SETTINGS;
}

/**
 * Save Store & Bank Settings (Admin)
 */
export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  try {
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving store settings locally:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('app_settings').upsert({
        key: 'store_settings',
        value: settings,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[Nive DB] Store settings Supabase upsert fallback:', e);
    }
  }
}

/**
 * Bank Transfer Requests Management
 */
export async function getBankTransferRequests(): Promise<BankTransferRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('bank_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          userId: d.user_id || d.userId,
          userEmail: d.user_email || d.userEmail || '',
          username: d.username || 'Reader',
          packageId: d.package_id || d.packageId || '',
          title: d.title || 'Coin Bundle',
          coins: Number(d.coins || 0),
          amount: String(d.amount || '0'),
          currency: d.currency || '₦',
          paymentMethod: d.payment_method || d.paymentMethod || 'bank_transfer',
          proofImage: d.proof_image || d.proofImage,
          status: d.status || 'pending',
          createdAt: d.created_at || d.createdAt || new Date().toISOString(),
          approvedAt: d.approved_at || d.approvedAt
        }));
      }
    } catch {}
  }

  try {
    const local = localStorage.getItem(BANK_TRANSFERS_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return [];
}

export async function submitBankTransferRequest(request: BankTransferRequest): Promise<void> {
  // 1. Save to local storage cache
  try {
    const existing = await getBankTransferRequests();
    const updated = [request, ...existing.filter(r => r.id !== request.id)];
    localStorage.setItem(BANK_TRANSFERS_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Save to Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('bank_transfers').upsert({
        id: request.id,
        user_id: request.userId,
        user_email: request.userEmail,
        username: request.username,
        package_id: request.packageId,
        title: request.title,
        payment_method: request.paymentMethod || 'bank_transfer',
        coins: request.coins,
        amount: request.amount,
        currency: request.currency,
        proof_image: request.proofImage,
        status: request.status,
        created_at: request.createdAt
      });
    } catch (e) {
      console.warn('[Nive DB] Bank transfer Supabase save fallback:', e);
    }
  }

  // 3. Save to Firestore
  try {
    await setDoc(doc(db, 'bank_transfers', request.id), {
      ...request,
      createdAt: request.createdAt
    });
  } catch {}
}

export async function approveBankTransferRequest(requestId: string): Promise<{ success: boolean; coinsAdded: number; userEmail: string }> {
  const requests = await getBankTransferRequests();
  const req = requests.find(r => r.id === requestId);
  if (!req) return { success: false, coinsAdded: 0, userEmail: '' };

  const approvedAt = new Date().toISOString();

  // Credit user's coins in database
  const user = await getUserProfileById(req.userId);
  if (user) {
    const newCoins = (user.coins || 0) + req.coins;
    await updateUserRecord(req.userId, { coins: newCoins });
  }

  // Update request status
  req.status = 'approved';
  req.approvedAt = approvedAt;

  // Save to local cache
  try {
    const updated = requests.map(r => r.id === requestId ? { ...r, status: 'approved' as const, approvedAt } : r);
    localStorage.setItem(BANK_TRANSFERS_KEY, JSON.stringify(updated));
  } catch {}

  // Save to Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('bank_transfers').update({
        status: 'approved',
        approved_at: approvedAt
      }).eq('id', requestId);
    } catch {}
  }

  // Save to Firestore
  try {
    await setDoc(doc(db, 'bank_transfers', requestId), {
      status: 'approved',
      approvedAt
    }, { merge: true });
  } catch {}

  return { success: true, coinsAdded: req.coins, userEmail: req.userEmail };
}

export async function rejectBankTransferRequest(requestId: string): Promise<void> {
  const requests = await getBankTransferRequests();
  const updated = requests.map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r);
  localStorage.setItem(BANK_TRANSFERS_KEY, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('bank_transfers').update({ status: 'rejected' }).eq('id', requestId);
    } catch {}
  }

  try {
    await setDoc(doc(db, 'bank_transfers', requestId), { status: 'rejected' }, { merge: true });
  } catch {}
}
