window.__auth = {};

window.__auth.signInWithGoogle = function () {
  try {
    var popupPromise = window.__fb.auth.signInWithPopup(window.__fb.provider);
    return popupPromise.then(function (result) {
      return result.user;
    }).catch(function (error) {
      if (error && (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request' ||
        (error.message && (error.message.indexOf('popup') !== -1 || error.message.indexOf('close') !== -1))
      )) {
        return window.__fb.auth.signInWithRedirect(window.__fb.provider);
      }
      throw error;
    });
  } catch (e) {
    return Promise.reject(e);
  }
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
