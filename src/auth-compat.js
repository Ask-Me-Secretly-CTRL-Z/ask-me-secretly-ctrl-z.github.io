window.__auth = {};

window.__auth.signInWithGoogle = function () {
  return window.__fb.auth.signInWithRedirect(window.__fb.provider);
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
