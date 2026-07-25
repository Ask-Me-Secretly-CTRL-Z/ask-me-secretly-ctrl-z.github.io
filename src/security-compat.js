window.__security = {};

window.__security.sanitize = function (text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

window.__security.validateQuestion = function (text) {
  return text.length >= 3 && text.length <= 500;
};

window.__security.validateName = function (name) {
  return name && name.trim().length >= 1 && name.trim().length <= 50;
};

window.__security._lastSubmit = 0;
window.__security.sanitizeHtml = function (html) {
  if (typeof html !== 'string') return '';
  var doc = document.createElement('div');
  doc.innerHTML = html;
  var scripts = doc.querySelectorAll('script');
  for (var i = 0; i < scripts.length; i++) scripts[i].remove();
  var dangerous = doc.querySelectorAll('iframe, object, embed, form');
  for (var i = 0; i < dangerous.length; i++) dangerous[i].remove();
  var all = doc.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var attrs = all[i].attributes;
    for (var j = attrs.length - 1; j >= 0; j--) {
      var name = attrs[j].name.toLowerCase();
      var val = (attrs[j].value || '').toLowerCase().trim();
      if (name.startsWith('on') || val.startsWith('javascript:')) {
        all[i].removeAttribute(attrs[j].name);
      }
    }
  }
  return doc.innerHTML;
};

window.__security.checkRateLimit = function () {
  var now = Date.now();
  if (now - window.__security._lastSubmit < 2000) {
    return false;
  }
  window.__security._lastSubmit = now;
  return true;
};
