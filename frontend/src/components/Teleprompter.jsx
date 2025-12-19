import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight, Menu, Maximize2, Minimize2 } from 'lucide-react';
import { parseSongXML, formatContentWithChords } from '../utils/xmlParser';
import { useScrollEngine } from '../hooks/useScrollEngine';

// BPM Visual Indicator Component - Discreet pulsing red circle
function BPMIndicator({ bpm, isPlaying }) {
  const intervalRef = useRef(null);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (isPlaying && bpm > 0) {
      // Calculate interval in milliseconds (60 seconds / BPM * 1000ms)
      const interval = (60 / bpm) * 1000;
      
      setIsPulsing(true);
      intervalRef.current = setInterval(() => {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 100);
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsPulsing(false);
    }
  }, [bpm, isPlaying]);

  if (!isPlaying || bpm === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full bg-red-500"
        style={{
          opacity: isPulsing ? 1 : 0.4,
          transform: isPulsing ? 'scale(1.5)' : 'scale(1)',
          transition: 'all 0.1s ease-out',
          boxShadow: isPulsing ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none'
        }}
      />
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export default function Teleprompter() {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('songs'); // 'songs' or 'playlists'
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNewSongForm, setShowNewSongForm] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongContent, setNewSongContent] = useState('');
  const [showNewPlaylistForm, setShowNewPlaylistForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const sections = selectedSong ? parseSongXML(selectedSong.content) : [];
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  
  const {
    scrollContainerRef,
    contentRef,
    currentSectionIndex,
    reset
  } = useScrollEngine(sections, isPlaying, (completedIndex) => {
    // When song completes, check if we're in a playlist
    if (completedIndex >= sectionsRef.current.length - 1) {
      if (selectedPlaylist && currentPlaylistIndex < selectedPlaylist.songs.length - 1) {
        // Move to next song in playlist
        const nextIndex = currentPlaylistIndex + 1;
        setCurrentPlaylistIndex(nextIndex);
        setSelectedSong(selectedPlaylist.songs[nextIndex]);
        reset();
        // Auto-play next song
        setTimeout(() => setIsPlaying(true), 100);
      } else {
        // End of playlist or single song
        setIsPlaying(false);
      }
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

  // Fetch songs and playlists on mount
  useEffect(() => {
    fetchSongs();
    fetchPlaylists();
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

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`${API_URL}/playlists`);
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
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
    setCurrentPlaylistIndex(0);
    reset();
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist.songs.length === 0) return;
    setSelectedPlaylist(playlist);
    setCurrentPlaylistIndex(0);
    setSelectedSong(playlist.songs[0]);
    setIsPlaying(true);
    reset();
  };

  const handleNextSong = () => {
    if (selectedPlaylist && currentPlaylistIndex < selectedPlaylist.songs.length - 1) {
      const nextIndex = currentPlaylistIndex + 1;
      setCurrentPlaylistIndex(nextIndex);
      setSelectedSong(selectedPlaylist.songs[nextIndex]);
      reset();
      setIsPlaying(true);
    }
  };

  const handlePreviousSong = () => {
    if (selectedPlaylist && currentPlaylistIndex > 0) {
      const prevIndex = currentPlaylistIndex - 1;
      setCurrentPlaylistIndex(prevIndex);
      setSelectedSong(selectedPlaylist.songs[prevIndex]);
      reset();
      setIsPlaying(true);
    }
  };

  const handleCreatePlaylist = async () => {
    const nameToSave = newPlaylistName.trim();
    if (!nameToSave) return;
    
    try {
      console.log('Creating playlist with name:', nameToSave); // Debug
      const response = await fetch(`${API_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToSave })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create playlist');
      }
      
      const playlist = await response.json();
      console.log('Playlist created response:', playlist); // Debug
      
      // Ensure name is preserved
      if (!playlist.name) {
        console.warn('Playlist created without name, using provided name');
        playlist.name = nameToSave;
      }
      
      // Add songCount and songs array if not present
      const playlistWithDefaults = {
        ...playlist,
        name: playlist.name || nameToSave, // Ensure name is set
        songCount: 0,
        songs: []
      };
      
      console.log('Final playlist object:', playlistWithDefaults); // Debug
      setPlaylists([playlistWithDefaults, ...playlists]);
      setNewPlaylistName('');
      setShowNewPlaylistForm(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Error creating playlist: ' + error.message);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await fetch(`${API_URL}/playlists/${playlistId}`, {
        method: 'DELETE'
      });
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setSelectedSong(null);
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    try {
      await fetch(`${API_URL}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      });
      fetchPlaylists(); // Refresh playlists
    } catch (error) {
      console.error('Error adding song to playlist:', error);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId, songId) => {
    try {
      await fetch(`${API_URL}/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE'
      });
      fetchPlaylists(); // Refresh playlists
      if (selectedPlaylist?.id === playlistId) {
        const updated = await fetch(`${API_URL}/playlists/${playlistId}`).then(r => r.json());
        setSelectedPlaylist(updated);
      }
    } catch (error) {
      console.error('Error removing song from playlist:', error);
    }
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

  // Presentation Mode - Full screen with only lyrics/chords
  if (isPresentationMode && selectedSong) {
    return (
      <div className="fixed inset-0 bg-black text-white z-50 overflow-hidden">
        {/* Minimal floating controls */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300 z-10">
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
          <button
            onClick={() => setIsPresentationMode(false)}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition"
            title="Exit Presentation Mode"
          >
            <Minimize2 size={24} />
          </button>
        </div>

        {/* BPM Indicator in presentation mode */}
        <div className="absolute top-4 left-4 z-10">
          <BPMIndicator 
            bpm={sections[currentSectionIndex]?.bpm || 0} 
            isPlaying={isPlaying}
          />
        </div>

        {/* Full screen teleprompter */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-y-auto bg-black"
          style={{ 
            scrollBehavior: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div 
            ref={contentRef} 
            className="max-w-5xl mx-auto px-12 py-16 space-y-12"
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
                    isActive ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className="mb-6">
                    <span className="text-2xl font-semibold text-gray-400 uppercase">
                      {section.type}
                    </span>
                    <span className="ml-4 text-lg text-gray-500">
                      {section.bpm} BPM • {section.bars} bars
                    </span>
                  </div>
                  <div className="text-4xl leading-relaxed font-light">
                    {formattedLines.map((line, lineIndex) => (
                      <div key={lineIndex} className="mb-3">
                        {line.map((part, partIndex) => (
                          <span
                            key={partIndex}
                            className={part.isChord ? 'text-blue-400 font-semibold' : ''}
                          >
                            {part.text}
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Smart Teleprompter</h1>
        
        <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${isSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Sidebar - Song List / Playlists */}
          {!isSidebarCollapsed && (
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-4">
                {/* Collapse Button */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    title="Collapse menu"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-700">
                <button
                  onClick={() => {
                    setActiveTab('songs');
                    setSelectedPlaylist(null);
                  }}
                  className={`px-4 py-2 font-semibold transition ${
                    activeTab === 'songs'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Songs
                </button>
                <button
                  onClick={() => {
                    setActiveTab('playlists');
                    setSelectedSong(null);
                  }}
                  className={`px-4 py-2 font-semibold transition ${
                    activeTab === 'playlists'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Playlists
                </button>
              </div>

              {activeTab === 'songs' && (
                <>
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
                      setSelectedPlaylist(null);
                      setCurrentPlaylistIndex(0);
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
                </>
              )}

              {activeTab === 'playlists' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Playlists</h2>
                    <button
                      onClick={() => setShowNewPlaylistForm(!showNewPlaylistForm)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {showNewPlaylistForm && (
                    <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                      <input
                        type="text"
                        placeholder="Playlist Name"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        className="w-full mb-2 px-3 py-2 bg-gray-600 rounded text-white placeholder-gray-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreatePlaylist}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setShowNewPlaylistForm(false);
                            setNewPlaylistName('');
                          }}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded transition"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedPlaylist?.id === playlist.id
                            ? 'bg-blue-600'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => {
                          setSelectedPlaylist(playlist);
                          setCurrentPlaylistIndex(0);
                          if ((playlist.songs?.length ?? 0) > 0) {
                            setSelectedSong(playlist.songs[0]);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white break-words">{playlist.name || 'Unnamed Playlist'}</h3>
                            {!playlist.name && <span className="text-xs text-yellow-400">(No name)</span>}
                            <p className={`text-xs mt-1 ${
                              selectedPlaylist?.id === playlist.id ? 'text-blue-100' : 'text-gray-300'
                            }`}>
                              {playlist.songCount ?? (playlist.songs?.length ?? 0)} songs
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {(playlist.songs?.length ?? 0) > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayPlaylist(playlist);
                                }}
                                className="p-1 hover:bg-blue-700 rounded"
                                title="Play"
                              >
                                <Play size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist.id);
                              }}
                              className="p-1 hover:bg-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {selectedPlaylist?.id === playlist.id && (playlist.songs?.length ?? 0) > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">Songs in playlist:</div>
                            {(playlist.songs || []).map((song, idx) => (
                              <div
                                key={song.id}
                                className={`flex justify-between items-center p-2 rounded text-sm ${
                                  idx === currentPlaylistIndex && selectedPlaylist?.id === playlist.id
                                    ? 'bg-blue-500'
                                    : 'bg-gray-600'
                                }`}
                              >
                                <span className="truncate flex-1">{song.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSongFromPlaylist(playlist.id, song.id);
                                  }}
                                  className="ml-2 p-1 hover:bg-red-600 rounded"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add songs to selected playlist */}
                  {selectedPlaylist && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Add songs to playlist:</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {songs
                          .filter(song => !(selectedPlaylist.songs || []).some(ps => ps.id === song.id))
                          .map((song) => (
                            <button
                              key={song.id}
                              onClick={() => handleAddSongToPlaylist(selectedPlaylist.id, song.id)}
                              className="w-full text-left p-2 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
                            >
                              {song.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          )}

          {/* Main Content - Teleprompter */}
          <div className={isSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'}>
            {/* Expand Menu Button (shown when sidebar is collapsed) */}
            {isSidebarCollapsed && (
              <div className="mb-4">
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
                  title="Expand menu"
                >
                  <Menu size={20} />
                  <span>Menu</span>
                </button>
              </div>
            )}
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
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedSong.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {sections.length} sections • Current: {sections[currentSectionIndex]?.type || 'N/A'} 
                      ({sections[currentSectionIndex]?.bars || 0} bars)
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <BPMIndicator 
                      bpm={sections[currentSectionIndex]?.bpm || 0} 
                      isPlaying={isPlaying}
                    />
                    <div className="flex gap-2">
                      {selectedPlaylist && (
                        <>
                          <button
                            onClick={handlePreviousSong}
                            disabled={currentPlaylistIndex === 0}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous Song"
                          >
                            ←
                          </button>
                          <div className="px-3 py-2 text-sm text-gray-400">
                            {currentPlaylistIndex + 1} / {selectedPlaylist.songs.length}
                          </div>
                          <button
                            onClick={handleNextSong}
                            disabled={currentPlaylistIndex >= selectedPlaylist.songs.length - 1}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next Song"
                          >
                            →
                          </button>
                        </>
                      )}
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
                      <button
                        onClick={() => setIsPresentationMode(true)}
                        className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                        title="Presentation Mode"
                      >
                        <Maximize2 size={24} />
                      </button>
                    </div>
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

