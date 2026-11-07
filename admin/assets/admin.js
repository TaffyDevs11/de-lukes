/* De Lukes Admin — tiny helpers: mobile nav, delete confirmation, rich-text editor */
(() => {
  'use strict';
  // Mobile navigation
  const btn = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('a-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => { const o = nav.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', e => { if (nav.classList.contains('is-open') && !nav.contains(e.target) && e.target !== btn) nav.classList.remove('is-open'); });
  }

  // Confirm before destructive actions
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-confirm]');
    if (f && !confirm(f.dataset.confirm)) e.preventDefault();
  }, true);

  // Warn when leaving with unsaved changes
  let dirty = false;
  document.querySelectorAll('.a-form').forEach(f => {
    f.addEventListener('input', () => { dirty = true; });
    f.addEventListener('submit', () => { dirty = false; });
  });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // Rich-text editor (contenteditable → hidden textarea; sanitised again on the server)
  document.querySelectorAll('[data-rte]').forEach(rte => {
    const area = rte.querySelector('.rte__area');
    const out = rte.querySelector('textarea');
    const sync = () => { out.value = area.innerHTML; };
    area.addEventListener('input', sync);
    // Paste as plain text to avoid messy Word/Google Docs formatting
    area.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    rte.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => {
      const cmd = b.dataset.cmd;
      area.focus();
      if (cmd === 'h2' || cmd === 'h3' || cmd === 'blockquote') {
        const cur = document.queryCommandValue('formatBlock').toLowerCase();
        document.execCommand('formatBlock', false, cur === cmd ? 'p' : cmd);
      } else if (cmd === 'link') {
        const url = prompt('Link address (https://…)');
        if (url && /^(https?:\/\/|mailto:|\/)/i.test(url)) document.execCommand('createLink', false, url);
      } else if (cmd === 'image') {
        const url = prompt('Image address (https://… or uploads/…)');
        if (url && /^(https?:\/\/|\/|uploads\/|assets\/)/i.test(url)) document.execCommand('insertImage', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      sync();
    }));
    const form = rte.closest('form');
    if (form) form.addEventListener('submit', sync);
  });
})();
