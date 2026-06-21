# اسألني بسريه — Anonymous Q&A Platform (Specification)

> **Version:** 1.0.0  
> **Status:** Production  
> **Persona:** Egyptian Arabic — comedic dialect throughout

---

## 1. Overview

AURA is a humorous, Egyptian-themed anonymous Q&A platform. Users authenticate via Google, share a unique link, and receive anonymous questions. The entire interface speaks in comedic Egyptian Arabic.

---

## 2. Core Mandates

1. **Persona & Tone** — 100% comedic Egyptian Arabic. Slang, jokes, funny phrasing. No standard Arabic or English UI text.
2. **Mandatory Onboarding** — First login forces theme selection before dashboard access.
3. **Flexible Image Style** — Every story generation prompts the user to pick a background color. No hardcoded defaults.

---

## 3. Feature Specification

### 3.1 Authentication

| ID | Requirement | Priority |
|----|------------|----------|
| AUTH-01 | Sign in with Google via Firebase Auth | P0 |
| AUTH-02 | Detect auth state on page load | P0 |
| AUTH-03 | Sign out clears local session | P0 |
| AUTH-04 | Show auth errors in Egyptian Arabic | P1 |

### 3.2 Onboarding

| ID | Requirement | Priority |
|----|------------|----------|
| ONB-01 | First-time detected users see theme selection modal | P0 |
| ONB-02 | Theme must be selected before dashboard renders | P0 |
| ONB-03 | Theme saved to localStorage + Firebase | P0 |
| ONB-04 | Returning users skip onboarding | P0 |

### 3.3 Dashboard

| ID | Requirement | Priority |
|----|------------|----------|
| DASH-01 | Display unique shareable link: `site?to={uid}` | P0 |
| DASH-02 | "Copy Link" button with visual feedback | P0 |
| DASH-03 | "Share Link" button (Web Share API) | P0 |
| DASH-04 | Real-time question list (newest first) | P0 |
| DASH-05 | Empty state with humorous message | P1 |
| DASH-06 | Question count badge | P1 |

### 3.4 Question Delivery

| ID | Requirement | Priority |
|----|------------|----------|
| QST-01 | Any authenticated user can submit a question | P0 |
| QST-02 | Question text validated: 1–500 chars | P0 |
| QST-03 | Input sanitized (XSS prevention) | P0 |
| QST-04 | Rate limiting via Firebase rules (timestamp ±5 min) | P0 |
| QST-05 | Real-time delivery via Firebase `onChildAdded` | P0 |
| QST-06 | Browser notification on new question | P1 |

### 3.5 Story Generation

| ID | Requirement | Priority |
|----|------------|----------|
| STORY-01 | "نزلها ستوري 😉" button on each question | P0 |
| STORY-02 | Color picker modal opens before generation | P0 |
| STORY-03 | Image renders question text with gradient background | P0 |
| STORY-04 | Powered by html2canvas | P0 |
| STORY-05 | Download as PNG | P0 |
| STORY-06 | Share to WhatsApp via deep link | P0 |
| STORY-07 | Native share via Web Share API (fallback: download) | P1 |

### 3.6 Theme System

| ID | Requirement | Priority |
|----|------------|----------|
| THEME-01 | 5 pastel/vibrant themes | P0 |
| THEME-02 | Floating 🎨 button on all screens | P0 |
| THEME-03 | Single modal rule (close existing before opening new) | P0 |
| THEME-04 | Save to localStorage (all users) | P0 |
| THEME-05 | Save to Firebase (logged-in users) | P0 |
| THEME-06 | Restore saved theme on page load | P0 |

### 3.7 Notifications

| ID | Requirement | Priority |
|----|------------|----------|
| NOTIF-01 | Request notification permission on first visit | P1 |
| NOTIF-02 | Show browser notification on new question | P1 |
| NOTIF-03 | Click notification focuses tab | P2 |

---

## 4. Technical Architecture

### 4.1 Frontend Stack

```
HTML5 (semantic) + CSS3 (custom properties, gradients)
  └─ Vanilla JavaScript (ES Modules, no framework)
       └─ Firebase JS SDK v9+ (modular)
            └─ html2canvas (client-side rendering)
```

### 4.2 Module Dependency Graph

```
app.js (entry)
  ├── firebase.js        ← Firebase init
  ├── router.js          ← URL parsing
  │    └── auth.js       ← Auth state
  │         ├── questions.js  ← DB operations
  │         │    ├── security.js  ← Sanitization
  │         │    └── story.js     ← Image gen
  │         │         └── ui.js   ← Modals
  │         └── themes.js ← Theme mgmt
  │              └── ui.js
  └── errors.js          ← Error handler
```

### 4.3 Routing

| Route | Condition | Screen ID |
|-------|-----------|-----------|
| `/?to={uid}` | `uid` present, auth required | `question-screen` |
| `/` | No `to` param, auth required | `dashboard-screen` |
| Any | Not authenticated | `auth-screen` |

### 4.4 Data Flow

```
[Actor]           [Client]                 [Firebase]           [Recipient]
   │                  │                        │                     │
   │  Click link      │                        │                     │
   │ ────────────────►│  ?to={recipientUid}   │                     │
   │                  │────────────────────────►                     │
   │                  │                        │                     │
   │  Sign in Google  │                        │                     │
   │ ────────────────►│  Auth token            │                     │
   │                  │────────────────────────►                     │
   │                  │                        │                     │
   │  Submit question │  write /questions/     │                     │
   │ ────────────────►│────────────────────────►                     │
   │                  │                        │                     │
   │                  │                        │  onChildAdded       │
   │                  │                        │────────────────────►│
   │                  │                        │                     │
   │                  │                        │  Notification       │
   │                  │                        │────────────────────►│
```

---

## 5. Database Schema

### 5.1 Users Node

```
/users/{uid}
  ├── name: string
  ├── email: string
  ├── createdAt: number (epoch ms)
  └── siteTheme: number (0–4)
```

### 5.2 Questions Node

```
/questions/{recipientUid}/{pushId}
  ├── text: string       (1–500 chars, sanitized)
  ├── timestamp: number  (epoch ms, server.time +-5min)
  └── answered: boolean  (default: false)
```

---

## 6. Security Model

### 6.1 Firebase Rules Summary

```
/users:
  write: uid must match auth.uid
  read:  uid must match auth.uid

/questions/{recipient}:
  write: must be authenticated
  read:  auth.uid === recipient
  validate:
    text: string of length 1–500
    timestamp: within 300000ms of now
    answered: boolean
    no other fields allowed (anti-impersonation)
```

### 6.2 Client-Side Security

- Input sanitization via `security.js` (strip HTML tags, escape entities)
- No raw `innerHTML` with user content
- Firebase rules enforce server-side validation (defense in depth)

---

## 7. Error Handling

All errors flow through a centralized `ErrorHandler` class.

| Code | Description | User Message |
|------|-------------|-------------|
| `AUTH_001` | Auth failed | مشكلة في تسجيل الدخول |
| `AUTH_002` | Sign out failed | مشكلة في تسجيل الخروج |
| `DB_001` | DB write failed | مشكلة في حفظ السؤال |
| `DB_002` | DB read failed | مشكلة في جلب الأسئلة |
| `STORY_001` | Image generation failed | مشكلة في إنشاء الصورة |
| `SHARE_001` | Share failed | مشكلة في المشاركة |
| `ROUTE_001` | Route load failed | مشكلة في فتح الصفحة |
| `THEME_001` | Theme save failed | مشكلة في حفظ الثيم |
| `Q_001` | Question submit failed | مشكلة في إرسال السؤال |

---

## 8. Testing

| Area | Approach |
|------|----------|
| Auth flow | Manual — sign in/out, token expiry |
| Question submission | Manual — valid, empty, oversize, XSS payloads |
| Real-time delivery | Manual — open two tabs, verify instant update |
| Story generation | Manual — verify canvas render, color picker, download |
| Theme persistence | Manual — set theme, refresh, verify restore |
| Responsive | Manual — mobile (375px), tablet (768px), desktop (1280px) |
| Security | Manual — XSS injection attempts, Firebase rules simulation |
| Error states | Manual — network off, quota exceeded, auth revoked |

---

## 9. Performance Targets

| Metric | Target |
|--------|--------|
| First paint | < 2s (3G) |
| Time to interactive | < 3s (3G) |
| Firebase read/write | < 500ms p95 |
| Story image generation | < 1s |
| Bundle size (JS) | < 50KB gzipped |
| Lighthouse score | > 85 (Performance) |

---

## 10. Browser Support

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 90+ | ✅ Full |
| Safari 15+ | ✅ Full (Web Share partial) |
| Edge 90+ | ✅ Full |
| Samsung Internet | ✅ Full |

---

## 11. Future Considerations

- **Multi-language toggle** (English mode)
- **Dark theme variant** for each color scheme
- **Question reactions** (anonymous emoji responses)
- **Admin panel** with question moderation
- **Export data** as JSON
- **PWA** with offline support
