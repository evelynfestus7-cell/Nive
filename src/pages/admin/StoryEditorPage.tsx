import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getStory, 
  getChapters, 
  saveStoryToFirestore, 
  saveChapterToFirestore, 
  deleteChapterRecord 
} from '../../services/database';
import { useToast } from '../../components/common/Toast';
import { Story, Chapter, Choice } from '../../types';

// Preset cover images for quick 1-click selection
const PRESET_COVERS = [
  'assets/covers/story1.png',
  'assets/covers/story2.png',
  'assets/covers/story3.png',
  'assets/covers/story4.png',
  'assets/covers/story5.png',
  'assets/covers/default.png'
];

export const StoryEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isNew = !id || id === 'new';

  const [story, setStory] = useState<Story>({
    id: isNew ? `story-${Date.now()}` : id,
    title: '',
    author: 'Admin',
    description: '',
    genre: 'Fantasy',
    coverImage: 'assets/covers/default.png',
    bannerImage: 'assets/covers/default.png',
    status: 'ongoing',
    rating: 5.0,
    featured: false,
    trending: false,
    coinsRequired: 0,
    tags: []
  });

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState<'details' | 'chapters' | 'branching' | 'ai_parser'>('details');

  // AI Parser State
  const [rawTextToParse, setRawTextToParse] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{ storyMeta?: Partial<Story>; chapters: Chapter[] } | null>(null);

  // Image Upload Refs
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([getStory(id), getChapters(id)]).then(([s, chs]) => {
        if (s) setStory(s);
        if (chs && chs.length > 0) setChapters(chs);
        setLoading(false);
      });
    }
  }, [id, isNew]);

  // Handle File Upload (Image to Base64 data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'bannerImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP)', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image is larger than 5MB. Compressing...', 'info');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setStory(prev => ({ ...prev, [field]: result }));
        showToast(`${field === 'coverImage' ? 'Cover' : 'Banner'} image uploaded!`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save entire story metadata
  const handleSaveStory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!story.title.trim()) {
      showToast('Story title is required', 'warning');
      setActiveTab('details');
      return;
    }

    try {
      await saveStoryToFirestore({ ...story, totalChapters: chapters.length });
      showToast('Story details saved successfully!', 'success');
      if (isNew) {
        navigate(`/admin/stories/edit/${story.id}`);
      }
    } catch (err: any) {
      showToast(`Error saving story: ${err.message}`, 'error');
    }
  };

  // Add new chapter
  const handleAddChapter = () => {
    const chapterNum = chapters.length + 1;
    const newCh: Chapter = {
      id: `${story.id}--ch-${Date.now()}`,
      storyId: story.id,
      title: `Chapter ${chapterNum}: New Chapter`,
      order: chapterNum,
      content: '<p>Write your interactive story content here...</p>',
      wordCount: 0,
      coinsCost: 0,
      choices: []
    };
    setEditingChapter(newCh);
  };

  // Save single chapter in modal
  const handleSaveChapterModal = async () => {
    if (!editingChapter) return;
    if (!editingChapter.title.trim()) {
      showToast('Chapter title is required', 'warning');
      return;
    }

    const wordCount = editingChapter.content
      ? editingChapter.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
      : 0;

    const chapterToSave: Chapter = {
      ...editingChapter,
      wordCount
    };

    try {
      await saveChapterToFirestore(story.id, chapterToSave);
      setChapters(prev => {
        const exists = prev.some(c => c.id === chapterToSave.id);
        const updated = exists
          ? prev.map(c => (c.id === chapterToSave.id ? chapterToSave : c))
          : [...prev, chapterToSave];
        return updated.sort((a, b) => (a.order || 0) - (b.order || 0));
      });
      setEditingChapter(null);
      showToast('Chapter saved to Supabase!', 'success');
    } catch (err: any) {
      showToast(`Error saving chapter: ${err.message}`, 'error');
    }
  };

  // Delete chapter
  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Delete this chapter and its branching choices?')) return;
    try {
      await deleteChapterRecord(story.id, chapterId);
      setChapters(prev => prev.filter(c => c.id !== chapterId));
      showToast('Chapter deleted', 'info');
    } catch (err: any) {
      showToast('Failed to delete chapter', 'error');
    }
  };

  // AI Story & Chapter Parser Logic
  const handleRunAiParser = () => {
    if (!rawTextToParse.trim()) {
      showToast('Please paste story text or manuscript to parse', 'warning');
      return;
    }

    setIsParsing(true);
    try {
      const text = rawTextToParse;
      const lines = text.split('\n');
      
      let parsedTitle = story.title;
      let parsedAuthor = story.author;
      let parsedGenre = story.genre;
      let parsedDesc = story.description;

      // Extract metadata headers if present
      for (const line of lines.slice(0, 10)) {
        const titleMatch = line.match(/^(?:Title|Story Title)\s*:\s*(.+)/i);
        if (titleMatch) parsedTitle = titleMatch[1].trim();

        const authorMatch = line.match(/^(?:Author|Writer)\s*:\s*(.+)/i);
        if (authorMatch) parsedAuthor = authorMatch[1].trim();

        const genreMatch = line.match(/^(?:Genre)\s*:\s*(.+)/i);
        if (genreMatch) parsedGenre = genreMatch[1].trim();

        const descMatch = line.match(/^(?:Description|Synopsis|Summary)\s*:\s*(.+)/i);
        if (descMatch) parsedDesc = descMatch[1].trim();
      }

      // Split into chapters by looking for Chapter headings
      // e.g., "Chapter 1:", "--- Chapter 2 ---", "# Chapter 3", etc.
      const chapterSplits = text.split(/(?:^|\n)(?=(?:---|===|#+)?\s*Chapter\s+\d+|(?:\bChapter\s+\d+[:\s]))/i);
      
      const parsedChapters: Chapter[] = [];
      let chapterIndex = 1;

      for (const chunk of chapterSplits) {
        const trimmed = chunk.trim();
        if (!trimmed || (!trimmed.match(/Chapter/i) && chapterSplits.length > 1 && chapterIndex === 1)) {
          // If introductory description chunk
          if (trimmed.length > 20 && !parsedDesc) {
            parsedDesc = trimmed.slice(0, 300);
          }
          continue;
        }

        const chunkLines = trimmed.split('\n');
        const firstLine = chunkLines[0].replace(/^[#\-=\s]+|[#\-=\s]+$/g, '').trim();
        const chapterTitle = firstLine.match(/Chapter/i) ? firstLine : `Chapter ${chapterIndex}: ${firstLine}`;

        const bodyLines: string[] = [];
        const choices: Choice[] = [];

        for (let i = 1; i < chunkLines.length; i++) {
          const l = chunkLines[i].trim();
          if (!l) continue;

          // Detect branching choice format: [Choice: Text -> Chapter X | cost]
          const choiceMatch = l.match(/\[(?:Choice|Option)\s*:\s*([^->|\]]+)(?:->\s*([^|\]]+))?(?:\|\s*(\d+)\s*coins?)?\]/i) ||
                              l.match(/^(?:[-*]|\d+\.)\s*\[(.*?)\](?:\((.*?)\))?/);

          if (choiceMatch) {
            const choiceText = (choiceMatch[1] || '').trim();
            const target = (choiceMatch[2] || '').trim();
            const cost = Number(choiceMatch[3] || 0);

            choices.push({
              text: choiceText,
              nextChapterId: target ? `${story.id}--${target.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '',
              coinsCost: cost
            });
          } else {
            bodyLines.push(`<p>${l}</p>`);
          }
        }

        const chapterContent = bodyLines.length > 0 ? bodyLines.join('') : `<p>${trimmed}</p>`;
        const chId = `${story.id}--ch-${chapterIndex}`;

        parsedChapters.push({
          id: chId,
          storyId: story.id,
          title: chapterTitle,
          order: chapterIndex,
          content: chapterContent,
          wordCount: chapterContent.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length,
          coinsCost: chapterIndex === 1 ? 0 : 5,
          choices
        });

        chapterIndex++;
      }

      setParsedPreview({
        storyMeta: {
          title: parsedTitle || story.title,
          author: parsedAuthor || story.author,
          genre: parsedGenre || story.genre,
          description: parsedDesc || story.description
        },
        chapters: parsedChapters
      });

      showToast(`AI Parser found ${parsedChapters.length} chapters & branching choices!`, 'success');
    } catch (e: any) {
      showToast(`Parser error: ${e.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Apply parsed story data
  const handleApplyParsedData = async () => {
    if (!parsedPreview) return;

    if (parsedPreview.storyMeta) {
      setStory(prev => ({
        ...prev,
        ...parsedPreview.storyMeta
      }));
    }

    if (parsedPreview.chapters.length > 0) {
      setChapters(parsedPreview.chapters);
      for (const ch of parsedPreview.chapters) {
        await saveChapterToFirestore(story.id, ch);
      }
    }

    await saveStoryToFirestore({
      ...story,
      ...parsedPreview.storyMeta,
      totalChapters: parsedPreview.chapters.length
    });

    setParsedPreview(null);
    setRawTextToParse('');
    setActiveTab('chapters');
    showToast('All parsed chapters and choices imported & saved!', 'success');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#888' }}>
        Loading story details...
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '30px 16px 100px', maxWidth: '1020px', margin: '0 auto' }}>
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button
            onClick={() => navigate('/admin/stories')}
            style={{ background: 'transparent', border: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '8px' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Back to Stories List</span>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
            {isNew ? '✨ Create New Story' : `✏️ Edit Story: ${story.title || 'Untitled'}`}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleSaveStory()}
            className="btn"
            style={{ background: 'linear-gradient(135deg, #E50914, #b20710)', padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(229, 9, 20, 0.4)' }}
          >
            <span className="material-symbols-outlined">save</span>
            <span>Save Story</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'details' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'details' ? '2px solid #E50914' : '2px solid transparent',
            color: activeTab === 'details' ? '#fff' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
          <span>Story Details & Media</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'chapters' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chapters' ? '2px solid #E50914' : '2px solid transparent',
            color: activeTab === 'chapters' ? '#fff' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>menu_book</span>
          <span>Chapters ({chapters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branching')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'branching' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'branching' ? '2px solid #E50914' : '2px solid transparent',
            color: activeTab === 'branching' ? '#fff' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_tree</span>
          <span>Branching Diagram</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai_parser')}
          style={{
            padding: '10px 18px',
            background: activeTab === 'ai_parser' ? 'rgba(239,68,68,0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'ai_parser' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTab === 'ai_parser' ? '#ff6b6b' : '#888',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
          <span>AI Story Parser</span>
        </button>
      </div>

      {/* TAB 1: STORY DETAILS & MEDIA */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveStory} style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Story Title *</label>
              <input
                type="text"
                value={story.title}
                onChange={e => setStory({ ...story, title: e.target.value })}
                placeholder="e.g. Shadows of the Midnight Throne"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Author Name</label>
              <input
                type="text"
                value={story.author}
                onChange={e => setStory({ ...story, author: e.target.value })}
                placeholder="Author Name"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Genre</label>
              <select
                value={story.genre}
                onChange={e => setStory({ ...story, genre: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              >
                <option>Fantasy</option>
                <option>Romance</option>
                <option>Sci-Fi</option>
                <option>Mystery</option>
                <option>Thriller</option>
                <option>Adventure</option>
                <option>Horror</option>
                <option>Supernatural</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Status</label>
              <select
                value={story.status}
                onChange={e => setStory({ ...story, status: e.target.value as any })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Story Unlock Cost (Coins)</label>
              <input
                type="number"
                value={story.coinsRequired || 0}
                onChange={e => setStory({ ...story, coinsRequired: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
              />
            </div>
          </div>

          {/* MEDIA / IMAGE UPLOADS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', margin: '24px 0', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* COVER IMAGE */}
            <div>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ color: '#E50914' }}>image</span>
                <span>Cover Photo (Portrait 3:4)</span>
              </label>

              <div style={{ display: 'flex', gap: '14px', marginTop: '12px', alignItems: 'center' }}>
                <img
                  src={story.coverImage || 'assets/covers/default.png'}
                  alt="Cover Preview"
                  style={{ width: '90px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: '#222' }}
                  onError={(e) => { (e.target as any).src = 'assets/covers/default.png'; }}
                />

                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    ref={coverFileInputRef}
                    onChange={(e) => handleImageUpload(e, 'coverImage')}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    style={{ background: '#E50914', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                    <span>Upload Cover Photo</span>
                  </button>

                  <input
                    type="text"
                    value={story.coverImage}
                    onChange={e => setStory({ ...story, coverImage: e.target.value })}
                    placeholder="Or paste image URL"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Preset selector */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Quick Presets:</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {PRESET_COVERS.map((preset, i) => (
                    <img
                      key={i}
                      src={preset}
                      alt={`Preset ${i}`}
                      onClick={() => setStory({ ...story, coverImage: preset })}
                      style={{ width: '32px', height: '42px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: story.coverImage === preset ? '2px solid #E50914' : '1px solid rgba(255,255,255,0.1)' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* BANNER BACKGROUND IMAGE */}
            <div>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ color: '#06b6d4' }}>wallpaper</span>
                <span>Banner / Background (Landscape 16:9)</span>
              </label>

              <div style={{ display: 'flex', gap: '14px', marginTop: '12px', alignItems: 'center' }}>
                <img
                  src={story.bannerImage || story.coverImage || 'assets/covers/default.png'}
                  alt="Banner Preview"
                  style={{ width: '130px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: '#222' }}
                  onError={(e) => { (e.target as any).src = 'assets/covers/default.png'; }}
                />

                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={(e) => handleImageUpload(e, 'bannerImage')}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    style={{ background: '#06b6d4', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                    <span>Upload Banner Image</span>
                  </button>

                  <input
                    type="text"
                    value={story.bannerImage || ''}
                    onChange={e => setStory({ ...story, bannerImage: e.target.value })}
                    placeholder="Or paste banner image URL"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#ccc' }}>Synopsis / Description</label>
            <textarea
              rows={4}
              value={story.description}
              onChange={e => setStory({ ...story, description: e.target.value })}
              placeholder="Enter a compelling description that draws readers into the interactive choices..."
              style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '6px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={story.featured || false}
                onChange={e => setStory({ ...story, featured: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#E50914' }}
              />
              <span>Feature on Home Banner</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={story.trending || false}
                onChange={e => setStory({ ...story, trending: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
              />
              <span>Mark as Trending Story</span>
            </label>
          </div>
        </form>
      )}

      {/* TAB 2: CHAPTERS LIST & MANAGER */}
      {activeTab === 'chapters' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                Interactive Story Chapters ({chapters.length})
              </h2>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
                Manage episodes, branch points, choices, and coin requirements.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddChapter}
              className="btn"
              style={{ background: '#E50914', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <span className="material-symbols-outlined">add</span>
              <span>Add Chapter</span>
            </button>
          </div>

          {chapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#111', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.15)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#666', marginBottom: '12px' }}>auto_stories</span>
              <h3 style={{ color: '#fff', margin: '0 0 8px 0' }}>No chapters created yet</h3>
              <p style={{ color: '#888', fontSize: '14px', maxWidth: '400px', margin: '0 auto 16px' }}>
                You can add chapters manually or use the AI Story Parser to import your entire manuscript in one click!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={handleAddChapter} className="btn" style={{ padding: '8px 16px' }}>+ Add First Chapter</button>
                <button onClick={() => setActiveTab('ai_parser')} className="btn ghost" style={{ padding: '8px 16px', color: '#ff6b6b' }}>⚡ Open AI Parser</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderRadius: '14px',
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(229, 9, 20, 0.15)', border: '1px solid rgba(229, 9, 20, 0.3)', display: 'grid', placeItems: 'center', color: '#E50914', fontWeight: 800, fontSize: '14px' }}>
                      {ch.order || idx + 1}
                    </div>

                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{ch.title}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', display: 'flex', gap: '12px' }}>
                        <span>📝 {ch.wordCount || 0} words</span>
                        <span>🔀 {(ch.choices || []).length} decision branches</span>
                        <span>{ch.coinsCost ? `🪙 ${ch.coinsCost} coins` : '🆓 Free Chapter'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setEditingChapter(ch)}
                      style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteChapter(ch.id)}
                      style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}
                      title="Delete chapter"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VISUAL BRANCHING DIAGRAM */}
      {activeTab === 'branching' && (
        <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#E50914' }}>account_tree</span>
            <span>Interactive Story Flow & Branching Map</span>
          </h2>

          <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
            Below is the sequence of chapters and decision paths available to readers.
          </p>

          {chapters.length === 0 ? (
            <p style={{ color: '#666' }}>Add chapters first to visualize decision paths.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chapters.map((ch, i) => (
                <div key={ch.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ background: '#E50914', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      NODE {ch.order || i + 1}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{ch.title}</span>
                  </div>

                  {(!ch.choices || ch.choices.length === 0) ? (
                    <div style={{ fontSize: '13px', color: '#888', paddingLeft: '16px', fontStyle: 'italic' }}>
                      ➜ Linear flow (proceeds to next chapter)
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px' }}>
                      {ch.choices.map((choice, cIdx) => {
                        const targetCh = chapters.find(c => c.id === choice.nextChapterId || c.id.replace(`${story.id}--`, '') === choice.nextChapterId);
                        return (
                          <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #06b6d4' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#06b6d4' }}>call_split</span>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>"{choice.text}"</span>
                            <span style={{ color: '#888', fontSize: '12px' }}>➔ Leads to:</span>
                            <span style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                              {targetCh ? targetCh.title : choice.nextChapterId || 'End of Branch'}
                            </span>
                            {choice.coinsCost ? (
                              <span style={{ fontSize: '11px', color: '#fbbf24', marginLeft: 'auto' }}>🪙 {choice.coinsCost} coins</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI STORY PARSER & BULK IMPORTER */}
      {activeTab === 'ai_parser' && (
        <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '28px' }}>auto_awesome</span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>AI Story & Manuscript Parser</h2>
          </div>

          <p style={{ color: '#aaa', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
            Paste your raw novel, script, or markdown chapters below. The AI Parser automatically extracts story metadata, chapter titles, paragraphs, and branching choices in one go.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', color: '#ccc', fontWeight: 600 }}>Raw Manuscript / Prompt Text:</label>
              <button
                type="button"
                onClick={() => setRawTextToParse(`Title: The Obsidian Key
Author: Evelyn
Genre: Fantasy
Description: A legendary portal opens for those who dare to seek the obsidian key.

Chapter 1: The Whispering Gate
Eka stood before the ancient archway carved with forgotten runes. The air smelled of ozone and damp stone.
[Choice: Step into the portal -> Chapter 2 | 0 coins]
[Choice: Search the stone pedestals -> Chapter 3 | 5 coins]

Chapter 2: The Hall of Whispers
A thousand voices call your name from the darkness. You find an ancient glowing tablet.
[Choice: Read the inscription -> Chapter 4 | 0 coins]
[Choice: Smash the tablet -> Chapter 5 | 10 coins]

Chapter 3: The Hidden Vault
You uncover a secret stash left by the ancient wardens.`)}
                style={{ background: 'transparent', border: 'none', color: '#E50914', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Insert Sample Template
              </button>
            </div>

            <textarea
              rows={12}
              value={rawTextToParse}
              onChange={e => setRawTextToParse(e.target.value)}
              placeholder={`Title: Your Story Title\nAuthor: Your Name\nGenre: Fantasy\n\nChapter 1: The First Sign\nStory paragraphs go here...\n[Choice: Step through door -> Chapter 2]\n[Choice: Turn around -> Chapter 3]\n\nChapter 2: The Secret Path\nNext episode content...`}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={handleRunAiParser}
              disabled={isParsing || !rawTextToParse.trim()}
              className="btn"
              style={{ background: 'linear-gradient(135deg, #E50914, #990000)', padding: '12px 24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>{isParsing ? 'Parsing Manuscript...' : '⚡ Parse & Structure Story'}</span>
            </button>
          </div>

          {/* PARSER PREVIEW */}
          {parsedPreview && (
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(168,85,247,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>Successfully Parsed {parsedPreview.chapters.length} Chapters</span>
                </h3>

                <button
                  type="button"
                  onClick={handleApplyParsedData}
                  className="btn"
                  style={{ background: '#22c55e', color: '#000', fontWeight: 800, padding: '8px 18px' }}
                >
                  ✓ Confirm & Import into Story
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {parsedPreview.chapters.map((ch, i) => (
                  <div key={i} style={{ background: '#18181b', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{ch.title}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      {ch.wordCount} words • {ch.choices?.length || 0} choices
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHAPTER EDIT MODAL */}
      {editingChapter && (
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
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.15)',
              maxWidth: '750px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                Edit Chapter: {editingChapter.title}
              </h3>
              <button
                onClick={() => setEditingChapter(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Chapter Title</label>
                <input
                  type="text"
                  value={editingChapter.title}
                  onChange={e => setEditingChapter({ ...editingChapter, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Unlock Cost (Coins)</label>
                <input
                  type="number"
                  value={editingChapter.coinsCost || 0}
                  onChange={e => setEditingChapter({ ...editingChapter, coinsCost: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Chapter Order #</label>
                <input
                  type="number"
                  value={editingChapter.order || 1}
                  onChange={e => setEditingChapter({ ...editingChapter, order: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Chapter Story Body</label>
                <span style={{ fontSize: '11px', color: '#888' }}>HTML paragraphs supported</span>
              </div>
              <textarea
                rows={8}
                value={editingChapter.content}
                onChange={e => setEditingChapter({ ...editingChapter, content: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'monospace', fontSize: '13px' }}
              />
            </div>

            {/* BRANCHING CHOICES SECTION */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#06b6d4', fontSize: '18px' }}>call_split</span>
                  <span>Reader Choices at End of Chapter ({(editingChapter.choices || []).length})</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const updatedChoices = [...(editingChapter.choices || []), { text: 'New Choice', nextChapterId: '', coinsCost: 0 }];
                    setEditingChapter({ ...editingChapter, choices: updatedChoices });
                  }}
                  style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Add Choice
                </button>
              </div>

              {(!editingChapter.choices || editingChapter.choices.length === 0) ? (
                <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                  No choices added. This chapter will proceed linearly to the next chapter.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {editingChapter.choices.map((choice, cIdx) => (
                    <div key={cIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '8px', alignItems: 'center', background: '#111', padding: '10px', borderRadius: '8px' }}>
                      <input
                        type="text"
                        placeholder="Choice Button Text (e.g. Follow the clue)"
                        value={choice.text}
                        onChange={e => {
                          const list = [...(editingChapter.choices || [])];
                          list[cIdx].text = e.target.value;
                          setEditingChapter({ ...editingChapter, choices: list });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                      />

                      <select
                        value={choice.nextChapterId}
                        onChange={e => {
                          const list = [...(editingChapter.choices || [])];
                          list[cIdx].nextChapterId = e.target.value;
                          setEditingChapter({ ...editingChapter, choices: list });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '6px', background: '#222', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                      >
                        <option value="">-- Leads to Next Chapter --</option>
                        {chapters.filter(c => c.id !== editingChapter.id).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Coins (0)"
                        value={choice.coinsCost || 0}
                        onChange={e => {
                          const list = [...(editingChapter.choices || [])];
                          list[cIdx].coinsCost = Number(e.target.value);
                          setEditingChapter({ ...editingChapter, choices: list });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', fontSize: '12px' }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const list = (editingChapter.choices || []).filter((_, i) => i !== cIdx);
                          setEditingChapter({ ...editingChapter, choices: list });
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Remove choice"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditingChapter(null)} className="btn ghost" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleSaveChapterModal} className="btn" style={{ flex: 1, background: '#E50914' }}>
                Save Chapter Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
