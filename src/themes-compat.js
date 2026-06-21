window.__themes = {};

window.__themes.apply = function (themeId) {
  document.body.className = document.body.className
    .replace(/theme-\d+/g, '')
    .trim();
  if (themeId !== null && themeId !== undefined) {
    document.body.classList.add('theme-' + themeId);
    var btn = document.querySelector('.site-option[data-theme="' + themeId + '"]');
    if (btn) {
      document.querySelectorAll('.site-option').forEach(function (el) {
        el.classList.remove('selected');
      });
      btn.classList.add('selected');
    }
  }
  var saveBtn = document.getElementById('save-theme-btn');
  if (saveBtn) {
    saveBtn.disabled = false;
  }
};

window.__themes.save = function (uid, themeId) {
  return window.__fb.getUserThemeRef(uid).set(themeId);
};

window.__themes.load = function (uid) {
  return window.__fb.getUserThemeRef(uid).once('value').then(function (snap) {
    return snap.val();
  });
};
