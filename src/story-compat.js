window.__story = {};

window.__story.autoSizeText = function () {
  var container = document.querySelector('.story-question-wrapper');
  var textElement = document.querySelector('#story-text');
  var maxFontSize = 100;
  var minFontSize = 24;

  textElement.style.fontSize = maxFontSize + 'px';
  textElement.style.whiteSpace = 'normal';

  var current = maxFontSize;
  while (current > minFontSize) {
    if (textElement.scrollHeight <= container.clientHeight && textElement.scrollWidth <= container.clientWidth) {
      break;
    }
    current -= 2;
    textElement.style.fontSize = current + 'px';
  }
};

window.__story.storyColors = [
  { name: 'Green',   gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', textColor: '#ffffff' },
  { name: 'Pink',    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', textColor: '#ffffff' },
  { name: 'Orange',  gradient: 'linear-gradient(135deg, #f09433 0%, #dc2743 100%)', textColor: '#ffffff' },
  { name: 'Purple',  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textColor: '#ffffff' },
  { name: 'White',   gradient: 'linear-gradient(135deg, #f0f0f0 0%, #dcdcdc 100%)', textColor: '#1e293b' }
];

window.__story.selectedColorIndex = 0;

window.__story.getStoryColor = function (index) {
  if (index === undefined || index === null) index = window.__story.selectedColorIndex;
  return window.__story.storyColors[index] || window.__story.storyColors[0];
};

window.__story.selectColor = function (el, index) {
  window.__story.selectedColorIndex = index;
  document.querySelectorAll('.story-color-circle').forEach(function (c) {
    c.classList.remove('active');
  });
  el.classList.add('active');
};

window.__story.showColorPicker = function (questionText, userLink) {
  var html = '<h3>اختار لون الصورة يا باشا</h3>' +
    '<p style="margin-bottom:20px;color:#666;font-size:14px;">كل مره تقدر تختار لون على مزاجك!</p>' +
    '<div class="story-themes">';

  window.__story.storyColors.forEach(function (color, index) {
    var active = index === window.__story.selectedColorIndex ? 'active' : '';
    html += '<div class="theme-circle story-color-circle ' + active + '" ' +
      'style="background:' + color.gradient + '" ' +
      'data-index="' + index + '"></div>';
  });

  html += '</div>' +
    '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button id="story-generate-btn" class="btn btn-primary" style="flex:1;">اعملها بقى</button>' +
      '<button id="story-cancel-btn" class="btn btn-secondary" style="flex:1;">لا مؤاخذة</button>' +
    '</div>';

  var overlay = window.__ui.showModal(html);

  overlay.querySelectorAll('.story-color-circle').forEach(function (circle) {
    circle.onclick = function () {
      var index = parseInt(this.getAttribute('data-index'), 10);
      window.__story.selectColor(this, index);
    };
  });

  document.getElementById('story-generate-btn').onclick = function () {
    window.__ui.hideModal();
    window.__story.shareWithModal(questionText, userLink);
  };

  document.getElementById('story-cancel-btn').onclick = function () {
    window.__ui.hideModal();
  };
};

window.__story.generate = function (questionText, url, bgColor, textColor) {
  var template = document.getElementById('story-template');
  var storyText = document.getElementById('story-text');
  var storyUrl = document.getElementById('story-url');
  var storyCard = template.querySelector('.story-card');
  var storyBody = template.querySelector('.story-body');
  var originalBg = storyCard.style.background;
  var originalColor = storyCard.style.color;
  var originalBodyBg = storyBody.style.background;
  var originalBodyBorder = storyBody.style.borderColor;
  var originalUrlBg = storyUrl.style.background;
  var originalUrlBorder = storyUrl.style.borderColor;
  storyText.textContent = questionText;
  storyText.dir = 'auto';
  window.__story.autoSizeText();
  storyUrl.textContent = url;
  storyUrl.href = url;
  storyCard.style.background = bgColor || window.__story.getStoryColor(0).gradient;
  storyCard.style.color = textColor || '#ffffff';
  storyUrl.style.color = textColor || '#ffffff';

  if (textColor && textColor !== '#ffffff') {
    storyBody.style.background = 'rgba(0, 0, 0, 0.05)';
    storyBody.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    storyUrl.style.background = 'rgba(0, 0, 0, 0.06)';
    storyUrl.style.borderColor = 'rgba(0, 0, 0, 0.1)';
  }

  return html2canvas(storyCard, {
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    width: 1080,
    height: 1920
  }).then(function (canvas) {
    storyCard.style.background = originalBg;
    storyCard.style.color = originalColor;
    storyUrl.style.color = '';
    storyBody.style.background = originalBodyBg;
    storyBody.style.borderColor = originalBodyBorder;
    storyUrl.style.background = originalUrlBg;
    storyUrl.style.borderColor = originalUrlBorder;
    return canvas;
  }).catch(function (err) {
    storyCard.style.background = originalBg;
    storyCard.style.color = originalColor;
    storyUrl.style.color = '';
    storyBody.style.background = originalBodyBg;
    storyBody.style.borderColor = originalBodyBorder;
    storyUrl.style.background = originalUrlBg;
    storyUrl.style.borderColor = originalUrlBorder;
    throw err;
  });
};

window.__story.download = function (canvas, filename) {
  var link = document.createElement('a');
  link.download = filename || 'story.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
};

window.__story.shareWithModal = function (questionText, userLink, colorIndex) {
  window.__ui.showToast('⏳ بنجهز الصورة...');
  var color = window.__story.getStoryColor(colorIndex);
  return window.__story.generate(questionText, userLink, color.gradient, color.textColor).then(function (canvas) {
    var dataUrl = canvas.toDataURL('image/png');
    var shareSupported = !!(navigator.share && navigator.canShare);
    var html =
      '<h3 style="font-size:24px;">✨ صورك جهزت!</h3>' +
      '<p style="color:#64748b;margin-bottom:16px;font-size:14px;">حملها أو شاركها مع صحابك عشان يبدأوا يسألوا</p>' +
      '<div style="margin:15px 0;position:relative;">' +
        '<div style="border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">' +
          '<img src="' + dataUrl + '" style="width:100%;max-height:340px;object-fit:contain;display:block;" alt="Story">' +
        '</div>' +
      '</div>' +
      '<div style="background:linear-gradient(135deg,#f1f5f9,#f8fafc);border-radius:16px;padding:16px;margin-bottom:16px;text-align:right;border:1px solid rgba(30,41,59,0.1);">' +
        '<p style="margin:0 0 10px;font-weight:700;font-size:14px;color:var(--accent-dark);text-align:center;">🚀 ازاي تنشرها على كل منصة؟</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.9);padding:10px 14px;border-radius:12px;">' +
            '<span style="font-size:18px;flex-shrink:0;">💬</span>' +
            '<div style="flex:1;"><strong style="font-size:13px;">واتساب:</strong><span style="color:#64748b;font-size:12px;display:block;"> نزّل الصورة ← افتح واتساب ← "الحالة" ← ضيفها واكتب اللينك</span></div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.9);padding:10px 14px;border-radius:12px;">' +
            '<span style="font-size:18px;flex-shrink:0;">📸</span>' +
            '<div style="flex:1;"><strong style="font-size:13px;">انستجرام:</strong><span style="color:#64748b;font-size:12px;display:block;"> نزّل الصورة ← ستوري ← ضيفها من الألبوم ← ضيف اللينك</span></div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.9);padding:10px 14px;border-radius:12px;">' +
            '<span style="font-size:18px;flex-shrink:0;">👻</span>' +
            '<div style="flex:1;"><strong style="font-size:13px;">سناب شات:</strong><span style="color:#64748b;font-size:12px;display:block;"> نزّل الصورة ← افتح الكاميرا ← ضيفها من الألبوم ← اكتب اللينك</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<button id="story-download-btn" class="btn btn-primary" style="width:100%;justify-content:center;padding:16px;">📥 نزّل الصورة</button>' +
        (shareSupported ? '<button id="story-share-btn" class="btn btn-secondary" style="width:100%;justify-content:center;padding:14px;">📤 شارك دلوقتي</button>' : '') +
        '<button id="story-close-btn" class="btn btn-secondary" style="width:100%;justify-content:center;padding:12px;background:transparent;color:#94a3b8;">لا مؤاخذة</button>' +
      '</div>';
    var overlay = window.__ui.showModal(html);

    document.getElementById('story-download-btn').onclick = function () {
      var btn = this;
      btn.textContent = '✅ تم التحميل';
      btn.disabled = true;
      window.__story.download(canvas, 'story-' + Date.now() + '.png');
      window.__ui.showToast('✅ تم التحميل! افتحه وانشره ستوري');
      setTimeout(function () { btn.textContent = '📥 نزّل الصورة'; btn.disabled = false; }, 2000);
    };

    var shareBtn = document.getElementById('story-share-btn');
    if (shareBtn) {
      shareBtn.onclick = function () {
        if (navigator.share) {
          var btn = this;
          btn.textContent = '⏳ جاري المشاركة...';
          btn.disabled = true;
          canvas.toBlob(function (blob) {
            var file = new File([blob], 'story.png', { type: 'image/png' });
            navigator.share({
              title: 'اسألني بسرية',
              text: questionText,
              files: [file]
            }).then(function () {
              window.__ui.showToast('✅ تم المشاركة!');
            }).catch(function (err) {
              if (err.name !== 'AbortError') {
                window.__story.download(canvas, 'story-' + Date.now() + '.png');
                window.__ui.showToast('تم تحميل الصورة بدل كده');
              }
            }).finally(function () {
              btn.textContent = '📤 شارك دلوقتي';
              btn.disabled = false;
            });
          });
        } else {
          window.__story.download(canvas, 'story-' + Date.now() + '.png');
          window.__ui.showToast('نزّل الصورة وشاركها');
        }
      };
    }

    var closeBtn = document.getElementById('story-close-btn');
    if (closeBtn) closeBtn.onclick = function () { window.__ui.hideModal(); };
  });
};
