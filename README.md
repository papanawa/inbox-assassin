# 🎯 Inbox Assassin

> Clean inbox. Zero mercy.

A precision Gmail cleanup tool built for The Goochey Group. Rules-based email elimination with AI-assisted batch processing.

---

## Tech Stack

- **Frontend** — React + Vite + Tailwind CSS
- **Auth** — Supabase Auth (Google OAuth with Gmail API scopes)
- **Database** — Supabase (PostgreSQL)
- **API** — Vercel serverless functions
- **Hosting** — Vercel

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Current | Foundation — auth, routing, layout, Supabase schema |
| 2 | ⏳ Next | Rules engine — builder UI, plain-English previews, estimated counts |
| 3 | 🔜 | Pre-run gate, two-stage confirmation, execution engine, post-run summary |
| 4 | 🔜 | AI Inbox Advisor — batch scan, Claude-powered suggestions, auto-create rules |
| 5 | 🔜 | Audit log full UI, settings, multi-user support |
| 6 | 🔜 | Unsubscribe detection, scheduled runs, email preview before delete |

---

## Local Development

### 1. Clone and install
```bash
git clone https://github.com/papanawa/inbox-assassin
cd inbox-assassin
npm install
```

### 2. Environment variables
```bash
cp .env.example .env
```
Fill in `.env` with your Supabase and Google credentials.

### 3. Run the schema
Open Supabase Dashboard → SQL Editor → paste and run `supabase/schema.sql`

### 4. Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Gmail API
3. OAuth 2.0 credentials → Web application
4. Add authorized redirect URIs:
   - `http://localhost:3000` (dev)
   - `https://your-project.supabase.co/auth/v1/callback`
   - `https://inbox-assassin.vercel.app` (prod)
5. Copy Client ID → `VITE_GOOGLE_CLIENT_ID` in `.env`

### 5. Configure Supabase Google provider
Dashboard → Authentication → Providers → Google
- Paste your Google Client ID and Client Secret
- Enable additional scopes:
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/gmail.readonly`

### 6. Start dev server
```bash
npm run dev
```

---

## Project Structure

```
inbox-assassin/
├── api/
│   └── gmail/
│       ├── messages.js     # List/search Gmail messages
│       └── delete.js       # Trash/move Gmail messages
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── Header.jsx
│   │       ├── Layout.jsx
│   │       └── Sidebar.jsx
│   ├── hooks/
│   │   └── useAuth.js      # Auth + Gmail token management
│   ├── lib/
│   │   ├── gmail.js        # Gmail API helpers
│   │   └── supabase.js     # Supabase client
│   ├── pages/
│   │   ├── AuditLog.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── Rules.jsx
│   │   └── Settings.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── supabase/
│   └── schema.sql          # Full DB schema + RLS policies
├── .env.example
├── vercel.json
└── README.md
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (auto-created on sign-up) |
| `oauth_tokens` | Gmail API tokens per user |
| `rules` | Cleanup rule definitions |
| `deletion_logs` | Audit trail of every run |
| `batch_sessions` | Resumable batch processing state |

---

*A Goochey Group tool · Built with Claude*
