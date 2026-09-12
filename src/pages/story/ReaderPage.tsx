import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStory, getChapter, getChapters } from '../../services/database';
import { useUser } from '../../context/UserContext';
import { useReader } from '../../context/ReaderContext';
import { useToast } from '../../components/common/Toast';
import { Story, Chapter, Choice } from '../../types';

export const ReaderPage: React.FC = () => {
  const { storyId, chapterId } = useParams<{ storyId: string; chapterId: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);

  const { settings, updateSettings } = useReader();
  const { user, toggleBookmark, updateReadingProgress, recordFinishedChapter, unlockChapter, isChapterUnlocked } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!storyId || !chapterId) return;
    setLoading(true);

    // Check offline cache first for instant load
    const offlineKey = `offline_ch_${storyId}_${chapterId}`;
    const cachedData = localStorage.getItem(offlineKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.chapter && parsed.story) {
          setStory(parsed.story);
          setChapter(parsed.chapter);
          setIsSavedOffline(true);
        }
      } catch {}
    }

    Promise.all([
      getStory(storyId),
      getChapter(storyId, chapterId),
      getChapters(storyId)
    ]).then(([s, ch, chs]) => {
      if (s) setStory(s);
      if (ch) setChapter(ch);
      if (chs && chs.length) setAllChapters(chs);
      setLoading(false);
      window.scrollTo(0, 0);
    }).catch(() => {
      // If network fails but offline cache exists, dismiss loading
      setLoading(false);
    });

    const isOffline = !!localStorage.getItem(offlineKey);
    setIsSavedOffline(isOffline);

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [storyId, chapterId]);

  // Debounced scroll tracking (avoids Firestore write flood on every scroll event)
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const totalHeight = el.scrollHeight - el.clientHeight;
      if (totalHeight > 0) {
        const pct = Math.min(100, Math.round((el.scrollTop / totalHeight) * 100));
        setScrollPercent(pct);

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce database sync by 2000ms or on 100% completion
        scrollTimeoutRef.current = setTimeout(() => {
          if (storyId && chapterId) {
            updateReadingProgress(storyId, chapterId, pct);
          }
        }, pct === 100 ? 100 : 2000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [storyId, chapterId, updateReadingProgress]);

  // Audio narration toggle (Web Speech API)
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech narration is not supported by your browser', 'info');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      showToast('Narration stopped', 'info');
    } else {
      const textToRead = Array.isArray(chapter?.content) ? chapter.content.join('. ') : (chapter?.content || '');
      if (!textToRead) return;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      showToast('Starting chapter narration...', 'info');
    }
  };

  // Toggle saving chapter for offline reading
  const toggleSaveOffline = () => {
    if (!storyId || !chapterId || !chapter || !story) return;
    const offlineKey = `offline_ch_${storyId}_${chapterId}`;
    if (isSavedOffline) {
      localStorage.removeItem(offlineKey);
      setIsSavedOffline(false);
      showToast('Removed from offline cache', 'info');
    } else {
      localStorage.setItem(offlineKey, JSON.stringify({ story, chapter, savedAt: Date.now() }));
      setIsSavedOffline(true);
      showToast('Chapter cached for offline reading!', 'success');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#0a0a0c', color: '#888' }}>
        Loading Chapter...
      </div>
    );
  }

  if (!chapter || !story) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: '#0a0a0c', minHeight: '100vh', color: '#888' }}>
        <h2>Chapter not found</h2>
        <button className="btn" onClick={() => navigate(`/story/${storyId}`)} style={{ marginTop: '16px' }}>
          Back to Story
        </button>
      </div>
    );
  }

  const isBookmarked = (user.bookmarks || []).some(
    b => b.storyId === story.id && b.chapterId === chapter.id
  );

  const handleChoiceClick = (choice: Choice) => {
    const cost = choice.coinsCost || 0;
    if (cost > 0) {
      if ((user.coins || 0) < cost) {
        showToast(`This choice costs ${cost} coins. Visit store to recharge!`, 'warning');
        return;
      }
      unlockChapter(story.id, choice.nextChapterId, cost);
    }
    showToast('Decision made!', 'info');
    navigate(`/reader/${story.id}/${choice.nextChapterId}`);
  };

  const handleFinishChapter = () => {
    recordFinishedChapter(story.id, chapter.id, chapter.wordCount || 1000);
    showToast('Chapter finished! +25 XP & +5 Coins earned!', 'success');

    // Find next sequential chapter if exists
    const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
    if (currentIndex >= 0 && currentIndex < allChapters.length - 1) {
      const nextCh = allChapters[currentIndex + 1];
      navigate(`/reader/${story.id}/${nextCh.id}`);
    } else {
      navigate(`/story/${story.id}`);
    }
  };

  // Background and text color based on reader theme
  const themeBg = settings.theme === 'light' ? '#f5f5f7' : settings.theme === 'sepia' ? '#f4ecd8' : '#0a0a0c';
  const themeText = settings.theme === 'light' ? '#1c1c1e' : settings.theme === 'sepia' ? '#5b4636' : '#e4e4e7';

  return (
    <div
      ref={containerRef}
      className={`reader-page theme-${settings.theme}`}
      style={{
        background: themeBg,
        color: themeText,
        minHeight: '100vh',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      {/* SCROLL PROGRESS BAR */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${scrollPercent}%`,
          height: '3px',
          background: 'linear-gradient(90deg, #E50914, #D4AF37)',
          zIndex: 1000,
          transition: 'width 0.1s linear'
        }}
      />

      {/* FIXED READER HEADER */}
      <header
        className="reader-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 900,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: settings.theme === 'light' ? 'rgba(245,245,247,0.92)' : 'rgba(10,10,12,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: settings.theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <button
          type="button"
          className="icon-btn"
          onClick={() => navigate(`/story/${story.id}`)}
          style={{ background: 'transparent', border: 'none', color: themeText, cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {chapter.title}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>
            {scrollPercent}% read
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* TTS Audio Narration */}
          <button
            type="button"
            className="icon-btn"
            onClick={toggleSpeech}
            title={isSpeaking ? 'Stop Narration' : 'Listen to Chapter'}
            aria-label="Toggle narration"
            style={{
              background: isSpeaking ? 'rgba(213,0,0,0.25)' : 'transparent',
              border: isSpeaking ? '1px solid #d50000' : 'none',
              color: isSpeaking ? '#ff4d4d' : themeText,
              cursor: 'pointer',
              borderRadius: '8px',
              padding: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {isSpeaking ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {/* Offline Chapter Save */}
          <button
            type="button"
            className="icon-btn"
            onClick={toggleSaveOffline}
            title={isSavedOffline ? 'Saved for offline reading' : 'Save offline'}
            aria-label="Save chapter offline"
            style={{
              background: 'transparent',
              border: 'none',
              color: isSavedOffline ? '#4ade80' : themeText,
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {isSavedOffline ? 'cloud_done' : 'download_for_offline'}
            </span>
          </button>

          {/* Bookmark */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              toggleBookmark(story.id, chapter.id);
              showToast(isBookmarked ? 'Bookmark removed' : 'Chapter bookmarked!', 'success');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isBookmarked ? '#D4AF37' : themeText,
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {isBookmarked ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>

          {/* Typography Settings */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowSettings(prev => !prev)}
            title="Reader Settings"
            aria-label="Reader settings"
            style={{ background: 'transparent', border: 'none', color: themeText, cursor: 'pointer', padding: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
          </button>
        </div>
      </header>

      {/* TYPOGRAPHY SETTINGS DRAWER */}
      {showSettings && (
        <div
          style={{
            position: 'sticky',
            top: '55px',
            zIndex: 850,
            background: settings.theme === 'light' ? '#fff' : '#18181b',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-around',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
          }}
        >
          {/* THEMES */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['dark', 'sepia', 'light'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => updateSettings({ theme: t })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  border: settings.theme === t ? '2px solid #E50914' : '1px solid rgba(255,255,255,0.2)',
                  background: t === 'dark' ? '#0a0a0c' : t === 'sepia' ? '#f4ecd8' : '#f5f5f7',
                  color: t === 'dark' ? '#fff' : '#000',
                  cursor: 'pointer'
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* FONT SIZE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 2) })}
              style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
            >
              A-
            </button>
            <span style={{ fontSize: '13px' }}>{settings.fontSize}px</span>
            <button
              type="button"
              onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 2) })}
              style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
            >
              A+
            </button>
          </div>

          {/* FONT FAMILY */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => updateSettings({ fontFamily: 'serif' })}
              style={{
                fontFamily: 'serif',
                padding: '6px 12px',
                borderRadius: '8px',
                background: settings.fontFamily === 'serif' ? 'rgba(168,85,247,0.3)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              Serif
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ fontFamily: 'sans-serif' })}
              style={{
                fontFamily: 'sans-serif',
                padding: '6px 12px',
                borderRadius: '8px',
                background: settings.fontFamily === 'sans-serif' ? 'rgba(168,85,247,0.3)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              Sans
            </button>
          </div>
        </div>
      )}

      {/* STORY CONTENT BODY */}
      <main
        className="reader-shell"
        style={{
          maxWidth: '740px',
          margin: '0 auto',
          padding: '30px 20px 80px',
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineSpacing,
          fontFamily: settings.fontFamily === 'serif' ? 'Georgia, Cambria, serif' : 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.6, marginBottom: '8px' }}>
            {story.title}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
            {chapter.title}
          </h1>
        </div>

        {/* SANITIZED TEXT */}
        <div
          className="chapter-content"
          dangerouslySetInnerHTML={{ __html: chapter.content }}
          style={{
            wordBreak: 'break-word'
          }}
        />

        {/* BRANCHING DECISIONS & CHOICES */}
        {chapter.choices && chapter.choices.length > 0 ? (
          <div
            style={{
              marginTop: '50px',
              padding: '24px',
              borderRadius: '16px',
              background: settings.theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(229, 9, 20, 0.3)',
              boxShadow: '0 10px 30px rgba(229, 9, 20, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ color: '#D4AF37' }}>alt_route</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#D4AF37' }}>
                Make Your Choice
              </h2>
            </div>
            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
              Your decision determines the outcome of the narrative.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chapter.choices.map((choice, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChoiceClick(choice)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: settings.theme === 'light' ? '#fff' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: themeText,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{choice.text}</span>
                  {choice.coinsCost ? (
                    <span style={{ fontSize: '12px', color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '3px 8px', borderRadius: '8px' }}>
                      🪙 {choice.coinsCost}
                    </span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ opacity: 0.6 }}>arrow_forward</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* FINISH CHAPTER / END OF STORY */
          <div style={{ marginTop: '60px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn"
              onClick={handleFinishChapter}
              style={{ padding: '14px 32px', fontSize: '16px', borderRadius: '30px' }}
            >
              Complete Chapter & Earn Rewards
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
