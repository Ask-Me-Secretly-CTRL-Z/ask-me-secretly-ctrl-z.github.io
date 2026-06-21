window.__ui = {};

window.__ui.showScreen = function (screenId) {
  var current = document.querySelector('.screen.active');
  var next = document.getElementById(screenId);
  if (!next) return;

  if (current) {
    current.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(function () {
      current.classList.remove('active');
      current.style.animation = '';
    }, 200);
  }

  setTimeout(function () {
    next.classList.add('active');
    next.style.animation = 'fadeIn 0.4s ease forwards';
    setTimeout(function () {
      next.style.animation = '';
    }, 400);
  }, current ? 200 : 0);
};

window.__ui.showModal = function (contentHtml) {
  var existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = '<div class="modal-content">' + window.__security.sanitizeHtml(contentHtml) + '</div>';

  var escHandler = function (e) {
    if (e.key === 'Escape') {
      window.__ui.hideModal();
    }
  };
  overlay._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      window.__ui.hideModal();
    }
  });

  document.body.appendChild(overlay);

  setTimeout(function () {
    var content = overlay.querySelector('.modal-content');
    if (content) content.scrollTop = 0;
    var firstFocusable = overlay.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus({preventScroll: true});
  }, 100);

  return overlay;
};

window.__ui.hideModal = function () {
  var modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.style.animation = 'overlayOut 0.2s ease forwards';
    var content = modal.querySelector('.modal-content');
    if (content) content.style.animation = 'modalOut 0.2s ease forwards';
    if (modal._escHandler) document.removeEventListener('keydown', modal._escHandler);
    setTimeout(function () { modal.remove(); }, 200);
  }
};

window.__ui.showToast = function (message, duration) {
  var existing = document.querySelector('.toast');
  if (existing) {
    existing.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(function () {
      if (existing.parentNode) existing.remove();
      window.__ui._showToast(message, duration || 3000);
    }, 200);
    return;
  }
  window.__ui._showToast(message, duration || 3000);
};

window.__ui._showToast = function (message, duration) {
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () {
    if (toast.parentNode) {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
    }
  }, duration);
};

window.__ui.charCount = function (input, display) {
  input.addEventListener('input', function () {
    var len = input.value.length;
    display.textContent = len;
    display.parentNode.className = 'char-count' +
      (len > 400 ? ' near-limit' : '') +
      (len >= 500 ? ' at-limit' : '');
  });
};

window.__ui.copyToClipboard = function (text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
};
