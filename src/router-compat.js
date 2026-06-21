window.__router = {};

window.__router.getParam = function (name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
};

window.__router.init = function () {
  var targetVal = window.__router.getParam('u');
  if (targetVal) {
    window.__router.currentTarget = targetVal;
    return 'question';
  }
  return 'app';
};

window.__router.resolveShortUrl = function (value) {
  return window.__fb.getShortUrlRef(value).once('value').then(function (snap) {
    if (snap.exists()) {
      return snap.val().uid;
    }
    return value;
  });
};

window.__router.buildLink = function (uid, shortName) {
  var base = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '/');
  if (shortName) {
    return base + '?u=' + encodeURIComponent(shortName);
  }
  return base + '?u=' + uid;
};

window.__router.levenshtein = function (a, b) {
  var alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  var matrix = [];
  for (var i = 0; i <= blen; i++) matrix[i] = [i];
  for (var j = 0; j <= alen; j++) matrix[0][j] = j;
  for (var i = 1; i <= blen; i++) {
    for (var j = 1; j <= alen; j++) {
      var cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[blen][alen];
};

window.__router.fuzzyMatch = function (uid) {
  var cleaned = uid.replace(/[\\\/\s]/g, '').toLowerCase();
  if (cleaned.length < 2) return Promise.resolve({ input: uid, closest: null, distance: Infinity, diffType: 'none' });
  return window.__fb.database.ref('shortUrls').once('value').then(function (snap) {
    var best = { key: null, dist: Infinity };
    if (!snap.exists()) return { input: uid, closest: null, distance: Infinity, diffType: 'none' };
    snap.forEach(function (child) {
      var key = child.key;
      if (key.indexOf('_') === 0) return;
      var dist = window.__router.levenshtein(cleaned, key.toLowerCase());
      if (dist < best.dist) { best.dist = dist; best.key = key; }
    });
    if (!best.key || best.dist > 3) return { input: uid, closest: null, distance: Infinity, diffType: 'none' };
    var diffType = 'typo';
    if (cleaned.replace(/-/g, '') === best.key.toLowerCase().replace(/-/g, '') && cleaned !== best.key.toLowerCase()) {
      diffType = 'missing-dash';
    }
    return { input: uid, closest: best.key, distance: best.dist, diffType: diffType };
  }).catch(function () {
    return { input: uid, closest: null, distance: Infinity, diffType: 'none' };
  });
};

window.__router.validateUid = function (uid) {
  if (!uid) return { cleaned: uid, problems: [{ message: 'اللينك فاضي' }] };
  var cleaned = uid;
  var problems = [];

  if (/[\\\/]$/.test(uid)) {
    problems.push({ message: 'شيل العلامة أو الحرف الزيادة ده من اللينك يا باشا وابعت' });
    cleaned = uid.replace(/[\\\/]+$/, '');
  }

  if (/\s/.test(cleaned)) {
    problems.push({ message: 'شيل المسافة من اللينك يا باشا وابعت' });
    cleaned = cleaned.replace(/\s/g, '');
  }

  if (/[\\\/]/.test(cleaned)) {
    problems.push({ message: 'فيه حروف غريبة في اللينك، شيلها' });
    cleaned = cleaned.replace(/[\\\/]/g, '');
  }

  if (cleaned.length > 0 && cleaned.length < 10) {
    problems.push({ message: 'اللينك ناقص يا باشا! دور على باقيه وحطه هنا' });
  }

  return { cleaned: cleaned, problems: problems };
};
