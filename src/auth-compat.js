window.__auth = {};

window.__auth.signInWithGoogle = function () {
  try { localStorage.setItem('__auth_method', 'redirect'); } catch (e) {}
  try {
    return window.__fb.auth.signInWithRedirect(window.__fb.provider);
  } catch (e) {
    try { localStorage.removeItem('__auth_method'); } catch (e2) {}
    return Promise.reject(e);
  }
};

window.__auth.tryPopupFallback = function () {
  return window.__fb.auth.signInWithPopup(window.__fb.provider).then(function (result) {
    try { localStorage.removeItem('__auth_method'); } catch (e) {}
    return result;
  }).catch(function (err) {
    try { localStorage.removeItem('__auth_method'); } catch (e) {}
    throw err;
  });
};

window.__auth.hadPendingRedirect = function () {
  try { return localStorage.getItem('__auth_method') === 'redirect'; } catch (e) { return false; }
};

window.__auth.clearPendingRedirect = function () {
  try { localStorage.removeItem('__auth_method'); } catch (e) {}
};

window.__auth.signOut = function () {
  return window.__fb.auth.signOut().catch(function (error) {
    window.__errors.handle(error);
  });
};

window.__auth.onStateChanged = function (callback) {
  return window.__fb.auth.onAuthStateChanged(callback);
};

window.__auth.getCurrentUser = function () {
  return window.__fb.auth.currentUser;
};

window.__auth.updateDisplayName = function (uid, name) {
  var user = window.__fb.auth.currentUser;
  if (!user) {
    return Promise.reject(new Error('No authenticated user'));
  }
  return user.updateProfile({ displayName: name });
};
