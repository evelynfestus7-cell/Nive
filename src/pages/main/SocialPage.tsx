import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { getUserList, toggleFollowUser } from '../../services/database';
import { UserProfile } from '../../types';

// Elite SVG Icons (Black, Red, Gold theme - no emojis)
const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Chat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  Book: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  ),
  Badge: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"></circle>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  Compose: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  Paperclip: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    </svg>
  )
};

export interface DirectMessage {
  id: string;
  senderId: string; // 'me' or targetUserId
  senderName: string;
  avatar: string;
  text: string;
  timestamp: number;
  timeStr: string;
}

export interface ConversationThread {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  partnerRole?: string;
  partnerLevel?: number;
  lastMessage: string;
  lastTimeStr: string;
  lastTimestamp: number;
  unread: boolean;
  messages: DirectMessage[];
}

const MESSENGER_STORAGE_KEY = 'nive_messenger_threads';

// Initial threads from localStorage or empty
function getInitialThreads(): ConversationThread[] {
  try {
    const saved = localStorage.getItem(MESSENGER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return [];
}

export const SocialPage: React.FC = () => {
  const { user, updateProfile } = useUser();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'messenger'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile modal state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Followers / Following list modal
  const [listModalTitle, setListModalTitle] = useState<string | null>(null);
  const [listModalUsers, setListModalUsers] = useState<UserProfile[]>([]);
  const [listModalLoading, setListModalLoading] = useState(false);

  // Messenger State
  const [threads, setThreads] = useState<ConversationThread[]>(getInitialThreads);
  const [activeThreadPartnerId, setActiveThreadPartnerId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [chatFilterQuery, setChatFilterQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // The active authenticated User ID (prioritizing Firebase/Google auth UID)
  const currentUserId = currentUser?.uid || user.id || (user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest_reader');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'messenger') {
      scrollToBottom();
    }
  }, [activeTab, activeThreadPartnerId, threads]);

  const loadAllReaders = async () => {
    setLoadingUsers(true);
    try {
      const all = await getUserList();
      // Filter out self
      const others = all.filter(u => {
        const uId = String(u.id);
        const uEmail = String(u.email || '').toLowerCase();
        const myEmail = String(user.email || currentUser?.email || '').toLowerCase();
        return uId !== currentUserId && (!myEmail || uEmail !== myEmail);
      });
      setUsers(others);
    } catch (e) {
      console.warn('Error fetching readers list:', e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAllReaders();
  }, [currentUserId, user.email]);

  const saveThreadsLocally = (updatedThreads: ConversationThread[]) => {
    setThreads(updatedThreads);
    try {
      localStorage.setItem(MESSENGER_STORAGE_KEY, JSON.stringify(updatedThreads));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  // Follow / Unfollow logic
  const handleToggleFollow = async (targetUser: UserProfile) => {
    const targetId = String(targetUser.id || targetUser.email);
    if (!targetId) {
      showToast('Could not identify reader', 'error');
      return;
    }

    const isAlreadyFollowing = (user.following || []).includes(targetId);

    // Optimistic UI update
    const updatedMyFollowing = isAlreadyFollowing
      ? (user.following || []).filter(id => id !== targetId)
      : [...(user.following || []), targetId];

    updateProfile({ following: updatedMyFollowing });

    // Update target user in local list state
    const targetFollowers = Array.isArray(targetUser.followers) ? targetUser.followers : [];
    const updatedTargetFollowers = isAlreadyFollowing
      ? targetFollowers.filter(id => id !== currentUserId)
      : [...targetFollowers, currentUserId];

    const updatedTarget: UserProfile = { ...targetUser, followers: updatedTargetFollowers };

    setUsers(prev => prev.map(u => (String(u.id) === targetId ? updatedTarget : u)));
    if (selectedUser && String(selectedUser.id) === targetId) {
      setSelectedUser(updatedTarget);
    }

    showToast(
      isAlreadyFollowing ? `Unfollowed ${targetUser.username}` : `Now following ${targetUser.username}!`,
      'success'
    );

    // Background sync to database
    try {
      await toggleFollowUser(currentUserId, targetId);
    } catch (err) {
      console.warn('Database follow sync warning:', err);
    }
  };

  // Open Direct Message with a specific reader
  const handleOpenDirectChat = (targetUser: UserProfile) => {
    const targetId = String(targetUser.id || targetUser.email);
    const existingThread = threads.find(t => t.partnerId === targetId);

    if (existingThread) {
      // Mark as read
      const updated = threads.map(t => t.partnerId === targetId ? { ...t, unread: false } : t);
      saveThreadsLocally(updated);
      setActiveThreadPartnerId(targetId);
    } else {
      // Create new thread
      const newThread: ConversationThread = {
        partnerId: targetId,
        partnerName: targetUser.username || 'Reader',
        partnerAvatar: targetUser.avatar || 'assets/avatars/avatar1.png',
        partnerRole: targetUser.role === 'admin' ? 'Story Architect & Admin' : `Reader • Level ${targetUser.level || 1}`,
        partnerLevel: targetUser.level || 1,
        lastMessage: 'Conversation started',
        lastTimeStr: 'Just now',
        lastTimestamp: Date.now(),
        unread: false,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: targetId,
            senderName: targetUser.username || 'Reader',
            avatar: targetUser.avatar || 'assets/avatars/avatar1.png',
            text: `Hi ${user.username || 'there'}! Happy to connect with fellow interactive fiction readers.`,
            timestamp: Date.now(),
            timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      const updated = [newThread, ...threads];
      saveThreadsLocally(updated);
      setActiveThreadPartnerId(targetId);
    }

    setActiveTab('messenger');
    setIsNewChatModalOpen(false);
    setSelectedUser(null);
  };

  // Send message in current Messenger thread
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeThreadPartnerId) return;

    const currentThread = threads.find(t => t.partnerId === activeThreadPartnerId);
    if (!currentThread) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    const myMessage: DirectMessage = {
      id: `my-${now}`,
      senderId: 'me',
      senderName: user.username || 'Me',
      avatar: user.avatar || 'assets/avatars/avatar1.png',
      text: messageInput.trim(),
      timestamp: now,
      timeStr
    };

    const updatedMessages = [...currentThread.messages, myMessage];
    const updatedThread: ConversationThread = {
      ...currentThread,
      lastMessage: myMessage.text,
      lastTimeStr: timeStr,
      lastTimestamp: now,
      messages: updatedMessages
    };

    const reorderedThreads = [
      updatedThread,
      ...threads.filter(t => t.partnerId !== activeThreadPartnerId)
    ];

    saveThreadsLocally(reorderedThreads);
    setMessageInput('');

    // Simulate smart interactive reply after 1.2s
    setTimeout(() => {
      const replies = [
        `That's an intriguing take! I chose the forbidden passage and barely escaped with my coins intact.`,
        `Totally agree! Have you unlocked Chapter 3 yet? The cliffhanger left me completely shocked.`,
        `Nice! Interactive storytelling on Nive hits different when every choice actually changes the ending.`,
        `I just added that story to my library! Thanks for the tip, will start reading tonight.`
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const replyMsg: DirectMessage = {
        id: `reply-${Date.now()}`,
        senderId: currentThread.partnerId,
        senderName: currentThread.partnerName,
        avatar: currentThread.partnerAvatar,
        text: randomReply,
        timestamp: Date.now(),
        timeStr: replyTime
      };

      setThreads(prev => {
        const target = prev.find(t => t.partnerId === activeThreadPartnerId);
        if (!target) return prev;
        const newThreadState: ConversationThread = {
          ...target,
          lastMessage: randomReply,
          lastTimeStr: replyTime,
          lastTimestamp: Date.now(),
          messages: [...target.messages, replyMsg]
        };
        const updatedList = [newThreadState, ...prev.filter(t => t.partnerId !== activeThreadPartnerId)];
        try {
          localStorage.setItem(MESSENGER_STORAGE_KEY, JSON.stringify(updatedList));
        } catch {}
        return updatedList;
      });
    }, 1200);
  };

  // Open list of followers or following in a clean modal
  const handleOpenUserListModal = async (title: string, userIds: string[]) => {
    setListModalTitle(title);
    setListModalLoading(true);
    try {
      const all = await getUserList();
      const matched = all.filter(u => userIds.includes(String(u.id)) || userIds.includes(String(u.email)));
      setListModalUsers(matched);
    } catch {
      setListModalUsers([]);
    } finally {
      setListModalLoading(false);
    }
  };

  const activeThread = threads.find(t => t.partnerId === activeThreadPartnerId);

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.bio || '').toLowerCase().includes(q) ||
      (u.genres || []).some(g => g.toLowerCase().includes(q))
    );
  });

  const filteredThreads = threads.filter(t => {
    if (!chatFilterQuery) return true;
    const q = chatFilterQuery.toLowerCase();
    return t.partnerName.toLowerCase().includes(q) || t.lastMessage.toLowerCase().includes(q);
  });

  return (
    <div className="social-page-container" style={{ minHeight: '85vh', padding: '16px 12px 100px', maxWidth: '1080px', margin: '0 auto' }}>
      {/* TOP BAR / TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#E50914', display: 'flex' }}>
              <Icons.Users />
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>
              Community & Messages
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#9e9ea7', margin: '4px 0 0' }}>
            Connect with interactive story lovers, follow reading paths, and chat via real-time Messenger.
          </p>
        </div>

        {/* LUXURY BLACK & RED TAB SWITCHER */}
        <div style={{
          display: 'flex',
          background: '#0d0d10',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'users' ? '#E50914' : 'transparent',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              boxShadow: activeTab === 'users' ? '0 4px 14px rgba(229, 9, 20, 0.4)' : 'none'
            }}
          >
            <Icons.Users />
            <span>Discover Readers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('messenger')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'messenger' ? '#E50914' : 'transparent',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              position: 'relative',
              boxShadow: activeTab === 'messenger' ? '0 4px 14px rgba(229, 9, 20, 0.4)' : 'none'
            }}
          >
            <Icons.Chat />
            <span>Messenger</span>
            {threads.some(t => t.unread) && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#D4AF37'
              }} />
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DISCOVER READERS                                  */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div>
          {/* SEARCH BAR */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6e6e78',
              display: 'flex'
            }}>
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search readers by name, bio, or favorite genres (Fantasy, Sci-Fi, Romance)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 16px 13px 44px',
                borderRadius: '12px',
                background: '#0d0d10',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(229, 9, 20, 0.2)',
                borderTopColor: '#E50914',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'niveSpin 0.8s linear infinite'
              }} />
              Connecting to Nive Reader Network...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#0d0d10',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <p style={{ color: '#aaa', fontSize: '15px' }}>No readers found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {filteredUsers.map(u => {
                const targetId = String(u.id || u.email);
                const isFollowing = (user.following || []).includes(targetId);
                const followersCount = (u.followers || []).length;
                const followingCount = (u.following || []).length;

                return (
                  <div
                    key={targetId}
                    style={{
                      background: 'linear-gradient(180deg, #111115 0%, #0a0a0d 100%)',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <div>
                      {/* HEADER: Avatar, Username, Online Indicator */}
                      <div
                        onClick={() => setSelectedUser(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '14px' }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={u.avatar || 'assets/avatars/avatar1.png'}
                            alt={u.username}
                            style={{
                              width: '54px',
                              height: '54px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid rgba(212, 175, 55, 0.4)',
                              background: '#1a1a20'
                            }}
                            onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#10B981',
                            border: '2px solid #0a0a0d'
                          }} />
                        </div>

                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {u.username || 'Reader'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9e9ea7', marginTop: '2px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#D4AF37', fontWeight: 600 }}>
                              <Icons.Star /> Level {u.level || 1}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#aaa' }}>
                              <Icons.Book /> {u.booksRead || 0} books
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BIO */}
                      <p style={{
                        fontSize: '13px',
                        color: '#b0b0ba',
                        margin: '0 0 14px 0',
                        lineHeight: 1.45,
                        minHeight: '38px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {u.bio || 'Interactive fiction enthusiast exploring diverging story paths.'}
                      </p>

                      {/* STATS: Followers / Following */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#7e7e88', marginBottom: '16px' }}>
                        <span
                          onClick={() => handleOpenUserListModal(`${u.username}'s Followers`, u.followers || [])}
                          style={{ cursor: 'pointer', color: '#aaa' }}
                        >
                          <strong style={{ color: '#ffffff' }}>{followersCount}</strong> Followers
                        </span>
                        <span
                          onClick={() => handleOpenUserListModal(`${u.username} is Following`, u.following || [])}
                          style={{ cursor: 'pointer', color: '#aaa' }}
                        >
                          <strong style={{ color: '#ffffff' }}>{followingCount}</strong> Following
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS: FOLLOW + DIRECT MESSAGE */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(u)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '10px',
                          background: isFollowing ? 'rgba(255, 255, 255, 0.06)' : '#E50914',
                          border: isFollowing ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                          color: isFollowing ? '#ffffff' : '#ffffff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          boxShadow: isFollowing ? 'none' : '0 4px 12px rgba(229, 9, 20, 0.3)'
                        }}
                      >
                        {isFollowing ? (
                          <>
                            <span style={{ color: '#10B981' }}><Icons.Check /></span>
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <Icons.Plus />
                            <span>Follow</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDirectChat(u)}
                        style={{
                          padding: '9px 14px',
                          borderRadius: '10px',
                          background: '#1a1a22',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          color: '#D4AF37',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'background 0.2s ease'
                        }}
                        title={`Message ${u.username}`}
                      >
                        <Icons.Chat />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FACEBOOK MESSENGER INTERFACE                      */}
      {/* ======================================================== */}
      {activeTab === 'messenger' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? '320px 1fr' : '1fr',
          background: '#0d0d10',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          minHeight: '580px',
          height: '68vh',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
        }}>
          {/* ---------------------------------------------------- */}
          {/* MESSENGER LEFT PANE: THREAD LIST                     */}
          {/* ---------------------------------------------------- */}
          <div style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            background: '#08080a',
            height: '100%'
          }}>
            {/* Thread Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Chats
              </h2>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                style={{
                  background: '#E50914',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(229, 9, 20, 0.4)'
                }}
                title="Start a new chat with a reader"
              >
                <Icons.Compose />
              </button>
            </div>

            {/* Chat Search */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', display: 'flex' }}>
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  placeholder="Search Messenger..."
                  value={chatFilterQuery}
                  onChange={e => setChatFilterQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Threads Scroll List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredThreads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#666', fontSize: '13px' }}>
                  No chats found. Click the red pencil icon to start one!
                </div>
              ) : (
                filteredThreads.map(thread => {
                  const isActive = thread.partnerId === activeThreadPartnerId;
                  return (
                    <div
                      key={thread.partnerId}
                      onClick={() => {
                        setActiveThreadPartnerId(thread.partnerId);
                        // Mark as read
                        setThreads(prev => prev.map(t => t.partnerId === thread.partnerId ? { ...t, unread: false } : t));
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(229, 9, 20, 0.12)' : 'transparent',
                        borderLeft: isActive ? '3px solid #E50914' : '3px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={thread.partnerAvatar || 'assets/avatars/avatar1.png'}
                          alt={thread.partnerName}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            background: '#222'
                          }}
                          onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: '1px',
                          right: '1px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#10B981',
                          border: '2px solid #08080a'
                        }} />
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: thread.unread ? 800 : 600,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {thread.partnerName}
                          </span>
                          <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>
                            {thread.lastTimeStr}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: thread.unread ? '#ffffff' : '#888',
                          fontWeight: thread.unread ? 700 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {thread.lastMessage}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* MESSENGER RIGHT PANE: ACTIVE CHAT CONVERSATION       */}
          {/* ---------------------------------------------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d12' }}>
            {activeThread ? (
              <>
                {/* Chat Top Bar */}
                <div style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(10, 10, 14, 0.85)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={activeThread.partnerAvatar || 'assets/avatars/avatar1.png'}
                        alt={activeThread.partnerName}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid rgba(212, 175, 55, 0.3)',
                          background: '#222'
                        }}
                        onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#10B981',
                        border: '2px solid #0d0d12'
                      }} />
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                        {activeThread.partnerName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Active now {activeThread.partnerRole ? `• ${activeThread.partnerRole}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const target = users.find(u => String(u.id || u.email) === activeThread.partnerId);
                        if (target) setSelectedUser(target);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        color: '#ccc',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>

                {/* Message Log */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* Subtle Date Marker */}
                  <div style={{ textAlign: 'center', margin: '6px 0 12px' }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#777',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px'
                    }}>
                      Today
                    </span>
                  </div>

                  {activeThread.messages.map(msg => {
                    const isMe = msg.senderId === 'me' || msg.senderId === currentUserId;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          gap: '8px',
                          alignItems: 'flex-end'
                        }}
                      >
                        {!isMe && (
                          <img
                            src={msg.avatar || activeThread.partnerAvatar}
                            alt={msg.senderName}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              background: '#222'
                            }}
                            onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
                          />
                        )}

                        <div style={{ maxWidth: '72%' }}>
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isMe ? 'linear-gradient(135deg, #E50914 0%, #b20710 100%)' : '#1c1c24',
                            border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            fontSize: '13.5px',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            boxShadow: isMe ? '0 4px 14px rgba(229, 9, 20, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
                          }}>
                            {msg.text}
                          </div>

                          <div style={{
                            fontSize: '10px',
                            color: '#666',
                            marginTop: '4px',
                            textAlign: isMe ? 'right' : 'left',
                            paddingRight: isMe ? '4px' : '0',
                            paddingLeft: !isMe ? '4px' : '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                            gap: '3px'
                          }}>
                            <span>{msg.timeStr}</span>
                            {isMe && (
                              <span style={{ color: '#D4AF37' }}>
                                <Icons.Check />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Tray */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '14px 18px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: '#08080a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#777',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px'
                    }}
                    title="Attach image or story link"
                  >
                    <Icons.Paperclip />
                  </button>

                  <input
                    type="text"
                    placeholder={`Message ${activeThread.partnerName}...`}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '11px 16px',
                      borderRadius: '22px',
                      background: '#16161c',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    style={{
                      background: messageInput.trim() ? '#E50914' : 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: messageInput.trim() ? '#ffffff' : '#555',
                      cursor: messageInput.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      boxShadow: messageInput.trim() ? '0 4px 14px rgba(229, 9, 20, 0.4)' : 'none'
                    }}
                    title="Send message"
                  >
                    <Icons.Send />
                  </button>
                </form>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                padding: '40px'
              }}>
                <span style={{ color: '#E50914', marginBottom: '12px' }}>
                  <Icons.Chat />
                </span>
                <h3 style={{ color: '#fff', margin: '0 0 6px' }}>Select a conversation</h3>
                <p style={{ fontSize: '13px', margin: 0 }}>Choose a reader from the list or start a new message.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: NEW CHAT / DISCOVER READERS SELECTOR            */}
      {/* ======================================================== */}
      {isNewChatModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#121217',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            maxWidth: '440px',
            width: '100%',
            padding: '22px',
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                New Message
              </h3>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <Icons.Close />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#888', margin: '0 0 14px' }}>
              Select any reader to start an instant 1-on-1 discussion:
            </p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div
                  key={String(u.id || u.email)}
                  onClick={() => handleOpenDirectChat(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <img
                    src={u.avatar || 'assets/avatars/avatar1.png'}
                    alt={u.username}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{u.username}</div>
                    <div style={{ fontSize: '11px', color: '#D4AF37' }}>Level {u.level || 1} • {u.booksRead || 0} books</div>
                  </div>
                  <span style={{ color: '#E50914' }}>
                    <Icons.Chat />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: READER PROFILE WALL (Black, Red, Gold)          */}
      {/* ======================================================== */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#121217',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            maxWidth: '460px',
            width: '100%',
            padding: '26px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95)',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedUser(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
            >
              <Icons.Close />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <img
                src={selectedUser.avatar || 'assets/avatars/avatar1.png'}
                alt={selectedUser.username}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #D4AF37',
                  marginBottom: '12px',
                  background: '#222'
                }}
                onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
              />
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {selectedUser.username || 'Reader'}
              </h2>
              <p style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 600, margin: '4px 0 10px' }}>
                {selectedUser.role === 'admin' ? 'Story Architect & Admin' : 'Verified Community Reader'}
              </p>

              <p style={{ fontSize: '13.5px', color: '#b0b0ba', margin: '0 auto 16px', maxWidth: '360px', lineHeight: 1.5 }}>
                {selectedUser.bio || 'Passionate about branching interactive narratives and choices.'}
              </p>

              {/* GENRE TAGS */}
              {selectedUser.genres && selectedUser.genres.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {selectedUser.genres.map((g, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'rgba(229, 9, 20, 0.12)',
                        border: '1px solid rgba(229, 9, 20, 0.25)',
                        color: '#ff6b75',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '16px'
                      }}
                    >
                      #{g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* STATS: Followers, Following, Level */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              background: '#0a0a0e',
              padding: '12px',
              borderRadius: '14px',
              textAlign: 'center',
              marginBottom: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div
                onClick={() => handleOpenUserListModal(`${selectedUser.username}'s Followers`, selectedUser.followers || [])}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {(selectedUser.followers || []).length}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>Followers</div>
              </div>

              <div
                onClick={() => handleOpenUserListModal(`${selectedUser.username} is Following`, selectedUser.following || [])}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {(selectedUser.following || []).length}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>Following</div>
              </div>

              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37' }}>
                  {selectedUser.level || 1}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>Level</div>
              </div>
            </div>

            {/* ACTIONS: FOLLOW + MESSAGE BUTTONS */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleToggleFollow(selectedUser)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  background: (user.following || []).includes(String(selectedUser.id || selectedUser.email))
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#E50914',
                  border: (user.following || []).includes(String(selectedUser.id || selectedUser.email))
                    ? '1px solid rgba(255, 255, 255, 0.15)'
                    : 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {(user.following || []).includes(String(selectedUser.id || selectedUser.email)) ? (
                  <>
                    <span style={{ color: '#10B981' }}><Icons.Check /></span>
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <Icons.Plus />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenDirectChat(selectedUser)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  background: '#1a1a22',
                  border: '1px solid #D4AF37',
                  color: '#D4AF37',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Icons.Chat />
                <span>Message</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: FOLLOWERS / FOLLOWING LIST                      */}
      {/* ======================================================== */}
      {listModalTitle && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#121217',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
            maxWidth: '400px',
            width: '100%',
            padding: '22px',
            maxHeight: '75vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>{listModalTitle}</h3>
              <button
                onClick={() => setListModalTitle(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <Icons.Close />
              </button>
            </div>

            {listModalLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>Loading readers...</div>
            ) : listModalUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No users in this list yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {listModalUsers.map(lu => (
                  <div
                    key={String(lu.id || lu.email)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <img
                      src={lu.avatar || 'assets/avatars/avatar1.png'}
                      alt={lu.username}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      onError={e => { (e.target as any).src = 'assets/avatars/avatar1.png'; }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{lu.username}</div>
                      <div style={{ fontSize: '11px', color: '#D4AF37' }}>Level {lu.level || 1}</div>
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
