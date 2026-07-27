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

  var apiUrl = window.__BACKEND_API_URL || '/api/questions';

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
  var ref = window.__fb.getRecipientQuestionsRef(uid);
  ref.orderByChild('timestamp').on('value', function (snapshot) {
    var questions = [];
    snapshot.forEach(function (child) {
      questions.push({
        id: child.key,
        text: child.val().text,
        timestamp: child.val().timestamp,
        published: child.val().published || false,
        archived: child.val().archived
      });
    });
    questions.reverse();
    callback(questions);
  });
  return function () {
    ref.off('value');
  };
};

window.__questions.fetchFromBackend = function (uid) {
  var baseUrl = window.__BACKEND_BASE_URL;
  if (!baseUrl) {
    return Promise.reject(new Error('Backend URL not available'));
  }
  var user = window.__fb.auth.currentUser;
  if (!user) {
    return Promise.reject(new Error('Not authenticated'));
  }
  return user.getIdToken().then(function (idToken) {
    var url = baseUrl + '/api/questions?uid=' + encodeURIComponent(uid);
    return fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + idToken
      }
    });
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
  return window.__fb.getQuestionRef(recipientUid, questionId).child('published').set(!currentStatus);
};

window.__questions.getRecipientName = function (uid) {
  return window.__fb.getUserRef(uid).child('displayName').once('value').then(function (snap) {
    return snap.val();
  });
};
