# Smart Teleprompter for Musicians

A web-based smart teleprompter application that automatically scrolls lyrics based on BPM and bar count, changing speed dynamically as the song progresses.

## Features

- **Variable Speed Scroll Engine**: Automatically calculates scroll speed based on BPM and bars for each song section
- **XML-like Format**: Parse custom song format with sections (intro, verse, chorus) and their respective BPM and bar counts
- **Real-time Scrolling**: Smooth, automatic scrolling that adapts to tempo changes
- **Song Management**: Create, edit, and delete songs with persistent storage
- **Chord Notation**: Display chords inline with lyrics using `[Chord]` notation

## Tech Stack

- **Frontend**: React (Vite), TailwindCSS, Lucide React
- **Backend**: Node.js (Express), Prisma ORM
- **Database**: SQLite (local file)

## Getting Started

### Option 1: Docker (Recommended)

#### Production Build

```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:3002

#### Development Mode

```bash
# Start in development mode with hot reload
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml down
```

#### Seed Sample Data

```bash
# Run seed script inside backend container
docker-compose exec backend npm run seed
```

### Option 2: Local Development

#### Prerequisites

- Node.js (v20.9.0 or higher recommended)
- npm

#### Installation

1. **Backend Setup**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```

3. **Seed Sample Data (Optional)**:
   ```bash
   cd backend
   npm run seed
   ```
   This will create a sample song to help you get started.

#### Running the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```
   The server will run on `http://localhost:3002`

2. **Start the Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5174` (or another port if 5174 is busy)

## Port Configuration

The application uses alternative ports to avoid conflicts:
- **Backend**: Port 3002 (instead of 3001)
- **Frontend**: Port 5174 (instead of 5173)

You can change these ports by modifying:
- `docker-compose.yml` or `docker-compose.dev.yml` for Docker
- `backend/server.js` (PORT environment variable)
- `frontend/vite.config.js` (server.port)

## Song Format (XML Protocol)

Songs are stored in a custom XML-like format with sections that specify BPM and bar count:

```xml
<intro bpm="120" bars="4">
[G] [D] [Em] [C]
</intro>

<verse bpm="120" bars="8">
[G] Look at the stars
[D] Look how they shine for you
</verse>

<chorus bpm="140" bars="8">
[C] And it was all yellow
</chorus>
```

### Format Rules:

- Each section has a type (intro, verse, chorus, etc.)
- Each section must specify `bpm` (beats per minute) and `bars` (number of bars)
- Chords are denoted with square brackets: `[G]`, `[D]`, etc.
- Multiple sections can be defined in any order
- The scroll engine calculates duration based on: `(bars × 4 beats/bar) × (60 seconds/minute / bpm) × 1000 ms`

## How It Works

1. **Parsing**: The XML parser extracts sections with their BPM and bar counts
2. **Duration Calculation**: Each section's duration is calculated based on its BPM and bars
3. **Scroll Speed**: The scroll engine calculates pixels-per-millisecond for each section
4. **Dynamic Scrolling**: As the song plays, the scroll speed adjusts automatically when transitioning between sections

## Usage

1. **Create a Song**: Click the "+" button in the sidebar and enter a title and XML content
2. **Select a Song**: Click on any song in the sidebar to load it
3. **Play**: Click the play button to start automatic scrolling
4. **Edit**: Click the edit button to modify song content
5. **Reset**: Click the reset button to return to the beginning

## Project Structure

```
chordpad/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── server.js               # Express server
│   ├── Dockerfile              # Production Docker image
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Teleprompter.jsx    # Main component
│   │   ├── hooks/
│   │   │   └── useScrollEngine.js  # Scroll engine logic
│   │   ├── utils/
│   │   │   └── xmlParser.js        # XML parsing utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile              # Production Docker image
│   ├── Dockerfile.dev          # Development Docker image
│   ├── nginx.conf              # Nginx configuration
│   └── package.json
├── docker-compose.yml          # Production Docker Compose
├── docker-compose.dev.yml      # Development Docker Compose
└── README.md
```

## API Endpoints

- `GET /api/songs` - Get all songs
- `GET /api/songs/:id` - Get a single song
- `POST /api/songs` - Create a new song
- `PUT /api/songs/:id` - Update a song
- `DELETE /api/songs/:id` - Delete a song

## Docker Commands

### Production

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Remove volumes (deletes database)
docker-compose down -v
```

### Development

```bash
# Build and start with hot reload
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down
```

## License

ISC
