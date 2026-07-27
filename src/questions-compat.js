window.__questions = {};

window.__questions._turnstileToken = '';
window.__questions._lastResetTime = 0;
window.__questions._MIN_RESET_INTERVAL = 2000;
window.__questions._submitting = false;

window.__questions.getTurnstileToken = function () {
  return window.__questions._turnstileToken;
};

window.onTurnstileSuccess = function (token) {
  window.__questions._turnstileToken = token;
};

window.onTurnstileExpired = function () {
  window.__questions._turnstileToken = '';
};

window.onTurnstileError = function () {
  window.__questions._turnstileToken = '';
};

window.__questions._resetWidget = function () {
  var now = Date.now();
  if (now - window.__questions._lastResetTime < window.__questions._MIN_RESET_INTERVAL) {
    return;
  }
  if (typeof turnstile !== 'undefined' && turnstile.reset) {
    window.__questions._lastResetTime = now;
    window.__questions._turnstileToken = '';
    turnstile.reset();
  }
};

window.__questions.submit = function (toUid, text) {
  var sanitized = window.__security.sanitize(text);
  if (!window.__security.validateQuestion(sanitized)) {
    window.__errors.show('السؤال قصير جدًا أو غير صالح');
    return Promise.reject(new Error('Invalid question'));
  }

  var key = window.__TURNSTILE_SITEKEY;
  var turnstileOn = key && key.indexOf('__') !== 0;
  var turnstileToken = '';

  if (turnstileOn) {
    if (typeof turnstile !== 'undefined' && turnstile.getResponse) {
      turnstileToken = turnstile.getResponse();
    }
    if (!turnstileToken) {
      turnstileToken = window.__questions._turnstileToken;
    }
    if (!turnstileToken) {
      window.__questions._resetWidget();
      window.__errors.show('برجاء تأكيد أنك مش روبوت');
      return Promise.reject(new Error('Missing Turnstile token'));
    }
  }

  var apiUrl = (window.__BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/questions';

  return fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toUid: toUid,
      text: sanitized,
      turnstileToken: turnstileToken
    })
  }).then(function (response) {
    window.__questions._resetWidget();
    if (!response.ok) {
      return response.json().then(function (errData) {
        var err = new Error(errData.error || response.statusText);
        err.code = 'backend/' + (response.status || 0);
        throw err;
      }).catch(function (parseErr) {
        if (parseErr.code) throw parseErr;
        var err = new Error(response.statusText);
        err.code = 'backend/' + (response.status || 0);
        throw err;
      });
    }
    return response.json();
  }).catch(function (err) {
    window.__questions._resetWidget();
    if (!err.code) {
      err.code = 'backend/0';
    }
    throw err;
  });
};

window.__questions.listen = function (uid, callback) {
  var _intervalId = null;
  var _stopped = false;

  function poll() {
    window.__questions.fetchFromBackend(uid).then(function (questions) {
      if (!_stopped) callback(questions);
    }).catch(function (err) {
      console.error('[Questions] Poll error:', err);
    });
  }

  poll();
  _intervalId = setInterval(poll, 5000);

  return function () {
    _stopped = true;
    if (_intervalId) clearInterval(_intervalId);
  };
};

window.__questions.fetchFromBackend = function (uid) {
  var baseUrl = (window.__BACKEND_BASE_URL || '').replace(/\/+$/, '');
  var storedUid = localStorage.getItem('uid');
  if (!storedUid) {
    return Promise.reject(new Error('Not authenticated'));
  }
  var url = baseUrl + '/api/questions?uid=' + encodeURIComponent(uid);
  return fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + storedUid
    }
  }).then(function (response) {
    if (!response.ok) {
      throw new Error('Failed to fetch questions: ' + response.status);
    }
    return response.json();
  }).then(function (data) {
    return data.questions || [];
  });
};

window.__questions.togglePublish = function (recipientUid, questionId, currentStatus) {
  return window.__api.post('/api/questions/' + questionId + '/toggle-publish', {
    uid: recipientUid,
    published: !currentStatus
  });
};

window.__questions.getRecipientName = function (uid) {
  var base = (window.__BACKEND_BASE_URL || '').replace(/\/+$/, '');
  return fetch(base + '/api/users/me?uid=' + encodeURIComponent(uid)).then(function (resp) {
    if (!resp.ok) return null;
    return resp.json();
  }).then(function (data) {
    return data && data.user && data.user.displayName ? data.user.displayName : null;
  }).catch(function () {
    return null;
  });
};
