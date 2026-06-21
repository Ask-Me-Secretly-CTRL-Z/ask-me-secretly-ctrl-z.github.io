# اسألني بسريه — Anonymous Q&A Platform

> يا هلا يا هلا.. منور! اسألني بسريه lets your friends send you anonymous questions through shareable links. Built with Firebase and a heavy dose of Egyptian humor.

---

## Overview

اسألني بسريه is a real-time anonymous Q&A platform with an Egyptian Arabic persona. Users sign in with Google, share a unique link, and receive anonymous questions from friends — all served with comedic Egyptian dialect.

---

## Features

### Core
- **Google Authentication** — Seamless one-click sign-in via Firebase Auth
- **Shareable Links** — `yoursite.com?to={user_id}` for anonymous questions
- **Real-time Updates** — New questions appear instantly via Firebase listeners
- **Browser Notifications** — Desktop notifications on new questions
- **Theme Persistence** — Selected theme persists through Google login via localStorage

### Team Badge
- **Logo in Badge** — Site logo replaces the "C" in the CTRL-z team badge
- **Hover Glow** — Green ring/glow around badge on hover (varies by theme)
- **Persistent Tooltip** — Click badge to show/hide team info; click anywhere to dismiss

### Story Engine
- **Image Generation** — Render questions as story images (html2canvas)
- **Per-Image Color Picker** — Choose a custom background color each time you generate
- **WhatsApp Sharing** — One-click share to WhatsApp stories
- **Image Download** — Save stories locally

### UI & Themes
- **5 Themes with Matched Accents** — Each theme (purple, orange, black, green, pink) has accent colors matching its background
- **Black Accent for Black Theme** — Theme-2 uses black accent text
- **Default Light Background** — White/off-white (`#f0f0f0`) with dark text before login
- **Default Black After Login** — If no theme chosen, black background applies after login
- **Question Page** — White background with black text, theme button hidden
- **Persistent Preferences** — Theme saved to localStorage + Firebase for logged-in users
- **Global Theme Button** — Floating 🎨 button accessible from all screens (hidden on question page)

### Onboarding
- **Theme Before Login** — Users can pick a theme before signing in; it persists through Google auth
- **Egyptian Arabic Dialect** — Full comedic Egyptian interface throughout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Auth | Firebase Authentication (Google provider) |
| Database | Firebase Realtime Database |
| Image Generation | html2canvas |
| Storage | localStorage + Firebase RTDB (cloud sync) |
| Sharing | Web Share API, WhatsApp deep links |
| Deployment | GitHub Pages |
| CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites

- Modern browser (Chrome recommended for Web Share API)
- Firebase project with **Authentication** (Google) + **Realtime Database** enabled

### Setup

```bash
# 1. Clone
git clone <repo-url>
cd project

# 2. Configure Firebase
# Create a Firebase project, enable Google Auth + Realtime Database
# Update src/firebase.js with your Firebase config

# 3. Deploy security rules
firebase deploy --only database
# Or paste firebase-rules.json into Firebase Console > Realtime Database > Rules

# 4. Serve locally
python -m http.server 8000
# OR
npx serve .
```

Open `http://localhost:8000` in your browser.

---

## Project Structure

```
project/
├── index.html                 # HTML entry point
├── style.css                  # All styles + 5 theme variants
├── src/                       # JavaScript modules
│   ├── app-compat.js          # Entry point — DOM setup, event wiring
│   ├── firebase-compat.js     # Firebase init
│   ├── auth-compat.js         # Auth lifecycle
│   ├── router-compat.js       # URL routing (?u= vs dashboard)
│   ├── questions-compat.js    # Question CRUD
│   ├── themes-compat.js       # Theme system
│   ├── story-compat.js        # Story image generation
│   ├── ui-compat.js           # Modals, clipboard, notifications
│   ├── security-compat.js     # XSS sanitization
│   └── errors-compat.js       # Structured error handling
├── firebase-rules.json        # RTDB security rules
├── mcp.json                   # MCP server configuration
├── package.json               # Dev dependencies
├── README.md                  # This file
├── SPEC.md                    # Feature specification
├── sw.js                      # Service Worker
├── manifest.json              # PWA manifest
│
├── img/                       # Assets
│   ├── logo.png
│   ├── icon.jpeg
│   ├── tiktok qr.jpeg
│   └── instgram qr.jpeg
│
└── .github/workflows/
    └── jekyll-gh-pages.yml    # CI/CD pipeline
```

---

## Architecture

### Routing

| URL | Screen | Purpose |
|-----|--------|---------|
| `/?u={uid}` | Question Screen | Visitors send anonymous questions |
| `/` (no param) | Dashboard | Owner views and manages questions |

### Data Flow

```
Visitor
  → Google Auth
  → Question Form (validated, sanitized)
  → Firebase Realtime Database
  → Real-time listener (onChildAdded)
  → Owner dashboard update
  → Browser notification
```

### Database Schema

```
/users/{uid}
  ├── displayName: string
  ├── email: string
  ├── createdAt: timestamp
  └── theme: number

/questions/{recipientUid}/{questionId}
  ├── text: string         (1–500 chars)
  ├── timestamp: number
  └── answered: boolean
```

### Security Rules (Summary)

| Rule | Effect |
|------|--------|
| Users: own profile only | `auth.uid === $uid` |
| Questions: any auth can write | Write requires auth |
| Questions: only recipient reads | `auth.uid === $recipientUid` |
| Validation: text 1-500 chars | Block empty or oversized |
| Validation: timestamp ±5 min | Prevent spam floods |
| Anti-impersonation | Strip sender fields on write |

---

## Theme System Details

### Available Themes

| ID | Name | Gradient | Accent Color |
|----|------|----------|--------------|
| 0 | Purple | `#667eea → #764ba2` | Purple (`#667eea`) |
| 1 | Orange | `#f6d365 → #fda085` | Coral (`#fda085`) |
| 2 | Black | `#232526 → #414345` | Black (`#000000`) |
| 3 | Green | `#11998e → #38ef7d` | Teal (`#11998e`) |
| 4 | Pink | `#ff9a9e → #fecfef` | Rose (`#fda4af`) |

### Default States

| State | Background | Text |
|-------|-----------|------|
| Before login (guest) | White (`#f0f0f0`) | Dark |
| After login (no theme) | Black | White |
| Question page (`?u=UID`) | White | Dark |

### Team Badge Hover Effects

| Theme Group | Hover Effect |
|-------------|-------------|
| Light themes (orange, pink) | Green ring (`#22ff66`) |
| Green theme (theme-3) | Dark green ring (`#064e3b`) |
| Dark themes (purple, black) | Strong green glow |

---

## Development

### Add a Theme

1. Add entry to theme variables in `style.css` (under `body.theme-N`)
2. Add `.theme-N` body class styles in `style.css`
3. Add theme option in `index.html`

### Add a Screen

1. Add `<div class="screen" id="screen-xxx">` in `index.html`
2. Call `window.__ui.showScreen('screen-xxx')` from JavaScript

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_001` | Authentication failed |
| `AUTH_002` | Sign out failed |
| `DB_001` | Database write failed |
| `DB_002` | Database read failed |
| `STORY_001` | Story image generation failed |
| `SHARE_001` | Share action failed |
| `ROUTE_001` | Route load failed |
| `THEME_001` | Theme save failed |
| `Q_001` | Question submit failed |

All errors dispatched through `ErrorHandler` class in `src/errors-compat.js`.

---

## Deployment

### GitHub Pages (Automatic)

Push to `main` → `.github/workflows/jekyll-gh-pages.yml` deploys automatically.

### Manual

```bash
git push origin main
```

---

## License

MIT

---

## Team

Built by **CTRL-z**

[![TikTok](https://img.shields.io/badge/TikTok-000000?style=flat&logo=tiktok)](https://www.tiktok.com/@ctrlz_01)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram)](https://www.instagram.com/ctzrl_/)
