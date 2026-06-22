;(function () {
  var currentUser = null;
  var questionsListener = null;
  var selectedTheme = null;
  var initError = null;

  async function init() {
    try {
      window.__fb.database.ref('shortUrls/_backend_/url').once('value').then(function (snap) {
        var val = snap.val();
        if (val) {
          window.__BACKEND_API_URL = val + '/api/questions';
        }
      }).catch(function () {});

      // 1. BLOCK كل حاجة لحد ما getRedirectResult يخلص
      var result;
      try {
        result = await window.__fb.auth.getRedirectResult();
      } catch (err) {
        console.error('[App] getRedirectResult error:', err.code || err.message || err);
      }

      // 2. لو الـ redirect رجع بمستخدم — ادخله الداشبورد وخلاص
      if (result && result.user) {
        console.log('[App] Redirect login successful');
        safelyShowDashboard(result.user);
        bindGlobalUI();
        return;
      }

      // 3. تحقق من جلسة سابقة (متزامن)
      var existing = window.__fb.auth.currentUser;
      if (existing) {
        safelyShowDashboard(existing);
        bindGlobalUI();
        return;
      }

      // 3.5. مفيش مستخدم — استمع للتغيرات
      try { localStorage.removeItem('__auth_method'); } catch (e) {}

      // 4. مفيش مستخدم — استمع للتغيرات
      setupAuthObserver();
      bindGlobalUI();
    } catch (e) {
      initError = e;
      console.error('[App] Init error:', e);
      window.__hideLoader();
      document.body.innerHTML = '<div style="padding:60px 30px;text-align:center;font-family:Cairo,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;">' +
        '<div style="font-size:64px;margin-bottom:20px;">😅</div>' +
        '<h2 style="font-size:24px;margin-bottom:10px;color:#1e293b;">عذرًا، الموقع تعب شوية</h2>' +
        '<p style="color:#64748b;margin-bottom:30px;font-size:16px;">' + e.message + '</p>' +
        '<button onclick="location.reload()" style="padding:14px 40px;border:none;border-radius:16px;background:linear-gradient(135deg,#1e293b,#0f172a);color:white;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(30,41,59,0.3);">حاول مرة أخرى 🔄</button>' +
        '</div>';
    }
  }

  function safelyShowDashboard(user) {
    try {
      window.__hideLoader();
      currentUser = user;
      var route = window.__router.init();
      if (route === 'question') {
        setupQuestionPage();
      } else {
        loadDashboard(user);
      }
    } catch (e) {
      console.error('[App] safelyShowDashboard error:', e);
      // لو حصل أي خطأ في عرض الداشبورد، متظهرش اللوجين
      // الداشبورد باين فعلًا (showScreen اشتغل) والخطأ في البيانات بس
    }
  }

  function setupAuthObserver() {
    var route = window.__router.init();
    if (route === 'question') {
      setupQuestionPage();
      window.__auth.onStateChanged(function (user) {
        window.__hideLoader();
      });
    } else {
      var unsub = window.__fb.auth.onAuthStateChanged(function (user) {
        unsub();
        window.__hideLoader();
        if (user) {
          currentUser = user;
          loadDashboard(user);
        } else {
          currentUser = null;
          window.__ui.showScreen('login-screen');
        }
      });
    }
  }

  function setupQuestionPage() {
    var targetVal = window.__router.currentTarget;
    var validation = window.__router.validateUid(targetVal);
    var warnEl = document.getElementById('uid-warning');
    if (validation.problems.length > 0) {
      var html = '⚠️ اللينك ده غلط يا باشا! دور على الحرف الناقص أو الزيادة.<br>';
      html += validation.problems.map(function (p) { return '• ' + p.message; }).join('<br>');
      if (warnEl) { warnEl.innerHTML = html; warnEl.style.display = 'block'; }
    } else {
      if (warnEl) { warnEl.style.display = 'none'; }
    }
    window.__router.resolveShortUrl(validation.cleaned).then(function (actualUid) {
      showQuestionPage(actualUid, targetVal, validation.problems.length);
    }).catch(function () {
      showQuestionPage(validation.cleaned, targetVal, validation.problems.length);
    });
  }

  function loadDashboard(user) {
    if (!user || !user.uid) { window.__ui.showScreen('login-screen'); return; }
    var themeBtn = document.getElementById('global-theme-btn');
    if (themeBtn) themeBtn.style.display = '';
    window.__ui.showScreen('dashboard-screen');

    var nameEl = document.getElementById('user-display-name');
    window.__fb.getUserRef(user.uid).once('value').then(function (snap) {
      var data = snap.val();
      if (data && data.displayName) {
        nameEl.textContent = data.displayName;
      } else {
        nameEl.textContent = user.displayName || 'مستخدم';
      }

      var shortName = data && data.shortName ? data.shortName : null;
      var userLinkEl = document.getElementById('user-link');
      if (userLinkEl) { userLinkEl.value = window.__router.buildLink(user.uid, shortName); }

      var checkmark = document.getElementById('short-url-checkmark');
      var shortBtn = document.getElementById('short-url-toggle-btn');
      if (shortName) {
        if (checkmark) checkmark.style.display = 'inline';
        if (shortBtn) { shortBtn.innerHTML = '✓ الرابط القصير'; shortBtn.style.background = '#16a34a'; }
      } else {
        if (checkmark) checkmark.style.display = 'none';
        if (shortBtn) { shortBtn.innerHTML = '🔗 الرابط القصير'; shortBtn.style.background = '#1e293b'; }
      }
    }).catch(function (err) {
      console.error('[App] Failed to load user data:', err);
      nameEl.textContent = user.displayName || 'مستخدم';
    });

    if (questionsListener) questionsListener();
    questionsListener = window.__questions.listen(user.uid, renderQuestions);

    window.__themes.load(user.uid).then(function (themeId) {
      if (themeId !== null && themeId !== undefined) {
        window.__themes.apply(themeId);
        selectedTheme = themeId;
      } else {
        var pending = null;
        try { pending = parseInt(localStorage.getItem('pendingTheme'), 10); } catch(e) {}
        if (pending !== null && !isNaN(pending)) {
          window.__themes.apply(pending);
          selectedTheme = pending;
          window.__themes.save(user.uid, pending);
          try { localStorage.removeItem('pendingTheme'); } catch(e) {}
        } else {
          window.__themes.apply(2);
          selectedTheme = 2;
        }
      }
    }).catch(function (err) {
      console.error('[App] Failed to load theme:', err);
    });

    bindDashboardUI(user);
  }

  function showQuestionPage(targetUid, originalInput, syncProblemCount) {
    try {
      var themeBtn = document.getElementById('global-theme-btn');
      if (themeBtn) themeBtn.style.display = 'none';
      window.__hideLoader();
      window.__ui.showScreen('question-screen');
      document.getElementById('visitor-login').classList.add('hidden');
      document.getElementById('question-form').classList.remove('hidden');

      var warnEl = document.getElementById('uid-warning');

      // Force-hide fuzzy warning area (leave sync-validation warnings visible if any)
      if (warnEl && !syncProblemCount) { warnEl.style.display = 'none'; warnEl.innerHTML = ''; }

      function keyToLabel(key) {
        return key.replace(/[-]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      }

      function runFuzzyMatch(input) {
        if (!input) return;
        window.__router.fuzzyMatch(input).then(function (fuzzy) {
          if (fuzzy.closest && fuzzy.distance > 0 && fuzzy.distance <= 3) {
            var link = window.__router.buildLink(fuzzy.closest);
            var msg = '';
            if (fuzzy.diffType === 'missing-dash') {
              msg = '⚠️ اللينك ناقص علامة (-) يا باشا، اكتبها بعد الحرف كذا.<br>';
            } else {
              msg = '⚠️ أنت كتبت "' + input + '" غلط، قصدك "' + fuzzy.closest + '"؟<br>';
            }
            msg += '🤔 جرب: <a href="' + link + '" style="color:#dc2626;text-decoration:underline;font-weight:700;">' + fuzzy.closest + '</a>';
            if (warnEl) { warnEl.innerHTML = msg; warnEl.style.display = 'block'; }
          } else if (!fuzzy.closest && (!syncProblemCount || syncProblemCount === 0)) {
            if (warnEl) {
              warnEl.innerHTML = '⚠️ اللينك ده ملوش أي أساس في السيستم، اتأكد من الحروف يا باشا.';
              warnEl.style.display = 'block';
            }
          }
        });
      }

      function showName(label) {
        document.getElementById('recipient-name').textContent = label;
      }

      // Check if the original input exists as a short URL key (no auth needed)
      if (originalInput) {
        window.__fb.database.ref('shortUrls/' + originalInput).once('value').then(function (snap) {
          if (snap.exists()) {
            // Exact short URL match — success
            var data = snap.val();
            showName(data.name || keyToLabel(originalInput));
            if (warnEl) { warnEl.style.display = 'none'; warnEl.innerHTML = ''; }
          } else {
            // Not a short URL key — fall back to raw UID lookup (requires auth)
            window.__questions.getRecipientName(targetUid).then(function (name) {
              if (name) {
                showName(name);
              } else {
                showName('حساب غير مسجل');
                runFuzzyMatch(originalInput);
              }
            }).catch(function (err) {
              console.error('[App] Failed to load recipient name:', err);
              showName('حساب غير مسجل');
              if (syncProblemCount === 0) { runFuzzyMatch(originalInput); }
            });
          }
        });
      } else {
        showName('حساب غير مسجل');
      }

      document.getElementById('submit-question-btn').onclick = function () {
        var btn = this;
        var input = document.getElementById('question-input');
        var text = input.value;

        if (window.__questions._submitting) return;

        if (!window.__security.checkRateLimit()) {
          window.__errors.show('تمهل شوية...');
          return;
        }

        window.__questions._submitting = true;
        input.value = '';
        document.getElementById('char-count').textContent = '0';
        btn.disabled = true;
        btn.classList.add('btn-loading');
        window.__questions.submit(targetUid, text).then(function () {
          window.__ui.showScreen('success-screen');
          startCountdown();
        }).catch(function (err) {
          input.value = text;
          document.getElementById('char-count').textContent = text.length;
          window.__errors.handle(err);
        }).finally(function () {
          window.__questions._submitting = false;
          btn.disabled = false;
          btn.classList.remove('btn-loading');
        });
      };

      var qInput = document.getElementById('question-input');
      var qBtn = document.getElementById('submit-question-btn');
      window.__ui.charCount(qInput, document.getElementById('char-count'));
      function forceValidateForm() {
        var len = qInput.value.trim().length;
        var turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
        var hasToken = turnstileInput && turnstileInput.value && turnstileInput.value.trim() !== '';
        if (len >= 3 && len <= 500 && hasToken) {
          qBtn.removeAttribute('disabled');
          qBtn.style.opacity = '1';
          qBtn.style.cursor = 'pointer';
        } else {
          qBtn.setAttribute('disabled', 'true');
          qBtn.style.opacity = '0.5';
          qBtn.style.cursor = 'not-allowed';
        }
      }
      qInput.addEventListener('input', forceValidateForm);
      qInput.addEventListener('keyup', forceValidateForm);
      qInput.addEventListener('paste', function () {
        setTimeout(forceValidateForm, 0);
      });
      window.__questions._intervalId = setInterval(forceValidateForm, 500);
      qInput.addEventListener('input', function () {
        var val = qInput.value;
        if (val.length === 0) { qInput.dir = 'rtl'; qInput.style.textAlign = 'right'; return; }
        var isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(val.charAt(0));
        qInput.dir = isArabic ? 'rtl' : 'ltr';
        qInput.style.textAlign = isArabic ? 'right' : 'left';
      });

      document.getElementById('visitor-google-login-btn').onclick = function () {
        window.__auth.signInWithGoogle();
      };
    } catch (e) {
      console.error('[App] Question page error:', e);
    }
  }

  function renderQuestions(questions) {
    var list = document.getElementById('questions-list');
    var activeQuestions = questions.filter(function (q) {
      return q.archived !== true;
    });
    if (activeQuestions.length === 0) {
      list.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">🫣</div>' +
        '<p class="empty-message">لسه مفيش حد عبرك.. ابعت اللينك لصحابك طيب!</p>' +
        '<p class="empty-hint">وزعه على الأستوري و الهايلايت وهتلاقي الفضايح هنا 😂</p>' +
        '</div>';
      return;
    }

    list.innerHTML = '';
    activeQuestions.forEach(function (q, index) {
      var item = document.createElement('div');
      item.className = 'question-item';
      item.style.animationDelay = (index * 0.06) + 's';

      var text = document.createElement('p');
      text.className = 'question-text';
      text.textContent = q.text;
      text.dir = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(q.text.charAt(0)) ? 'rtl' : 'ltr';
      text.style.textAlign = q.text.length > 0 && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(q.text.charAt(0)) ? 'right' : 'left';

      var footer = document.createElement('div');
      footer.className = 'question-footer';

      var date = document.createElement('span');
      date.className = 'date';
      if (q.timestamp) {
        var d = new Date(q.timestamp);
        date.textContent = d.toLocaleDateString('ar-EG', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      } else {
        date.textContent = 'منذ قليل';
      }

      var actions = document.createElement('div');
      actions.className = 'question-actions';

      var pubBtn = document.createElement('button');
      pubBtn.className = 'publish-btn';
      pubBtn.innerHTML = '📸 نزّلها ستوري';
      pubBtn.onclick = function () {
        var userLink = document.getElementById('user-link').value;
        window.__story.showColorPicker(q.text, userLink);
      };

      actions.appendChild(pubBtn);
      footer.appendChild(date);
      footer.appendChild(actions);
      item.appendChild(text);
      item.appendChild(footer);
      list.appendChild(item);
    });
  }

  function startCountdown() {
    var count = 5;
    var rocketPhase = document.getElementById('rocket-phase');
    var successPhase = document.getElementById('success-phase');
    var countdownEl = document.getElementById('countdown');
    var msgEl = document.querySelector('.sending-msg');
    if (!rocketPhase || !successPhase || !countdownEl) return;
    rocketPhase.style.display = '';
    successPhase.style.display = 'none';
    countdownEl.textContent = '5';

    var msgs = [
      '',
      'لسه شوية وهيوصل... 🤞',
      'بيفتح المظلة... 🪂',
      'شيله شيله الصاروخ نازل! 💨',
      'بتجهز الصاروخ... 🚀🔥'
    ];

    var timer = setInterval(function () {
      count--;
      countdownEl.textContent = count;
      if (msgs[count]) msgEl.textContent = msgs[count];
      if (count <= 0) {
        clearInterval(timer);
        rocketPhase.style.display = 'none';
        successPhase.style.display = '';
      }
    }, 1000);
  }

  function enableShortUrl(name, user, btn, checkmark, linkEl) {
    function slugify(s) {
      return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F-]/g, '');
    }
    var baseCode = slugify(name);
    if (!baseCode) { baseCode = user.uid.substring(0, 8); }

    function trySave(code, retries) {
      if (retries <= 0) {
        window.__errors.show('مقدرناش نحدد الاسم، جرب تاني');
        btn.disabled = false;
        btn.innerHTML = '🔗 الرابط القصير';
        return;
      }
      window.__fb.getShortUrlRef(code).once('value').then(function (snap) {
        if (snap.exists() && snap.val().uid !== user.uid) {
          trySave(baseCode + '-' + retries, retries - 1);
          return;
        }
        window.__fb.getUserRef(user.uid).child('shortName').once('value').then(function (oldSnap) {
          var ops = [];
          var old = oldSnap.val();
          if (old) ops.push(window.__fb.getShortUrlRef(old).remove());
          ops.push(window.__fb.getShortUrlRef(code).set({ uid: user.uid }));
          ops.push(window.__fb.getUserRef(user.uid).child('shortName').set(code));
          return Promise.all(ops);
        }).then(function () {
          linkEl.value = window.__router.buildLink(user.uid, code);
          checkmark.style.display = 'inline';
          btn.innerHTML = '✓ الرابط القصير';
          btn.style.background = '#16a34a';
          btn.disabled = false;
          window.__ui.showToast('تم تفعيل الرابط القصير!');
        }).catch(function (err) {
          console.error('[App] Short URL error:', err);
          window.__errors.show('فيه مشكلة حصلت، حاول تاني');
          btn.disabled = false;
          btn.innerHTML = '🔗 الرابط القصير';
        });
      });
    }
    trySave(baseCode, 5);
  }

  function bindDashboardUI(user) {
    var editBtn = document.getElementById('edit-name-btn');
    editBtn.onclick = function () {
      var overlay = window.__ui.showModal('\
        <h3>غير اسمك</h3>\
        <input type="text" id="modal-name-input" style="\
          width:100%; padding:14px; border:2px solid var(--border-color);\
          border-radius:12px; font-family:Cairo,sans-serif; font-size:16px;\
          margin:15px 0; text-align:right;\
        ">\
        <button id="modal-save-name" class="btn btn-primary" style="width:100%;">حفظ</button>\
      ');
      var input = document.getElementById('modal-name-input');
      input.value = document.getElementById('user-display-name').textContent;
      input.focus();
      document.getElementById('modal-save-name').onclick = function () {
        var btn = this;
        var name = window.__security.sanitize(input.value);
        if (!window.__security.validateName(name)) {
          window.__errors.show('الاسم غير صالح');
          return;
        }
        btn.disabled = true;
        btn.classList.add('btn-loading');
        window.__auth.updateDisplayName(user.uid, name).then(function () {
          document.getElementById('user-display-name').textContent = name;
          window.__ui.hideModal();
          window.__ui.showToast('تم الحفظ');
          var checkmark = document.getElementById('short-url-checkmark');
          if (checkmark && checkmark.style.display !== 'none') {
            enableShortUrl(name, user, document.getElementById('short-url-toggle-btn'), checkmark, document.getElementById('user-link'));
          }
        }).catch(function (err) {
          window.__errors.handle(err);
        }).finally(function () {
          btn.disabled = false;
          btn.classList.remove('btn-loading');
        });
      };
    };

    editBtn.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        editBtn.onclick();
      }
    };

    document.getElementById('copy-link-btn').onclick = function () {
      window.__ui.copyToClipboard(document.getElementById('user-link').value);
      window.__ui.showToast('تم النسخ! وزعه على صحابك');
    };

    document.getElementById('share-link-btn').onclick = function () {
      var url = document.getElementById('user-link').value;
      var name = document.getElementById('user-display-name').textContent;
      var tipHtml =
        '<div style="text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:10px;">🛑</div>' +
          '<h3 style="margin:0 0 15px;">لا لا لا، ستوب ستوب ستوب يا معلم 😂</h3>' +
          '<div style="background:#fef3c7;border-radius:12px;padding:15px;margin-bottom:15px;text-align:right;">' +
            '<p style="margin:0 0 10px;font-weight:700;font-size:15px;color:#92400e;">بص يا باشا، أنا عايزك تسمع الكلام ده عشان متجيش بعد ساعة تقول "اللينك مش شغال!"</p>' +
            '<div style="display:flex;flex-direction:column;gap:8px;">' +
              '<div style="display:flex;align-items:center;gap:10px;background:white;padding:10px 12px;border-radius:10px;">' +
                '<span style="background:#1e293b;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">١</span>' +
                '<span style="color:#1e293b;font-size:14px;">دوس على <strong>"انسخ اللينك"</strong> بتاعك الأول — خد نسخة في الجونب</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:10px;background:white;padding:10px 12px;border-radius:10px;">' +
                '<span style="background:#1e293b;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">٢</span>' +
                '<span style="color:#1e293b;font-size:14px;">كمل واعمل الستوري — الصورة هتبقى نار 🔥</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:10px;background:white;padding:10px 12px;border-radius:10px;">' +
                '<span style="background:#1e293b;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">٣</span>' +
                '<span style="color:#1e293b;font-size:14px;">المفاجأة 🥁: اللينك اللي في الصورة مش هيداس عليه! لأنه صورة يا غالي 😅 خد اللينك كوبي و حطه في الكابشن أو الوصف عشان الناس تدخل عليه</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="background:#f1f5f9;border-radius:12px;padding:15px;margin-bottom:15px;text-align:right;">' +
            '<p style="margin:0 0 10px;font-weight:700;font-size:15px;color:var(--accent-dark);">ازاي تنشرها على كل منصة؟ يلا نعلمك:</p>' +
            '<div style="display:flex;flex-direction:column;gap:8px;">' +
              '<div style="display:flex;align-items:center;gap:10px;background:white;padding:10px 12px;border-radius:10px;">' +
                '<span style="font-size:20px;flex-shrink:0;">💬</span>' +
                '<span style="color:#1e293b;font-size:14px;"><strong>واتساب:</strong> نزّل الصورة، افتح واتساب، اختار "الحالة"، ضيف الصورة، واكتب اللينك في مربع النص — ونشر 😎</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:10px;background:white;padding:10px 12px;border-radius:10px;">' +
                '<span style="font-size:20px;flex-shrink:0;">📸</span>' +
                '<span style="color:#1e293b;font-size:14px;"><strong>انستجرام:</strong> نزّل الصورة، افتح ستوري، ضيف الصورة من الألبوم، واكتب اللينك في النص أو ضيف "Link Sticker" 🎯</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:10px;background:white;padding:10px 12px;border-radius:10px;">' +
                '<span style="font-size:20px;flex-shrink:0;">👻</span>' +
                '<span style="color:#1e293b;font-size:14px;"><strong>سناب شات:</strong> نزّل الصورة، افتح الكاميرا، ضيف الصورة من الألبوم، وحط اللينك في النص اللي فوق. أو استخدم خاصية "Link" في سناب 🚀</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p style="color:#666;font-size:13px;margin:0 0 15px;">وبكده اللينك شغال والصورة نضيفة وانت في البر 👌🔥</p>' +
          '<button id="tip-got-it-btn" class="btn btn-primary" style="width:100%;justify-content:center;">فهمت يا فندم، كمل بقى</button>' +
        '</div>';
      window.__ui.showModal(tipHtml);
      document.getElementById('tip-got-it-btn').onclick = function () {
        window.__ui.hideModal();
        window.__story.showColorPicker('اسأل ' + name + ' بسرية', url);
      };
    };

    document.getElementById('short-url-toggle-btn').onclick = function () {
      var btn = this;
      var checkmark = document.getElementById('short-url-checkmark');
      var linkEl = document.getElementById('user-link');

      if (checkmark.style.display !== 'none') {
        checkmark.style.display = 'none';
        linkEl.value = window.__router.buildLink(user.uid);
        btn.innerHTML = '🔗 الرابط القصير';
        btn.style.background = '#1e293b';
        window.__ui.showToast('تم إلغاء الرابط القصير');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = 'جاري...';
      var name = document.getElementById('user-display-name').textContent.trim();
      if (!name || name === 'مستخدم') { name = user.uid.substring(0, 8); }
      enableShortUrl(name, user, btn, checkmark, linkEl);
    };
  }

  function bindGlobalUI() {
    document.getElementById('google-login-btn').onclick = function () {
      if (selectedTheme !== null) {
        try { localStorage.setItem('pendingTheme', selectedTheme); } catch(e) {}
      }
      window.__auth.signInWithGoogle().catch(function (err) {
        window.__errors.handle(err);
      });
    };

    document.getElementById('logout-btn').onclick = function () {
      if (questionsListener) questionsListener();
      window.__auth.signOut();
      window.__ui.showScreen('login-screen');
    };

    var themeBtn = document.getElementById('global-theme-btn');
    if (themeBtn) {
      themeBtn.onclick = function () {
        window.__ui.showScreen('theme-selection-screen');
      };
      themeBtn.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.__ui.showScreen('theme-selection-screen');
        }
      };
    }

    document.querySelectorAll('.site-option').forEach(function (el) {
      el.onclick = function () {
        selectedTheme = parseInt(this.getAttribute('data-theme'), 10) || 0;
        window.__themes.apply(selectedTheme);
      };
    });

    document.getElementById('save-theme-btn').onclick = function () {
      if (currentUser && selectedTheme !== null) {
        window.__themes.save(currentUser.uid, selectedTheme).then(function () {
          window.__ui.showToast('تم حفظ اللون!');
          window.__ui.showScreen('dashboard-screen');
        }).catch(function (err) {
          window.__errors.handle(err);
        });
      } else if (currentUser) {
        window.__ui.showScreen('dashboard-screen');
      } else {
        window.__ui.showScreen('login-screen');
      }
    };

    document.getElementById('send-again-btn').onclick = function () {
      window.__ui.showScreen('question-screen');
    };

    document.getElementById('back-home-btn').onclick = function () {
      window.location.href = '/';
    };

    var badge = document.getElementById('team-badge');
    var tooltip = document.getElementById('team-tooltip');
    if (badge && tooltip) {
      function dismissTooltip() {
        tooltip.classList.remove('visible');
        badge.classList.remove('active');
      }
      badge.onclick = function (e) {
        e.stopPropagation();
        if (tooltip.classList.contains('visible')) {
          dismissTooltip();
        } else {
          tooltip.classList.add('visible');
          badge.classList.add('active');
        }
      };
      document.onclick = function () {
        if (tooltip.classList.contains('visible')) {
          dismissTooltip();
        }
      };
      badge.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          badge.onclick();
        }
      };
    }
  }

  init();
})();
