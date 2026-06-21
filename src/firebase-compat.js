window.__fb = {
  auth: firebase.auth(),
  database: firebase.database()
};

window.__fb.provider = new firebase.auth.GoogleAuthProvider();
window.__fb.provider.addScope('email');
window.__fb.provider.addScope('profile');
window.__fb.provider.setCustomParameters({
  prompt: 'select_account'
});

window.__fb.getUserRef = function (uid) {
  return window.__fb.database.ref('users/' + uid);
};

window.__fb.getRecipientQuestionsRef = function (uid) {
  return window.__fb.database.ref('questions/' + uid);
};

window.__fb.getQuestionRef = function (recipientUid, questionId) {
  return window.__fb.database.ref('questions/' + recipientUid + '/' + questionId);
};

window.__fb.getUserThemeRef = function (uid) {
  return window.__fb.database.ref('users/' + uid + '/theme');
};

window.__fb.getUserDisplayNameRef = function (uid) {
  return window.__fb.database.ref('users/' + uid + '/displayName');
};

window.__fb.getShortUrlRef = function (shortName) {
  return window.__fb.database.ref('shortUrls/' + shortName);
};
