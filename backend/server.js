import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}));
app.use(express.json());

// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single song
app.get('/api/songs/:id', async (req, res) => {
  try {
    const song = await prisma.song.findUnique({
      where: { id: req.params.id }
    });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new song
app.post('/api/songs', async (req, res) => {
  try {
    const { title, content } = req.body;
    const song = await prisma.song.create({
      data: { title, content }
    });
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a song
app.put('/api/songs/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const song = await prisma.song.update({
      where: { id: req.params.id },
      data: { title, content }
    });
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a song
app.delete('/api/songs/:id', async (req, res) => {
  try {
    await prisma.song.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PLAYLIST ENDPOINTS ==========

// Get all playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        songs: {
          include: {
            song: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Transform to include song count and songs array
    const transformed = playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      songCount: playlist.songs.length,
      songs: playlist.songs.map(ps => ({
        ...ps.song,
        order: ps.order
      }))
    }));
    
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single playlist
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
      include: {
        songs: {
          include: {
            song: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json({
      id: playlist.id,
      name: playlist.name,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      songs: playlist.songs.map(ps => ({
        ...ps.song,
        order: ps.order
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const { name } = req.body;
    console.log('Creating playlist with name:', name); // Debug
    console.log('Prisma client available:', !!prisma); // Debug
    console.log('Playlist model available:', !!prisma.playlist); // Debug
    
    if (!prisma.playlist) {
      throw new Error('Playlist model not available in Prisma Client. Please regenerate Prisma Client.');
    }
    
    const playlist = await prisma.playlist.create({
      data: { name: name || 'Unnamed Playlist' }
    });
    console.log('Playlist created:', playlist); // Debug
    res.json(playlist);
  } catch (error) {
    console.error('Error creating playlist:', error); // Debug
    res.status(500).json({ error: error.message });
  }
});

// Update a playlist
app.put('/api/playlists/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const playlist = await prisma.playlist.update({
      where: { id: req.params.id },
      data: { name }
    });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a playlist
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    await prisma.playlist.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add song to playlist
app.post('/api/playlists/:id/songs', async (req, res) => {
  try {
    const { songId } = req.body;
    const playlistId = req.params.id;
    
    // Get current max order
    const maxOrder = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' }
    });
    
    const order = maxOrder ? maxOrder.order + 1 : 0;
    
    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        order
      },
      include: {
        song: true
      }
    });
    
    res.json(playlistSong);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove song from playlist
app.delete('/api/playlists/:id/songs/:songId', async (req, res) => {
  try {
    await prisma.playlistSong.deleteMany({
      where: {
        playlistId: req.params.id,
        songId: req.params.songId
      }
    });
    res.json({ message: 'Song removed from playlist' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder songs in playlist
app.put('/api/playlists/:id/songs/reorder', async (req, res) => {
  try {
    const { songOrders } = req.body; // Array of { songId, order }
    
    await Promise.all(
      songOrders.map(({ songId, order }) =>
        prisma.playlistSong.updateMany({
          where: {
            playlistId: req.params.id,
            songId
          },
          data: { order }
        })
      )
    );
    
    res.json({ message: 'Playlist reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

