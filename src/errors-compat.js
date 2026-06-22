window.__errors = {};

window.__errors.messages = {
  'auth/popup-closed-by-user': 'تم إلغاء تسجيل الدخول',
  'auth/cancelled-popup-request': 'تم إلغاء الطلب',
  'auth/network-request-failed': 'مشكلة في الاتصال. تأكد من النت',
  'auth/popup-blocked': 'الرجاء السماح للنوافذ المنبثقة ثم حاول مرة أخرى',
  'permission-denied': 'ليس لديك صلاحية لهذا الإجراء',
  'backend/400': 'السؤال غير صالح، حاول تاني',
  'backend/429': 'تمهل شوية كده... فيه ناس كتير بتبعت في نفس الوقت',
  'backend/403': 'تعذر التحقق من هويتك، برجاء المحاولة مرة أخرى',
  'backend/0': 'مشكلة في الاتصال بالخادم',
  'default': 'حصل خطأ. حاول تاني'
};

window.__errors.handle = function (error) {
  if (!error) {
    window.__ui.showToast(window.__errors.messages['default']);
    console.error('[Error]', 'Unknown error');
    return;
  }
  var msg = window.__errors.messages[error.code] || window.__errors.messages['default'];
  window.__ui.showToast(msg);
  console.error('[Error]', error.code || error.message);
};

window.__errors.show = function (message) {
  window.__ui.showToast(message);
};
