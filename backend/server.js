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

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

