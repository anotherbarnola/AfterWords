# AfterWords

AfterWords is a digital legacy platform that allows users to write secure messages to be delivered to loved ones after their death. Triggers include a dead man's switch (periodic check-in system) and trusted contact verification.

## Technology Stack

- **Frontend**: React + Vite (lightweight, blazing fast HMR)
- **Backend**: Node.js + Express (simple, high performance)
- **Database**: SQLite (local dev) / Turso (synced cloud database via `team-db`)
- **Language**: JavaScript / TypeScript

## Directory Structure

```text
afterwords/
├── backend/            # Express API Server
│   ├── src/
│   │   ├── index.js    # Server entry point (serves API and built frontend)
│   │   ├── db.js       # SQLite / Turso database wrapper
│   │   └── routes/     # Express routers (auth, messages, check-ins, etc.)
│   └── package.json
├── frontend/           # Vite + React Client
│   ├── src/
│   │   ├── main.jsx    # Client entry point
│   │   ├── App.jsx     # Main App component with client-side routing
│   │   ├── pages/      # Login, Register, Dashboard, Compose, Settings
│   │   └── components/ # Reusable UI components
│   ├── vite.config.js
│   └── package.json
├── README.md
└── package.json        # Root workspace configuration
```

## Database Schema

The shared database uses the following table structures, synchronized across the team via Turso (`team-db`):

### 1. `users`
Represents registered legacy creators.
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  subscription_status TEXT NOT NULL DEFAULT 'free',
  last_check_in TEXT NOT NULL DEFAULT (datetime('now')),
  check_in_interval_days INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1
);
```

### 2. `messages`
Legacy messages stored by users, pending delivery.
```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_delivery', 'delivered'
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. `recipients`
Loved ones or legal trustees who will receive specific messages.
```sql
CREATE TABLE IF NOT EXISTS recipients (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

### 4. `trusted_contacts`
Designated individuals who can verify a user's status when a check-in is missed.
```sql
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 5. `check_ins`
Logs of user activity to verify they are still alive.
```sql
CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

Install dependencies for all workspaces:

```bash
npm run install-all
```

### Running Development Servers

Start both frontend (Vite on port 3000, proxying API to Express) and backend (Express on port 8000) concurrently:

```bash
npm run dev
```

The app will be live at `http://localhost:3000`.

### Production Build & Launch

To build the React application and run the production Express server on port 3000:

```bash
npm run build
npm start
```

## Environment Variables

Both workspaces can be configured via environment variables.

### Backend (`backend/.env`)
```env
PORT=3000
JWT_SECRET=super-secret-key-change-me
TEAM_DB_PATH=/home/team/.data/agent-team-823b11dc.db
TEAM_DB_URL=libsql://...
TEAM_DB_AUTH_TOKEN=...
```
