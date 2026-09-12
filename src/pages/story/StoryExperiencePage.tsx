import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChapters, getStory } from '../../services/database';
import { useToast } from '../../components/common/Toast';
import { useUser } from '../../context/UserContext';
import { Chapter, Story } from '../../types';

type Tab = 'discover' | 'community' | 'rewards' | 'creator';

const readList = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const writeList = <T,>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const tabButton = (active: boolean): React.CSSProperties => ({
  border: 'none',
  borderRadius: '10px',
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 700,
  background: active ? '#e50914' : 'rgba(255,255,255,0.06)',
  color: active ? '#fff' : '#aaa'
});

const cardStyle: React.CSSProperties = {
  background: '#111217',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
  padding: '18px'
};

export const StoryExperiencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, deductCoins } = useUser();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [prompt, setPrompt] = useState('What happens after the hero chooses the forbidden path?');
  const [branch, setBranch] = useState('');
  const [soundtrackOn, setSoundtrackOn] = useState(false);
  const [annotation, setAnnotation] = useState('');
  const [annotations, setAnnotations] = useState<Array<{ text: string; author: string; createdAt: string }>>([]);
  const [reaction, setReaction] = useState('🔥');
  const [coAuthorIdea, setCoAuthorIdea] = useState('');
  const [giftEmail, setGiftEmail] = useState('');
  const [giftCoins, setGiftCoins] = useState(20);
  const [authorPitch, setAuthorPitch] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([getStory(id), getChapters(id)]).then(([nextStory, nextChapters]) => {
      setStory(nextStory);
      setChapters(nextChapters);
    });
    setAnnotations(readList(`nive_annotations_${id}`));
  }, [id]);

  const choiceStats = useMemo(() => {
    const choices = chapters.flatMap(chapter => chapter.choices || []);
    return choices.slice(0, 4).map((choice, index) => ({
      label: choice.text,
      percent: [42, 31, 17, 10][index] || 8
    }));
  }, [chapters]);

  if (!story) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#aaa', background: '#090a0f' }}>Loading story experiences…</div>;
  }

  const generateBranch = () => {
    if (!prompt.trim()) return;
    const cost = 10;
    if (!deductCoins(cost)) {
      showToast(`You need ${cost} coins to unlock an AI branch.`, 'warning');
      return;
    }
    setBranch(`In this reader-made branch of “${story.title}”, the next choice turns on a hidden alliance. ${user.username} follows the consequence of: “${prompt.trim()}” — and discovers a clue that reshapes the final chapter.`);
    showToast('Your private AI-style branch is ready.', 'success');
  };

  const saveAnnotation = () => {
    if (!annotation.trim() || !id) return;
    const next = [{ text: annotation.trim(), author: user.username, createdAt: new Date().toISOString() }, ...annotations];
    setAnnotations(next);
    writeList(`nive_annotations_${id}`, next);
    setAnnotation('');
    showToast('Annotation saved to this story.', 'success');
  };

  const submitCoAuthorIdea = () => {
    if (!coAuthorIdea.trim() || !id) return;
    const key = `nive_coauthor_submissions_${id}`;
    writeList(key, [{ author: user.username, idea: coAuthorIdea.trim(), createdAt: new Date().toISOString() }, ...readList(key)]);
    setCoAuthorIdea('');
    showToast('Chapter pitch submitted for editorial review.', 'success');
  };

  const sendGift = () => {
    if (!giftEmail.trim() || giftCoins < 1) {
      showToast('Enter a recipient email and a valid coin amount.', 'warning');
      return;
    }
    if (!deductCoins(giftCoins)) {
      showToast('You do not have enough coins for this gift.', 'warning');
      return;
    }
    const key = 'nive_coin_gifts';
    writeList(key, [{ recipient: giftEmail.trim(), coins: giftCoins, sender: user.username, createdAt: new Date().toISOString(), status: 'pending' }, ...readList(key)]);
    setGiftEmail('');
    showToast('Coin gift request saved for delivery.', 'success');
  };

  const submitAuthorPitch = () => {
    if (!authorPitch.trim()) return;
    writeList('nive_author_applications', [{ author: user.username, pitch: authorPitch.trim(), createdAt: new Date().toISOString(), status: 'pending' }, ...readList('nive_author_applications')]);
    setAuthorPitch('');
    showToast('Author profile application submitted.', 'success');
  };

  return (
    <main style={{ minHeight: '100vh', background: '#090a0f', color: '#f4f4f5', padding: '28px 16px 96px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <button type="button" onClick={() => navigate(`/story/${story.id}`)} style={{ border: 'none', background: 'transparent', color: '#aaa', cursor: 'pointer', padding: 0 }}>← Back to story</button>
        <div style={{ margin: '18px 0 22px' }}>
          <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>NIVE STORY LAB</span>
          <h1 style={{ margin: '6px 0', fontSize: '28px' }}>{story.title} experiences</h1>
          <p style={{ color: '#a1a1aa', margin: 0 }}>A locally persistent MVP of Nive’s next-generation reader, community, and creator tools.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {(['discover', 'community', 'rewards', 'creator'] as Tab[]).map(tab => <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={tabButton(activeTab === tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
        </div>

        {activeTab === 'discover' && <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>✦ AI Story Branches</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>Create a private continuation shaped by your idea. MVP cost: 10 coins.</p>
            <textarea value={prompt} onChange={event => setPrompt(event.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', color: '#fff', border: '1px solid #343640', borderRadius: '10px', padding: '10px', resize: 'vertical' }} />
            <button type="button" className="btn" onClick={generateBranch} style={{ marginTop: '10px', width: '100%' }}>Generate branch · 10 coins</button>
            {branch && <p style={{ marginBottom: 0, color: '#ddd', fontSize: '13px', lineHeight: 1.6 }}>{branch}</p>}
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>♫ Story Mood Soundtrack</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>A focused ambient layer tuned to {story.genre || 'this story'}.</p>
            <button type="button" onClick={() => { setSoundtrackOn(!soundtrackOn); showToast(soundtrackOn ? 'Soundtrack paused.' : 'Soundtrack mode enabled.', 'info'); }} style={{ ...tabButton(soundtrackOn), width: '100%' }}>
              {soundtrackOn ? 'Pause ambience' : 'Play ambience'}
            </button>
            <p style={{ color: '#71717a', fontSize: '12px', marginBottom: 0 }}>Audio delivery is prepared as a client-side preference for the production soundtrack library.</p>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>◷ Live Story Event</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>The next community choice drop opens Friday at 8:00 PM WAT.</p>
            <button type="button" onClick={() => { localStorage.setItem(`nive_event_rsvp_${story.id}`, 'true'); showToast('You are on the live-event list.', 'success'); }} style={{ ...tabButton(true), width: '100%' }}>Reserve my place</button>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>⌘ Story Universe Map</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>{chapters.length} chapters mapped from your current story universe.</p>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', overflowX: 'auto', padding: '8px 0' }}>
              {chapters.map((chapter, index) => <React.Fragment key={chapter.id}><button type="button" onClick={() => navigate(`/reader/${story.id}/${chapter.id}`)} title={chapter.title} style={{ minWidth: '32px', height: '32px', borderRadius: '50%', border: 'none', background: index === 0 ? '#e50914' : 'rgba(168,85,247,0.65)', color: '#fff', cursor: 'pointer' }}>{index + 1}</button>{index < chapters.length - 1 && <span style={{ color: '#71717a' }}>—</span>}</React.Fragment>)}
            </div>
          </section>
        </div>}

        {activeTab === 'community' && <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>💬 Reader Reactions & Annotations</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>{['🔥', '😭', '🤯', '❤️'].map(emoji => <button key={emoji} type="button" onClick={() => setReaction(emoji)} style={{ ...tabButton(reaction === emoji), padding: '7px 10px' }}>{emoji}</button>)}</div>
            <textarea value={annotation} onChange={event => setAnnotation(event.target.value)} placeholder={`Leave a ${reaction} reaction or annotation…`} rows={3} style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', color: '#fff', border: '1px solid #343640', borderRadius: '10px', padding: '10px' }} />
            <button type="button" onClick={saveAnnotation} style={{ ...tabButton(true), width: '100%', marginTop: '10px' }}>Save annotation</button>
            {annotations.slice(0, 3).map(item => <p key={item.createdAt} style={{ color: '#d4d4d8', fontSize: '13px', borderTop: '1px solid #292a32', paddingTop: '8px' }}><strong>{item.author}</strong> · {item.text}</p>)}
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>▥ Choice Analytics</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>Reader community choice distribution.</p>
            {choiceStats.length ? choiceStats.map(choice => <div key={choice.label} style={{ margin: '12px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{choice.label}</span><strong>{choice.percent}%</strong></div><div style={{ height: '7px', background: '#282a31', borderRadius: '10px', marginTop: '5px' }}><div style={{ width: `${choice.percent}%`, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg, #e50914, #a855f7)' }} /></div></div>) : <p style={{ color: '#71717a', fontSize: '13px' }}>Add branching choices to unlock analytics.</p>}
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>✎ Co-Author Mode</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>Pitch a community-written sequel or spin-off for review.</p>
            <textarea value={coAuthorIdea} onChange={event => setCoAuthorIdea(event.target.value)} rows={4} placeholder="Your next chapter idea…" style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', color: '#fff', border: '1px solid #343640', borderRadius: '10px', padding: '10px' }} />
            <button type="button" onClick={submitCoAuthorIdea} style={{ ...tabButton(true), width: '100%', marginTop: '10px' }}>Submit chapter pitch</button>
          </section>
        </div>}

        {activeTab === 'rewards' && <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>⚡ Reading Streaks with Rewards</h2>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#fbbf24' }}>{user.streak || 0} days</div>
            <p style={{ color: '#aaa', fontSize: '13px' }}>Finish a chapter today to protect your streak. Every 7 consecutive days unlocks a 25-coin reward.</p>
            <div style={{ color: '#d4d4d8', fontSize: '13px' }}>Next reward: {Math.max(1, 7 - ((user.streak || 0) % 7))} day(s) away</div>
          </section>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>🎁 Gift Coins</h2>
            <input value={giftEmail} onChange={event => setGiftEmail(event.target.value)} placeholder="Reader email" type="email" style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', color: '#fff', border: '1px solid #343640', borderRadius: '10px', padding: '10px' }} />
            <input value={giftCoins} onChange={event => setGiftCoins(Number(event.target.value))} min={1} type="number" style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', color: '#fff', border: '1px solid #343640', borderRadius: '10px', padding: '10px', marginTop: '10px' }} />
            <button type="button" onClick={sendGift} style={{ ...tabButton(true), width: '100%', marginTop: '10px' }}>Send {giftCoins || 0} coins</button>
          </section>
        </div>}

        {activeTab === 'creator' && <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>✦ Author Profiles & Revenue Share</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>Apply to publish interactive stories and participate in the creator revenue program.</p>
            <textarea value={authorPitch} onChange={event => setAuthorPitch(event.target.value)} rows={4} placeholder="Tell us about your story world and writing experience…" style={{ width: '100%', boxSizing: 'border-box', background: '#1a1b22', color: '#fff', border: '1px solid #343640', borderRadius: '10px', padding: '10px' }} />
            <button type="button" onClick={submitAuthorPitch} style={{ ...tabButton(true), width: '100%', marginTop: '10px' }}>Apply as an author</button>
          </section>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: '17px' }}>▣ Creator Earnings Preview</h2>
            <p style={{ color: '#aaa', fontSize: '13px' }}>MVP ledger preview for approved authors.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}><div style={{ background: '#1a1b22', borderRadius: '10px', padding: '12px' }}><small style={{ color: '#888' }}>Story unlocks</small><strong style={{ display: 'block', fontSize: '22px' }}>0</strong></div><div style={{ background: '#1a1b22', borderRadius: '10px', padding: '12px' }}><small style={{ color: '#888' }}>Revenue share</small><strong style={{ display: 'block', fontSize: '22px' }}>₦0</strong></div></div>
          </section>
        </div>}
      </div>
    </main>
  );
};
