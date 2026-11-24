/* Единый выпадающий список вместо системного <select>.
   Настоящий <select> остаётся в форме скрытым: из него читаются значения и приходят события change.
   Кнопка и список рисуются в дизайне системы. Подхватывает и списки, которые появляются после render() и в окнах. */
(function () {
  const CHEV = '<svg class="cs-chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5l5 5 5-5"/></svg>';
  const TICK = '<svg class="cs-tick" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>';
  const CAL = '<svg class="cs-chev" viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2.5"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/></svg>';
  let pop = null, cur = null, idx = -1; /* открытый список, его select, подсвеченный пункт */

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isDate = el => el.tagName === 'INPUT';
  const p2 = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => y + '-' + p2(m + 1) + '-' + p2(d);
  const show = v => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  let view = null; /* месяц, показанный в календаре: [год, месяц] */
  const label = sel => { if (isDate(sel)) return show(sel.value); const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; };
  const btnOf = sel => sel.nextElementSibling && sel.nextElementSibling.classList.contains('cs-btn') ? sel.nextElementSibling : null;

  function enhance(sel) {
    if (sel.multiple || sel.dataset.cs) return;
    sel.dataset.cs = '1';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = sel.className + ' cs-btn';
    b.setAttribute('aria-haspopup', isDate(sel) ? 'dialog' : 'listbox');
    b.setAttribute('aria-expanded', 'false');
    b.disabled = sel.disabled;
    const named = sel.getAttribute('aria-label'); if (named) b.setAttribute('aria-label', named);
    if (sel.id) { b.id = sel.id + '-cs'; const l = document.querySelector('label[for="' + sel.id + '"]'); if (l) l.htmlFor = b.id; }
    b.innerHTML = '<span class="cs-val"></span>' + (isDate(sel) ? CAL : CHEV);
    if (isDate(sel)) b.firstChild.dataset.ph = 'дд.мм.гггг';
    sel.after(b);
    sel.hidden = true; sel.tabIndex = -1;
    sync(sel);
    if (document.activeElement === sel) b.focus();
  }
  function sync(sel) {
    const b = btnOf(sel); if (!b) return;
    const v = b.querySelector('.cs-val'), t = label(sel);
    if (v.textContent !== t) v.textContent = t; /* без лишней записи, иначе наблюдатель зациклится */
  }

  function close(refocus) {
    if (!pop) return;
    const b = btnOf(cur);
    pop.remove(); pop = null;
    if (b) { b.setAttribute('aria-expanded', 'false'); b.classList.remove('open'); if (refocus) b.focus(); }
    cur = null; idx = -1;
  }

  function mark(i, scroll) {
    if (!pop) return;
    const items = pop.children;
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    [...items].forEach((el, k) => el.classList.toggle('hi', k === idx));
    if (scroll) items[idx].scrollIntoView({ block: 'nearest' });
  }

  function pick(i) {
    const sel = cur; if (!sel || !sel.options[i]) return;
    const changed = sel.selectedIndex !== i;
    close(true);
    if (changed) { sel.selectedIndex = i; sync(sel); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  function place() {
    const b = btnOf(cur); if (!b || !pop) return;
    const r = b.getBoundingClientRect();
    pop.style.minWidth = r.width + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
    const h = pop.offsetHeight, below = innerHeight - r.bottom - 12, above = r.top - 12;
    if (h > below && above > below) { pop.style.top = ''; pop.style.bottom = (innerHeight - r.top + 6) + 'px'; pop.style.maxHeight = Math.min(280, above) + 'px'; }
    else { pop.style.bottom = ''; pop.style.top = (r.bottom + 6) + 'px'; pop.style.maxHeight = Math.min(280, below) + 'px'; }
  }

  function drawCal() {
    const [y, m] = view, first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const now = new Date(), today = iso(now.getFullYear(), now.getMonth(), now.getDate());
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const v = iso(y, m, d);
      cells += '<button type="button" class="cs-day' + (v === cur.value ? ' on' : '') + (v === today ? ' now' : '') + '" data-d="' + v + '">' + d + '</button>';
    }
    pop.innerHTML = '<div class="cs-ch"><button type="button" class="cs-nav" data-m="-1" aria-label="Предыдущий месяц">' + '<svg viewBox="0 0 20 20"><path d="M12 5l-5 5 5 5"/></svg></button><b>' + MONTHS[m] + ' ' + y + '</b><button type="button" class="cs-nav" data-m="1" aria-label="Следующий месяц"><svg viewBox="0 0 20 20"><path d="M8 5l5 5-5 5"/></svg></button></div>'
      + '<div class="cs-wd">' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => '<span>' + w + '</span>').join('') + '</div><div class="cs-days">' + cells + '</div>'
      + '<div class="cs-cf"><button type="button" class="cs-clear">Очистить</button><button type="button" class="cs-today" data-d="' + today + '">Сегодня</button></div>';
  }
  function pickDate(v) {
    const el = cur, changed = el.value !== v;
    close(true);
    if (changed) { el.value = v; sync(el); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  function open(sel) {
    if (pop) { const same = cur === sel; close(false); if (same) return; }
    const b = btnOf(sel); if (!b || b.disabled) return;
    cur = sel;
    pop = document.createElement('div');
    if (isDate(sel)) {
      const m = /^(\d{4})-(\d\d)/.exec(sel.value), n = new Date();
      view = m ? [+m[1], +m[2] - 1] : [n.getFullYear(), n.getMonth()];
      pop.className = 'cs-pop cs-cal'; pop.setAttribute('role', 'dialog');
      document.body.appendChild(pop); drawCal();
      b.setAttribute('aria-expanded', 'true'); b.classList.add('open'); place();
      return;
    }
    pop.className = 'cs-pop'; pop.setAttribute('role', 'listbox');
    pop.innerHTML = [...sel.options].map((o, i) =>
      '<div class="cs-opt' + (i === sel.selectedIndex ? ' on' : '') + '" role="option" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '"' + (o.disabled ? ' aria-disabled="true"' : '') + '><span>' + esc(o.textContent) + '</span>' + TICK + '</div>').join('');
    document.body.appendChild(pop);
    b.setAttribute('aria-expanded', 'true'); b.classList.add('open');
    place(); mark(Math.max(0, sel.selectedIndex), true);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.cs-btn');
    if (b) { const sel = b.previousElementSibling; if (sel && (sel.tagName === 'SELECT' || sel.dataset.cs)) open(sel); return; }
    const o = e.target.closest('.cs-opt');
    if (o) { if (o.getAttribute('aria-disabled') !== 'true') pick(+o.dataset.i); return; }
    if (pop && cur && isDate(cur)) {
      const nv = e.target.closest('.cs-nav'), dy = e.target.closest('[data-d]'), cl = e.target.closest('.cs-clear');
      if (nv) { const t = view[0] * 12 + view[1] + +nv.dataset.m; view = [Math.floor(t / 12), t % 12]; drawCal(); place(); return; }
      if (dy) { pickDate(dy.dataset.d); return; }
      if (cl) { pickDate(''); return; }
    }
    if (pop && !e.target.closest('.cs-pop')) close(false);
  });
  document.addEventListener('mousemove', e => {
    const o = pop && e.target.closest('.cs-opt'); if (o && +o.dataset.i !== idx) mark(+o.dataset.i, false);
  });
  /* стрелки, Enter, Escape работают с фокусом на кнопке, как у обычного списка */
  document.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('.cs-btn'); if (!b) return;
    const sel = b.previousElementSibling;
    if (e.key === 'Escape' && pop) { e.stopImmediatePropagation(); e.preventDefault(); close(true); return; }
    if (e.key === 'Tab') { close(false); return; }
    if (isDate(sel)) { if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); if (!pop) open(sel); } return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(e.key)) e.preventDefault(); else return;
    if (!pop) { if (e.key !== 'Home' && e.key !== 'End') open(sel); return; }
    if (e.key === 'ArrowDown') mark(idx + 1, true);
    else if (e.key === 'ArrowUp') mark(idx - 1, true);
    else if (e.key === 'Home') mark(0, true);
    else if (e.key === 'End') mark(pop.children.length - 1, true);
    else pick(idx);
  }, true);
  document.addEventListener('keyup', e => { if (e.key === ' ' && e.target.closest && e.target.closest('.cs-btn')) e.preventDefault(); }, true);
  addEventListener('resize', () => close(false));
  document.addEventListener('scroll', e => { if (pop && !pop.contains(e.target)) close(false); }, true);

  function scan() {
    document.querySelectorAll('select:not([data-cs]),input[type=date]:not([data-cs])').forEach(enhance);
    document.querySelectorAll('[data-cs]').forEach(sync);
    if (pop && (!cur || !cur.isConnected)) close(false); /* список остался от стёртого render() */
  }
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
