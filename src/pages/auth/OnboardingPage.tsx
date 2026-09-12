import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../components/common/Toast';

const AVATARS = [
  { id: 'assets/avatars/avatar1.png', label: 'Shadow Knight', icon: 'shield_moon' },
  { id: 'assets/avatars/avatar2.png', label: 'Arcane Mage', icon: 'auto_awesome' },
  { id: 'assets/avatars/avatar3.png', label: 'Cyber Nomad', icon: 'terminal' },
  { id: 'assets/avatars/avatar4.png', label: 'Mystic Seer', icon: 'visibility' }
];

const GENRES = [
  { id: 'Fantasy', label: 'Fantasy', desc: 'Magic, mythical beasts & ancient realms', icon: 'magic_button' },
  { id: 'Sci-Fi', label: 'Sci-Fi', desc: 'Space operas, AI & future dystopias', icon: 'rocket_launch' },
  { id: 'Mystery', label: 'Mystery', desc: 'Thrilling detective plots & mind games', icon: 'psychology' },
  { id: 'Romance', label: 'Romance', desc: 'Passionate tales & emotional drama', icon: 'favorite' },
  { id: 'Adventure', label: 'Adventure', desc: 'Epic quests & perilous journeys', icon: 'explore' },
  { id: 'Thriller', label: 'Thriller', desc: 'Heart-pounding suspense & twists', icon: 'bolt' }
];

const READING_GOALS = [
  { minutes: 10, label: 'Casual Reader', desc: '10 mins / day', icon: 'local_cafe' },
  { minutes: 20, label: 'Bookworm', desc: '20 mins / day', icon: 'menu_book' },
  { minutes: 45, label: 'Story Devotee', desc: '45 mins / day', icon: 'military_tech' }
];

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Fantasy', 'Mystery']);
  const [selectedGoal, setSelectedGoal] = useState<number>(20);
  const [displayName, setDisplayName] = useState('');

  const { user, updateProfile, addCoins } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.length > 1 ? prev.filter(g => g !== genre) : prev
        : [...prev, genre]
    );
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleComplete = () => {
    updateProfile({
      username: displayName.trim() || user.username || 'Reader',
      avatar: selectedAvatar,
      onboardingComplete: true,
      readingGoals: {
        dailyChapters: Math.ceil(selectedGoal / 10),
        weeklyActiveDays: 4,
        monthlyPages: selectedGoal * 10
      }
    });

    // Give welcome reward
    addCoins(50);
    showToast('🎉 Welcome to Nive! +50 Bonus Coins added.', 'success');
    navigate('/home');
  };

  return (
    <div className="onboarding-page-wrapper">
      <div className="background-glow"></div>

      <div className="onboarding-shell">
        {/* TOP BRANDING & PROGRESS */}
        <div className="onboarding-header">
          <img src="assets/logos/logo.png" alt="NIVE" className="onboarding-logo" />
          
          <div className="step-tracker">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>
              <span>1</span>
              <p>Avatar</p>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>
              <span>2</span>
              <p>Genres</p>
            </div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>
              <span>3</span>
              <p>Goals</p>
            </div>
          </div>
        </div>

        {/* STEP 1: AVATAR & NAME */}
        {step === 1 && (
          <div className="onboarding-panel step-fade-in">
            <div className="panel-badge">STEP 1 OF 3</div>
            <h1>Choose Your Persona</h1>
            <p className="subtitle">Pick an avatar and tell us how you'd like fellow storytellers to address you.</p>

            <div className="onboarding-section">
              <label className="section-label">Select Avatar</label>
              <div className="avatar-grid">
                {AVATARS.map(av => {
                  const isSelected = selectedAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      className={`avatar-choice ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(av.id)}
                    >
                      <div className="avatar-img-wrap">
                        <img src={av.id} alt={av.label} />
                        {isSelected && (
                          <span className="material-symbols-outlined check-badge">check_circle</span>
                        )}
                      </div>
                      <span className="avatar-name">{av.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="onboarding-section">
              <label htmlFor="nameInput" className="section-label">Your Reader Name</label>
              <div className="name-input-box">
                <span className="material-symbols-outlined">badge</span>
                <input
                  id="nameInput"
                  type="text"
                  placeholder={user.username || 'e.g. ShadowWeaver'}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={24}
                />
              </div>
            </div>

            <div className="action-row">
              <button
                type="button"
                className="btn-next"
                onClick={handleNext}
              >
                <span>Continue to Genres</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: GENRE PREFERENCES */}
        {step === 2 && (
          <div className="onboarding-panel step-fade-in">
            <div className="panel-badge">STEP 2 OF 3</div>
            <h1>Select Your Genres</h1>
            <p className="subtitle">Choose stories that match your vibe. You can adjust this anytime in your Library.</p>

            <div className="genre-grid-rich">
              {GENRES.map(g => {
                const isSelected = selectedGenres.includes(g.id);
                return (
                  <div
                    key={g.id}
                    className={`genre-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleGenre(g.id)}
                  >
                    <div className="genre-icon-wrap">
                      <span className="material-symbols-outlined">{g.icon}</span>
                    </div>
                    <div className="genre-content">
                      <div className="genre-title">{g.label}</div>
                      <div className="genre-desc">{g.desc}</div>
                    </div>
                    <div className={`genre-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <span className="material-symbols-outlined">check</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="action-row">
              <button
                type="button"
                className="btn-back"
                onClick={handleBack}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Back</span>
              </button>

              <button
                type="button"
                className="btn-next"
                onClick={handleNext}
              >
                <span>Continue ({selectedGenres.length} Selected)</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DAILY READING GOAL & REWARD */}
        {step === 3 && (
          <div className="onboarding-panel step-fade-in">
            <div className="panel-badge">STEP 3 OF 3</div>
            <h1>Set Your Daily Habit</h1>
            <p className="subtitle">Reading just a few minutes a day unlocks daily XP streaks and bonus coins.</p>

            <div className="goals-grid">
              {READING_GOALS.map(goal => {
                const isSelected = selectedGoal === goal.minutes;
                return (
                  <div
                    key={goal.minutes}
                    className={`goal-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedGoal(goal.minutes)}
                  >
                    <span className="material-symbols-outlined goal-icon">{goal.icon}</span>
                    <div className="goal-label">{goal.label}</div>
                    <div className="goal-mins">{goal.desc}</div>
                    {isSelected && (
                      <div className="goal-selected-pill">Active Target</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* WELCOME REWARD CARD */}
            <div className="reward-banner">
              <div className="reward-icon">🎁</div>
              <div className="reward-text">
                <div className="reward-title">+50 Welcome Coins Ready!</div>
                <div className="reward-subtitle">Claim your starter pack to unlock premium choices and story chapters.</div>
              </div>
            </div>

            <div className="action-row">
              <button
                type="button"
                className="btn-back"
                onClick={handleBack}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Back</span>
              </button>

              <button
                type="button"
                className="btn-complete"
                onClick={handleComplete}
              >
                <span>Claim Reward & Enter Nive</span>
                <span className="material-symbols-outlined">stars</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
