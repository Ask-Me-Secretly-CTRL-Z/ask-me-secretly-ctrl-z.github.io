// ============================================================
// Firebase-free ES Module Entry Point
// Uses Google Identity Services (GIS) for Google sign-in
// All data flows through the Flask backend API
// ============================================================

// ─── Google OAuth Client ID ─────────────────────────────────
// TODO: Replace with your actual Google OAuth 2.0 Web Client ID
// from Google Cloud Console > APIs & Services > Credentials
var GOOGLE_CLIENT_ID = window.__GOOGLE_CLIENT_ID || '';

// ─── GIS Loader ─────────────────────────────────────────────
function loadGIS() {
  return new Promise(function (resolve, reject) {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = function () {
      // Wait a tick for GIS to fully initialize
      setTimeout(resolve, 100);
    };
    s.onerror = function () {
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(s);
  });
}

// ─── JWT Decoder (for GIS credential response) ──────────────
function decodeJwt(token) {
  try {
    var payload = token.split('.')[1];
    // Handle base64url encoding
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    return JSON.parse(atob(payload));
  } catch (e) {
    console.error('[App] JWT decode error:', e);
    return null;
  }
}

// ─── localStorage Helpers ───────────────────────────────────
function getStoredUser() {
  try {
    var uid = localStorage.getItem('uid');
    if (!uid) return null;
    return {
      uid: uid,
      email: localStorage.getItem('userEmail') || '',
      displayName: localStorage.getItem('userDisplayName') || '',
      photoURL: localStorage.getItem('userPhotoURL') || '',
      slug: localStorage.getItem('userSlug') || '',
      shortUrl: localStorage.getItem('userShortUrl') || '',
      profileUrl: localStorage.getItem('userProfileUrl') || ''
    };
  } catch (e) {
    return null;
  }
}

function storeUser(data) {
  try {
    localStorage.setItem('uid', data.uid || '');
    localStorage.setItem('userEmail', data.email || '');
    localStorage.setItem('userDisplayName', data.displayName || '');
    localStorage.setItem('userPhotoURL', data.photoURL || '');
    localStorage.setItem('userSlug', data.slug || '');
    localStorage.setItem('userShortUrl', data.shortUrl || data.shortLink || '');
    localStorage.setItem('userProfileUrl', data.profileUrl || '');
  } catch (e) {
    console.error('[App] Failed to store user:', e);
  }
}

function clearStoredUser() {
  try {
    localStorage.removeItem('uid');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userDisplayName');
    localStorage.removeItem('userPhotoURL');
    localStorage.removeItem('userSlug');
    localStorage.removeItem('userShortUrl');
    localStorage.removeItem('userProfileUrl');
  } catch (e) {}
}

// ─── User State Change Listeners ────────────────────────────
var _authListeners = [];
var _currentStoredUser = getStoredUser();

function _notifyAuthListeners(user) {
  _currentStoredUser = user;
  _authListeners.forEach(function (cb) {
    try { cb(user); } catch (e) { console.error('[App] Auth listener error:', e); }
  });
}

// ============================================================
// window.__fb — Compatibility shim (no real Firebase)
// ============================================================
window.__fb = {
  auth: {
    get currentUser() {
      var u = getStoredUser();
      if (!u) return null;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        getIdToken: function () { return Promise.resolve(u.uid); }
      };
    },
    getRedirectResult: function () { return Promise.resolve(null); },
    signOut: function () { return Promise.resolve(); },
    onAuthStateChanged: function (cb) {
      // Immediately call with current state
      setTimeout(function () { cb(_currentStoredUser); }, 0);
      // Return unsubscribe function
      _authListeners.push(cb);
      return function () {
        var idx = _authListeners.indexOf(cb);
        if (idx !== -1) _authListeners.splice(idx, 1);
      };
    }
  },
  provider: null
};

// ============================================================
// window.__api — Backend API helper (uid-based auth)
// ============================================================
window.__api = {};
window.__api._getBase = function () {
  return (window.__BACKEND_BASE_URL || '').replace(/\/+$/, '');
};
window.__api._authHeaders = function () {
  var user = getStoredUser();
  if (!user || !user.uid) return Promise.reject(new Error('Not authenticated'));
  return Promise.resolve({
    'Authorization': 'Bearer ' + user.uid,
    'Content-Type': 'application/json'
  });
};
window.__api.get = function (path) {
  var base = window.__api._getBase();
  return window.__api._authHeaders().then(function (headers) {
    return fetch(base + path, { method: 'GET', headers: headers });
  }).then(function (resp) {
    if (!resp.ok) throw new Error('API GET ' + path + ' failed: ' + resp.status);
    return resp.json();
  });
};
window.__api.post = function (path, body) {
  var base = window.__api._getBase();
  return window.__api._authHeaders().then(function (headers) {
    return fetch(base + path, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) });
  }).then(function (resp) {
    if (!resp.ok) {
      return resp.json().then(function (err) { throw new Error(err.error || 'API POST failed'); }).catch(function (e) {
        if (e.message && e.message !== 'API POST failed') throw e;
        throw new Error('API POST ' + path + ' failed: ' + resp.status);
      });
    }
    return resp.json();
  });
};
window.__api.del = function (path) {
  var base = window.__api._getBase();
  return window.__api._authHeaders().then(function (headers) {
    return fetch(base + path, { method: 'DELETE', headers: headers });
  }).then(function (resp) {
    if (!resp.ok) throw new Error('API DELETE ' + path + ' failed: ' + resp.status);
    return resp.json();
  });
};

// ============================================================
// window.__auth — Auth helpers (GIS + backend API)
// ============================================================
window.__auth = {};

window.__auth.signInWithGoogle = function () {
  if (!GOOGLE_CLIENT_ID) {
    console.error('[Auth] GOOGLE_CLIENT_ID not configured');
    if (window.__errors) window.__errors.show('تسجيل الدخول غير مُعد بعد');
    return Promise.reject(new Error('GOOGLE_CLIENT_ID not configured'));
  }

  return loadGIS().then(function () {
    return new Promise(function (resolve, reject) {
      // Initialize GIS with callback
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: function (response) {
          if (!response || !response.credential) {
            reject(new Error('No credential received from Google'));
            return;
          }
          var payload = decodeJwt(response.credential);
          if (!payload) {
            reject(new Error('Failed to decode Google credential'));
            return;
          }

          var email = payload.email || '';
          var displayName = payload.name || '';
          var photoURL = payload.picture || '';

          // Send to backend to create/get user
          var base = window.__api._getBase();
          fetch(base + '/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              displayName: displayName,
              photoURL: photoURL
            })
          }).then(function (resp) {
            if (!resp.ok) {
              return resp.json().then(function (err) {
                throw new Error(err.error || 'Backend auth failed');
              });
            }
            return resp.json();
          }).then(function (data) {
            // Store user data from backend
            storeUser(data);
            _notifyAuthListeners(getStoredUser());
            resolve(data);
          }).catch(function (err) {
            console.error('[Auth] Backend auth failed:', err);
            reject(err);
          });
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Show One Tap prompt
      google.accounts.id.prompt(function (notification) {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap not shown — try rendering a button as fallback
          console.warn('[Auth] One Tap not displayed, showing fallback');
          // Create a temporary container for the rendered button
          var container = document.createElement('div');
          container.id = 'gis-fallback-container';
          container.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:white;padding:30px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
          document.body.appendChild(container);

          google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });

          // Add close button
          var closeBtn = document.createElement('button');
          closeBtn.textContent = '✕';
          closeBtn.style.cssText = 'position:absolute;top:8px;left:8px;background:none;border:none;font-size:20px;cursor:pointer;color:#666;';
          closeBtn.onclick = function () {
            container.remove();
            reject(new Error('Sign-in cancelled'));
          };
          container.appendChild(closeBtn);
        }
      });
    });
  });
};

window.__auth.signOut = function () {
  clearStoredUser();
  _notifyAuthListeners(null);
  // Disable GIS auto-select
  if (window.google && window.google.accounts && window.google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  return Promise.resolve();
};

window.__auth.onStateChanged = function (callback) {
  // Immediately call with current state
  setTimeout(function () { callback(_currentStoredUser); }, 0);
  _authListeners.push(callback);
  return function () {
    var idx = _authListeners.indexOf(callback);
    if (idx !== -1) _authListeners.splice(idx, 1);
  };
};

window.__auth.getCurrentUser = function () {
  return window.__fb.auth.currentUser;
};

window.__auth.updateDisplayName = function (uid, name) {
  var user = getStoredUser();
  if (!user) return Promise.reject(new Error('No authenticated user'));
  var base = window.__api._getBase();
  return fetch(base + '/api/users/update-profile', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + uid,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uid: uid, displayName: name })
  }).then(function (resp) {
    if (!resp.ok) {
      return resp.json().then(function (err) { throw new Error(err.error || 'Update failed'); });
    }
    return resp.json();
  }).then(function (data) {
    // Update stored user
    localStorage.setItem('userDisplayName', data.displayName || name);
    _notifyAuthListeners(getStoredUser());
    return data;
  });
};

// ============================================================
// Dynamically load the remaining compat scripts in order
// ============================================================
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
