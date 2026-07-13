// ============================================================
// Firebase v12 Modular — ES Module Entry Point
// Replaces: firebase-compat.js, auth-compat.js
// Loads:    questions, themes, story, security, ui, errors, router, app-compat
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  getRedirectResult, signOut, onAuthStateChanged, updateProfile
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getDatabase, ref, get, set, remove, onValue, off,
  child, query, orderByChild
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js';

// ============================================================
// CompatRef — wraps modular DatabaseReference/Query
// so existing compat code using .once/.on/.set/.child/.orderByChild works
// ============================================================
function compatRef(db, path) {
  return makeCompat(ref(db, path), db);
}

function makeCompat(r, db) {
  return new Proxy(r, {
    get(target, prop) {
      if (prop === 'once') {
        return (eventType) => get(target);
      }
      if (prop === 'on') {
        return (eventType, cb) => onValue(target, cb);
      }
      if (prop === 'off') {
        return (eventType) => off(target);
      }
      if (prop === 'set') {
        return (value) => set(target, value);
      }
      if (prop === 'remove') {
        return () => remove(target);
      }
      if (prop === 'child') {
        return (path) => makeCompat(child(target, path), db);
      }
      if (prop === 'orderByChild') {
        return (field) => makeCompat(query(target, orderByChild(field)), db);
      }
      return Reflect.get(target, prop);
    }
  });
}

// ============================================================
// Firebase Initialization
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDsieHa61z4_iz1r4TIkF8beceCFyfw-DY",
  authDomain: "ctrl-z-4bfb3.firebaseapp.com",
  databaseURL: "https://ctrl-z-4bfb3-default-rtdb.firebaseio.com",
  projectId: "ctrl-z-4bfb3",
  storageBucket: "ctrl-z-4bfb3.firebasestorage.app",
  messagingSenderId: "870806670095",
  appId: "1:870806670095:web:6dc5b90ae126411f4b0c7a",
  measurementId: "G-3M7741FHBB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');
provider.setCustomParameters({ prompt: 'select_account' });

// ============================================================
// window.__fb — Firebase helpers (backwards compat for loaded scripts)
// ============================================================
window.__fb = {
  auth: {
    get currentUser() { return auth.currentUser; },
    getRedirectResult: () => getRedirectResult(auth),
    signOut: () => signOut(auth),
    onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb)
  },
  database: {
    ref: (path) => compatRef(db, path)
  },
  provider: provider,
  getUserRef: function (uid) {
    return compatRef(db, 'users/' + uid);
  },
  getRecipientQuestionsRef: function (uid) {
    return compatRef(db, 'questions/' + uid);
  },
  getQuestionRef: function (recipientUid, questionId) {
    return compatRef(db, 'questions/' + recipientUid + '/' + questionId);
  },
  getUserThemeRef: function (uid) {
    return compatRef(db, 'users/' + uid + '/theme');
  },
  getUserDisplayNameRef: function (uid) {
    return compatRef(db, 'users/' + uid + '/displayName');
  },
  getShortUrlRef: function (shortName) {
    return compatRef(db, 'shortUrls/' + shortName);
  }
};

// ============================================================
// window.__auth — Auth helpers
// ============================================================
window.__auth = {};
window.__auth.signInWithGoogle = function () {
  return signInWithPopup(auth, provider).then(function () {
    location.reload();
  });
};
window.__auth.signOut = function () {
  return signOut(auth).catch(function (error) {
    if (window.__errors) window.__errors.handle(error);
  });
};
window.__auth.onStateChanged = function (callback) {
  return onAuthStateChanged(auth, callback);
};
window.__auth.getCurrentUser = function () {
  return auth.currentUser;
};
window.__auth.updateDisplayName = function (uid, name) {
  var user = auth.currentUser;
  if (!user) return Promise.reject(new Error('No authenticated user'));
  return updateProfile(user, { displayName: name });
};

// ============================================================
// Dynamically load the remaining compat scripts in order
// ============================================================
// auth-compat.js NOT loaded: app.js initializes window.__auth directly (modular SDK)
var remainingScripts = [
  'src/questions-compat.js',
  'src/themes-compat.js',
  'src/story-compat.js',
  'src/security-compat.js',
  'src/ui-compat.js',
  'src/errors-compat.js',
  'src/router-compat.js',
  'src/app-compat.js'
];

function loadNext(i) {
  if (i >= remainingScripts.length) return;
  var s = document.createElement('script');
  s.src = remainingScripts[i];
  s.onload = function () { loadNext(i + 1); };
  s.onerror = function () {
    console.error('[App] Failed to load:', remainingScripts[i]);
    loadNext(i + 1);
  };
  document.body.appendChild(s);
}

loadNext(0);
