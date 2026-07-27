window.__fb = window.__fb || {};
window.__fb.auth = window.__fb.auth || firebase.auth();

window.__fb.provider = new firebase.auth.GoogleAuthProvider();
window.__fb.provider.addScope('email');
window.__fb.provider.addScope('profile');
window.__fb.provider.setCustomParameters({
  prompt: 'select_account'
});
