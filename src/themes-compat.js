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
  return window.__api.post('/api/themes/' + encodeURIComponent(uid), { theme: themeId });
};

window.__themes.load = function (uid) {
  var base = (window.__BACKEND_BASE_URL || '').replace(/\/+$/, '');
  return fetch(base + '/api/themes/' + encodeURIComponent(uid)).then(function (resp) {
    if (!resp.ok) return null;
    return resp.json();
  }).then(function (data) {
    return data && data.theme !== undefined ? data.theme : null;
  }).catch(function () {
    return null;
  });
};
