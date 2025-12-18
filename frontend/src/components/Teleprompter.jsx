import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { parseSongXML, formatContentWithChords } from '../utils/xmlParser';
import { useScrollEngine } from '../hooks/useScrollEngine';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export default function Teleprompter() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNewSongForm, setShowNewSongForm] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongContent, setNewSongContent] = useState('');

  const sections = selectedSong ? parseSongXML(selectedSong.content) : [];
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  
  const {
    scrollContainerRef,
    contentRef,
    currentSectionIndex,
    reset
  } = useScrollEngine(sections, isPlaying, (completedIndex) => {
    // When song completes, stop playback
    if (completedIndex >= sectionsRef.current.length - 1) {
      setIsPlaying(false);
    }
  });

  // Debug: Test scroll when container is ready (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && scrollContainerRef.current && contentRef.current && sections.length > 0) {
      const container = scrollContainerRef.current;
      
      // Wait a bit for layout
      setTimeout(() => {
        // Only log if there's an issue
        if (container.scrollHeight <= container.clientHeight) {
          console.warn('Container cannot scroll:', {
            containerScrollHeight: container.scrollHeight,
            containerClientHeight: container.clientHeight
          });
        }
      }, 500);
    }
  }, [scrollContainerRef, contentRef, sections.length]);

  // Fetch songs on mount
  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await fetch(`${API_URL}/songs`);
      const data = await response.json();
      setSongs(data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleCreateSong = async () => {
    if (!newSongTitle.trim() || !newSongContent.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSongTitle,
          content: newSongContent
        })
      });
      const song = await response.json();
      setSongs([song, ...songs]);
      setSelectedSong(song);
      setNewSongTitle('');
      setNewSongContent('');
      setShowNewSongForm(false);
    } catch (error) {
      console.error('Error creating song:', error);
    }
  };

  const handleUpdateSong = async () => {
    if (!selectedSong || !editTitle.trim() || !editContent.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/songs/${selectedSong.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent
        })
      });
      const updatedSong = await response.json();
      setSongs(songs.map(s => s.id === updatedSong.id ? updatedSong : s));
      setSelectedSong(updatedSong);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating song:', error);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!confirm('Are you sure you want to delete this song?')) return;
    
    try {
      await fetch(`${API_URL}/songs/${songId}`, {
        method: 'DELETE'
      });
      setSongs(songs.filter(s => s.id !== songId));
      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const handlePlayPause = () => {
    if (!selectedSong) return;
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    reset();
  };

  const startEditing = () => {
    if (!selectedSong) return;
    setEditTitle(selectedSong.title);
    setEditContent(selectedSong.content);
    setIsEditing(true);
    setIsPlaying(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Smart Teleprompter</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Song List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Songs</h2>
                <button
                  onClick={() => setShowNewSongForm(!showNewSongForm)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <Plus size={20} />
                </button>
              </div>

              {showNewSongForm && (
                <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    placeholder="Song Title"
                    value={newSongTitle}
                    onChange={(e) => setNewSongTitle(e.target.value)}
                    className="w-full mb-2 px-3 py-2 bg-gray-600 rounded text-white placeholder-gray-400"
                  />
                  <textarea
                    placeholder="XML Content"
                    value={newSongContent}
                    onChange={(e) => setNewSongContent(e.target.value)}
                    className="w-full mb-2 px-3 py-2 bg-gray-600 rounded text-white placeholder-gray-400 h-32 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateSong}
                      className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowNewSongForm(false);
                        setNewSongTitle('');
                        setNewSongContent('');
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedSong?.id === song.id
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => {
                      setSelectedSong(song);
                      setIsPlaying(false);
                      reset();
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{song.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(song.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSong(song.id);
                        }}
                        className="ml-2 p-1 hover:bg-red-600 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Teleprompter */}
          <div className="lg:col-span-3">
            {!selectedSong ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">Select a song or create a new one to start</p>
              </div>
            ) : isEditing ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 rounded text-white text-xl font-semibold"
                  />
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded text-white font-mono text-sm h-96"
                  placeholder="Enter XML content here..."
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleUpdateSong}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded flex items-center gap-2"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6">
                {/* Controls */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedSong.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {sections.length} sections • Current: {sections[currentSectionIndex]?.type || 'N/A'} 
                      ({sections[currentSectionIndex]?.bpm || 0} BPM, {sections[currentSectionIndex]?.bars || 0} bars)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={startEditing}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    <button
                      onClick={handleReset}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      title="Reset"
                    >
                      <RotateCcw size={24} />
                    </button>
                  </div>
                </div>

                {/* Teleprompter Display */}
                <div
                  ref={scrollContainerRef}
                  className="bg-black rounded-lg p-8 h-[600px] overflow-y-auto"
                  style={{ 
                    scrollBehavior: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    position: 'relative'
                  }}
                >
                  <div 
                    ref={contentRef} 
                    className="space-y-8"
                    style={{ minHeight: '100%' }}
                  >
                    {sections.map((section, index) => {
                      const formattedLines = formatContentWithChords(section.content);
                      const isActive = index === currentSectionIndex;
                      
                      return (
                        <div
                          key={index}
                          data-section-index={index}
                          className={`transition-all duration-300 ${
                            isActive ? 'opacity-100 scale-105' : 'opacity-60'
                          }`}
                        >
                          <div className="mb-4">
                            <span className="text-sm font-semibold text-blue-400 uppercase">
                              {section.type}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {section.bpm} BPM • {section.bars} bars
                            </span>
                          </div>
                          <div className="text-2xl leading-relaxed font-mono">
                            {formattedLines.map((line, lineIndex) => (
                              <div key={lineIndex} className="mb-3">
                                {line.map((part, partIndex) => (
                                  <span
                                    key={partIndex}
                                    className={
                                      part.type === 'chord'
                                        ? 'text-yellow-400 font-bold'
                                        : 'text-white'
                                    }
                                  >
                                    {part.type === 'chord' ? `[${part.content}]` : part.content}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

