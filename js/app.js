'use strict';
/* ASOFT Управление: интерфейс. Без сборки, как и касса. Данные и правила наследования меню: js/store.js */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rub = n => (Math.abs(n) >= 1000 ? Math.round(n) : Math.round(n * 100) / 100).toLocaleString('ru-RU') + ' ₽';
const nm = n => Math.round(n).toLocaleString('ru-RU');
const ico = (n, c = '') => `<svg class="i ${c}"><use href="#i-${n}"/></svg>`;
const dmy = s => s.split('-').reverse().join('.');
const stamp = t => { const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const ago = m => m < 1 ? 'сейчас' : m < 60 ? m + ' мин' : m < 1440 ? Math.round(m / 60) + ' ч' : Math.round(m / 1440) + ' дн';
const ST = { online: ['', 'на связи'], late: ['w', 'давно'], offline: ['b', 'нет связи'] };

/* ---------- состояние ---------- */
const UI_KEY = 'asoft-mgr-ui';
load();
const S = Object.assign({ org: D.orgs[0].id, page: 'overview', node: null, period: 'today', uTab: 'users', ctab: 'structure', mtab: 'day', rtab: 'sales', orgOpen: false, secType: '', secWho: '', secNew: false },
  (() => { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (_) { return {}; } })());
S.orgOpen = false;
/* прежние страницы стали вкладками двух больших блоков */
{ const m = { structure: ['company', 'ctab', 'structure'], menu: ['company', 'ctab', 'menu'], users: ['company', 'ctab', 'users'], kassas: ['company', 'ctab', 'kassas'], templates: ['company', 'ctab', 'templates'], security: ['reports', 'rtab', 'security'], journal: ['reports', 'rtab', 'journal'] }[S.page]; if (m) { S.page = m[0]; S[m[1]] = m[2]; } }
if (!['overview', 'company', 'reports'].includes(S.page)) S.page = 'overview';
/* выбранное место при входе: вся организация; раскрытое в списке мест живёт только в сеансе */
S.opened = {}; S.node = null;
function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify({ org: S.org, page: S.page, node: S.node, period: S.period, uTab: S.uTab, ctab: S.ctab, mtab: S.mtab, rtab: S.rtab, secType: S.secType, secWho: S.secWho, secNew: S.secNew })); } catch (_) {} }
function fixState() {
  if (!orgById(S.org)) S.org = D.orgs[0].id;
  if (S.node && (!nodeById(S.node) || nodeById(S.node).org !== S.org)) S.node = null;
  /* меню, пользователи и реклама задаются на столовую и выше, не на одну кассу */
  if (S.page === 'company' && ['menu', 'users', 'ads'].includes(S.ctab) && S.node && typeOf(S.node) === 'kassa') S.node = hallOf(S.node);
}
const scope = () => S.node || S.org;
const myOrg = () => orgById(S.org);

const PAGES = [['overview', 'Обзор', 'home'], ['company', 'Структура предприятия', 'tree'], ['reports', 'Отчёты и безопасность', 'shield']];
const CTABS = [['structure', 'Структура', 'tree'], ['kassas', 'Кассы', 'reg'], ['menu', 'Меню', 'menu'], ['users', 'Пользователи', 'users'], ['templates', 'Шаблоны', 'tpl'], ['ads', 'Реклама', 'ad']];
const MTABS = [['day', 'Дневное меню'], ['combo', 'Комплексы'], ['assign', 'Задание комплексов'], ['keys', 'Горячие клавиши'], ['names', 'Названия блюд']];
const RTABS = [['sales', 'Продажи', 'rep'], ['security', 'Журнал безопасности', 'shield'], ['journal', 'Журнал изменений', 'log']];

/* ---------- каркас ---------- */
function render() {
  fixState();
  const page = PAGES.find(p => p[0] === S.page) || PAGES[0];
  const ft = $('.fl-tree'), fs = ft ? ft.scrollTop : 0;
  $('#app').innerHTML = `<div class="app">${sidebar()}<div class="main"><div class="top"><strong style="font-size:18px">${page[1]}</strong><span class="grow"></span><span class="chip">${ico('info', 'x')} Тестовая версия · данные демонстрационные</span><span class="muted">${esc(ME)}</span></div><div class="content">${pageHtml()}</div></div></div>${flyout()}`;
  const f2 = $('.fl-tree'); if (f2) f2.scrollTop = fs;
  saveUI();
}

function sidebar() {
  const light = document.documentElement.dataset.theme === 'light';
  return `<aside class="side">
    <div class="brand"><img src="img/asoft-emblem.png" alt=""><span>ASOFT <em>Управление</em></span></div>
    <div class="orgsw">
      <button class="orgbtn ${S.orgOpen ? 'open' : ''}" data-act="orgmenu" aria-haspopup="dialog" aria-expanded="${S.orgOpen}" title="Организация и место">${ico('tree')}<span class="t"><small>${esc(myOrg().name)}</small><b>${esc(S.node ? nameOf(S.node) : 'Вся организация')}</b></span>${ico('chev')}</button>
    </div>
    ${PAGES.map(([id, label, ic]) => `<button class="nav ${S.page === id ? 'on' : ''}" data-act="nav" data-id="${id}" title="${label}">${ico(ic)}<span class="lbl-t">${label}</span></button>`).join('')}
    <div class="grow"></div>
    <div class="side-foot">
      <button class="nav small" data-act="theme" title="Тема">${ico(light ? 'moon' : 'sun')}<span class="lbl-t">${light ? 'Тёмная тема' : 'Светлая тема'}</span></button>
      <button class="nav small" data-act="reset" title="Сбросить демо-данные">${ico('undo')}<span class="lbl-t">Сбросить демо-данные</span></button>
    </div>
  </aside>`;
}

/* Выбор организации и места (подразделение, столовая, касса). Выезжает справа от меню, постоянно экран не занимает. */
function flyout() {
  if (!S.orgOpen) return '';
  const sel = scope(), path = chain(sel);
  const rows = (pid, d) => children(pid).map(n => {
    const kids = children(n.id).length, open = kids && (S.opened[n.id] ?? path.includes(n.id));
    const right = n.type === 'kassa' ? `<span class="dot ${ST[statusOf(n)][0]}" title="${ST[statusOf(n)][1]}"></span>` : `<span class="cnt">${kassasUnder(n.id).length}</span>`;
    return `<div class="tn d${d} ${sel === n.id ? 'on' : ''}" data-act="pick" data-id="${n.id}">
      <button class="fold ${kids ? '' : 'none'} ${open ? '' : 'shut'}" data-act="fold" data-id="${n.id}" aria-label="Свернуть или развернуть">${ico('chev')}</button>
      ${ico(ICON_OF[n.type])}<span class="nm">${esc(n.name)}</span>${right}</div>` + (open ? rows(n.id, d + 1) : '');
  }).join('');
  return `<div class="flyout" role="dialog" aria-label="Организация и место">
    <div class="fl-h">Организация</div>
    ${D.orgs.map(o => `<button class="orgrow ${o.id === S.org ? 'on' : ''}" data-act="org" data-id="${o.id}">${o.id === S.org ? ico('check') : '<span class="sp"></span>'}<span class="nm">${esc(o.name)}</span><span class="cnt">${kassasUnder(o.id).length}</span></button>`).join('')}
    <button class="orgrow add" data-act="neworg">${ico('plus')}Добавить организацию</button>
    <div class="fl-h">Где работаем</div>
    <div class="fl-tree">
      <div class="tn root ${sel === S.org ? 'on' : ''}" data-act="pick" data-id="${S.org}">${ico('home')}<span class="nm">Вся организация</span><span class="cnt">${kassasUnder(S.org).length}</span></div>
      ${rows(S.org, 1)}
    </div></div>`;
}

function pageHtml() {
  switch (S.page) {
    case 'company': return pCompany();
    case 'reports': return pReportBlock();
    default: return pOverview();
  }
}

const pane = inner => `<div class="pane">${inner}</div>`;

/* Заголовок страницы: название места, путь (каждый шаг кликабелен) и кнопка смены места */
function head(title, actions = '', sc = scope(), eyebrow = '') {
  const ids = chain(sc);
  const crumbs = ids.map((id, i) => i === ids.length - 1 ? `<b>${esc(nameOf(id))}</b>` : `<button class="cr" data-act="pick" data-id="${id}">${esc(nameOf(id))}</button>`).join('<span class="sep">›</span>');
  return `<div class="ph"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${esc(title)}</h1><div class="crumb">${crumbs}<button class="scopebtn" data-act="orgmenu">${ico('tree')}Сменить место</button></div></div><div class="acts">${actions}</div></div>`;
}
const tabbar = (tabs, cur, key, acts = '') => `<div class="tabbar"><div class="tabs" role="tablist">${tabs.map(([id, l, ic]) => `<button class="tab ${cur === id ? 'on' : ''}" role="tab" aria-selected="${cur === id}" data-act="tab" data-key="${key}" data-id="${id}">${ico(ic)}<span>${l}</span></button>`).join('')}</div><div class="acts">${acts}</div></div>`;

/* Большой блок «Структура предприятия»: место сверху, вкладки под ним, каждая вкладка отдаёт [кнопки, содержимое] */
function pCompany() {
  const sc = scope();
  const [acts, body] = ({ structure: cStructure, kassas: cKassas, menu: pMenu, users: pUsers, templates: pTemplates, ads: cAds }[S.ctab] || cStructure)();
  return pane(head(nameOf(sc), acts, sc, `Структура предприятия · ${TYPE_LABEL[typeOf(sc)]}`) + tabbar(CTABS, S.ctab, 'ctab') + body);
}
/* Большой блок «Отчёты и безопасность»: продажи, журнал безопасности, журнал изменений */
function pReportBlock() {
  const sc = scope();
  const [acts, body] = ({ sales: pReports, security: pSecurity, journal: pJournal }[S.rtab] || pReports)();
  return pane(head(nameOf(sc), acts, sc, 'Отчёты и безопасность') + tabbar(RTABS, S.rtab, 'rtab') + body);
}

/* ---------- Обзор ---------- */
function pOverview() {
  const sc = scope(), s = salesFor(sc, 'today'), ks = kassasUnder(sc);
  const on = ks.filter(k => statusOf(k) === 'online').length, quiet = ks.filter(k => statusOf(k) !== 'online').length;
  const fnWarn = ks.map(k => ({ k, days: Math.ceil((Date.parse(k.eq.kkt.fnTill) - Date.now()) / 864e5) })).filter(x => x.days <= 30).sort((a, b) => a.days - b.days);
  const max = Math.max(1, ...s.rows.map(r => r.sum));
  const list = [...ks].sort((a, b) => a.last - b.last);
  const secT = secEvents(sc, 'today'), secP = secT.length ? 'today' : 'week', sec = secT.length ? secT : secEvents(sc, 'week'), secHi = sec.filter(e => e.hi && !D.secOk[e.id]).length;
  return pane(`${head('Обзор')}
    ${sec.length ? `<div class="note ${secHi ? 'w' : ''}">${ico('shield')}<span style="flex:1"><b>Журнал безопасности:</b> ${secP === 'today' ? 'сегодня' : 'за 7 дней'} ${sec.length} ${plural(sec.length, 'событие', 'события', 'событий')}${secHi ? `, из них ${secHi} ${plural(secHi, 'требует', 'требуют', 'требуют')} внимания` : ''}.</span><button class="btn sm" data-act="sec-open" data-id="${secP}">Открыть</button></div>` : ''}
    ${fnWarn.length ? `<div class="note w">${ico('warn')}<span><b>Срок ФН заканчивается:</b> ${fnWarn.slice(0, 3).map(x => `${esc(x.k.name)} (${esc(nameOf(x.k.parent))}, ${esc(nameOf(nodeById(x.k.parent).parent))}) — ${dmy(x.k.eq.kkt.fnTill)}, ${x.days < 0 ? 'уже истёк' : 'осталось ' + x.days + ' дн'}`).join('; ')}${fnWarn.length > 3 ? ` и ещё ${fnWarn.length - 3}` : ''}.</span></div>` : ''}
    <div class="kpis">
      <div class="kpi"><div class="l">Выручка сегодня</div><div class="v m">${rub(s.tot.sum)}</div><div class="d">по ${s.kassas} кассам</div></div>
      <div class="kpi"><div class="l">Чеков</div><div class="v">${nm(s.tot.checks)}</div><div class="d">с начала дня</div></div>
      <div class="kpi"><div class="l">Средний чек</div><div class="v">${rub(s.avg)}</div><div class="d">наличные, карта, СБП</div></div>
      <div class="kpi"><div class="l">Кассы на связи</div><div class="v">${on} из ${ks.length}</div><div class="d">${quiet ? quiet + ' давно не выходили' : 'все на связи'}</div></div>
    </div>
    <div class="grid2">
      <div class="card"><h3>Выручка: ${esc(s.levelLabel.toLowerCase())}</h3><div class="bars">${s.rows.map(r => `<div class="bar"><span class="nm">${esc(r.name)}</span><span class="t"><i style="width:${r.sum / max * 100}%"></i></span><span class="vl num">${rub(r.sum)}</span></div>`).join('') || '<div class="empty">Нет данных</div>'}</div></div>
      <div class="card flush"><h3 style="padding:10px 14px 0">Кассы</h3>${list.length ? `<table><tr><th>Касса</th><th>Где</th><th>Продажа</th></tr>${list.slice(0, 8).map(k => `<tr><td>${esc(k.name)}</td><td class="muted">${esc(nameOf(k.parent))}, ${esc(nameOf(nodeById(k.parent).parent))}</td><td><span class="dot ${ST[statusOf(k)][0]}"></span> ${ago(k.last)}</td></tr>`).join('')}</table>${list.length > 8 ? `<div class="muted" style="padding:8px 14px">и ещё ${list.length - 8}, полный список: Структура предприятия › Кассы</div>` : ''}` : '<div class="empty">Касс нет</div>'}</div>
    </div>`);
}

/* ---------- Структура ---------- */
/* ---------- Структура предприятия: вкладка «Структура» и карточка кассы ---------- */
const CHILD_OF = { org: ['unit', 'Подразделение'], unit: ['hall', 'Столовая'], hall: ['kassa', 'Касса'] };
const ICON_OF = { org: 'home', unit: 'pin', hall: 'shop', kassa: 'reg' };
const LEVEL_OF = { org: 'Подразделения', unit: 'Столовые', hall: 'Кассы' };
const fnDays = k => Math.ceil((Date.parse(k.eq.kkt.fnTill) - Date.now()) / 864e5);

/* значки оборудования: что стоит на кассе, горит, что нет, приглушено */
const eqChips = e => `<span class="eqi">${[['print', true, 'Принтер чеков'], ['card', acqOn(e), 'Эквайринг'], ['scale', e.scale.on, 'Весы'], ['screen', e.display.on, 'Дисплей покупателя'], ['qr', e.sbp, 'СБП']]
  .map(([ic, v, t]) => `<svg class="i ${v ? '' : 'off'}" role="img" aria-label="${t}: ${v ? 'есть' : 'нет'}"><title>${t}: ${v ? 'есть' : 'нет'}</title><use href="#i-${ic}"/></svg>`).join('')}</span>`;

function ncard(n) {
  const go = ico('chev', 'nc-go');
  if (n.type === 'kassa') {
    const st = statusOf(n);
    return `<button class="ncard" data-act="pick" data-id="${n.id}"><div class="nc-h"><span class="tpl-ic">${ico('reg')}</span><div class="nc-t"><b>${esc(n.name)}</b><span class="tag ${ST[st][0]}">${ST[st][1]}</span></div>${go}</div>${eqChips(n.eq)}</button>`;
  }
  const ks = kassasUnder(n.id), on = ks.filter(k => statusOf(k) === 'online').length, sub = children(n.id).length;
  return `<button class="ncard" data-act="pick" data-id="${n.id}"><div class="nc-h"><span class="tpl-ic">${ico(ICON_OF[n.type])}</span><div class="nc-t"><b>${esc(n.name)}</b><span class="muted sm">${TYPE_LABEL[n.type]}</span></div>${go}</div>
    <div class="nc-m"><span>${ks.length} ${plural(ks.length, 'касса', 'кассы', 'касс')}</span><span>${on} на связи</span>${n.type === 'unit' ? `<span>${sub} ${plural(sub, 'столовая', 'столовые', 'столовых')}</span>` : ''}</div></button>`;
}

function cStructure() {
  const id = scope(), t = typeOf(id), n = nodeById(id);
  if (t === 'kassa') return [`<button class="btn" data-act="pick" data-id="${n.parent}">${ico('chev', 'back')}К столовой</button>`, kassaView(n)];
  const kids = children(id), ch = CHILD_OF[t], ks = kassasUnder(id);
  const on = ks.filter(k => statusOf(k) === 'online').length, fnW = ks.filter(k => fnDays(k) <= 30).length;
  const acts = `${ch ? `<button class="btn p" data-act="add" data-id="${id}">${ico('plus')}${ch[1]}</button>` : ''}<button class="btn" data-act="rename" data-id="${id}">${ico('pencil')}Переименовать</button>${t !== 'org' ? `<button class="btn bad" data-act="del" data-id="${id}">${ico('trash')}Удалить</button>` : ''}`;
  return [acts, `<div class="kpis k3">
      <div class="kpi"><div class="l">Касс</div><div class="v">${ks.length}</div><div class="d">${esc(nameOf(id))}</div></div>
      <div class="kpi"><div class="l">На связи</div><div class="v">${on} из ${ks.length}</div><div class="d">${ks.length - on ? ks.length - on + ' давно не выходили' : 'все на связи'}</div></div>
      <div class="kpi"><div class="l">Срок ФН заканчивается</div><div class="v ${fnW ? '' : 'm'}">${fnW || 'нет'}</div><div class="d">в ближайшие 30 дней</div></div>
    </div>
    <div class="lvl">${LEVEL_OF[t]} <span class="muted">· ${kids.length}</span></div>
    ${kids.length ? `<div class="ncards">${kids.map(ncard).join('')}</div>` : `<div class="card"><div class="empty">Здесь пока пусто.${ch ? ` Добавьте: ${ch[1].toLowerCase()}.` : ''}</div></div>`}`];
}

/* карточка оборудования; key — переключатель включено/выключено прямо на карточке */
function eqCard({ ic, title, on = null, line, sub = '', key = '', k, extra = '' }) {
  const tag = on === true ? '<span class="tag">включено</span>' : on === false ? '<span class="tag n">выключено</span>' : '';
  const sw = key ? `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${esc(title)}" data-act="eq-toggle" data-id="${k.id}" data-key="${key}"><i></i></button>` : '';
  return `<div class="eqc ${on === false ? 'off' : ''}"><div class="eqh"><span class="tpl-ic">${ico(ic)}</span><div class="eqt"><b>${title}</b>${tag}</div>${sw}</div><div class="eqv">${line}</div>${sub ? `<div class="muted sm">${sub}</div>` : ''}${extra}</div>`;
}
function kassaView(k) {
  const e = k.eq, st = statusOf(k), days = fnDays(k), t = k.tpl && tplById(k.tpl), acq = acqOn(e);
  const menuN = effectiveMenu(k.parent).filter(r => !r.hidden).length;
  const go = (tab, label) => `<button class="btn sm" data-act="goto" data-tab="${tab}">${label}</button>`;
  const cards = [
    { ic: 'chip', title: 'Касса (ККТ)', line: `${esc(e.kkt.model)} · ${esc(e.kkt.conn)}${e.kkt.ip ? ' · ' + esc(e.kkt.ip) : ''}`, sub: `ФН № ${esc(e.kkt.fn || '—')}, до ${dmy(e.kkt.fnTill)}${days <= 30 ? ` <span class="warn-t">· ${days < 0 ? 'уже истёк' : 'осталось ' + days + ' дн'}</span>` : ''}` },
    { ic: 'print', title: 'Принтер чеков', line: `${esc(e.printer.model)} · ${esc(e.printer.conn)}` },
    { ic: 'card', title: 'Эквайринг', key: 'acq', on: acq, line: acq ? `${esc(e.acq.model)} · ${esc(e.acq.conn)}` : 'Оплата картой на кассе недоступна' },
    { ic: 'scale', title: 'Весы', key: 'scale', on: !!e.scale.on, line: e.scale.on ? `${esc(e.scale.model)} · ${esc(e.scale.conn)}` : 'Не подключены' },
    { ic: 'screen', title: 'Дисплей покупателя', key: 'display', on: !!e.display.on, line: e.display.on ? `Подключён · ${esc(e.display.conn)}` : 'Не подключён' },
    { ic: 'qr', title: 'Оплата по СБП', key: 'sbp', on: !!e.sbp, line: e.sbp ? 'Покупатель платит по QR-коду' : 'Выключена' },
    { ic: 'tpl', title: 'Шаблон', line: t ? esc(t.name) : 'Без шаблона', sub: t ? (tplMatch(k, t) ? 'Настройки совпадают с шаблоном' : '<span class="warn-t">Изменена вручную после применения</span>') : 'Эту кассу можно сохранить как шаблон', extra: go('templates', 'Все шаблоны') },
    { ic: 'menu', title: 'Меню', line: `${menuN} ${plural(menuN, 'позиция', 'позиции', 'позиций')}`, sub: `Задаётся на уровне «${esc(nameOf(k.parent))}» и выше`, extra: go('menu', 'Открыть меню') },
    { ic: 'ad', title: 'Реклама', line: 'Не настроена', sub: 'Видео и фото на экране покупателя', extra: go('ads', 'Настроить') },
  ];
  return `<div class="card"><div class="kh"><span class="tpl-ic big">${ico('reg')}</span>
      <div style="flex:1;min-width:200px"><h2 style="font-size:20px">${esc(k.name)}</h2><div class="muted">${esc(nameOf(k.parent))}, ${esc(nameOf(nodeById(k.parent).parent))}</div></div>
      <div class="khs"><span class="tag ${ST[st][0]}">${ST[st][1]}</span><span class="muted sm">последняя продажа ${ago(k.last)} назад</span></div>
      <div class="khb"><button class="btn p" data-act="kassa-open" data-id="${k.id}">${ico('chip')}Изменить оборудование</button><button class="btn" data-act="tpl-from" data-id="${k.id}">${ico('tpl')}Сохранить как шаблон</button></div></div></div>
    <div class="note">${ico('info')}<span>Здесь видно, что стоит на кассе. Переключатели и правки уходят на кассу удалённо: она применит их при ближайшей связи.</span></div>
    <div class="eqgrid">${cards.map(c => eqCard({ ...c, k })).join('')}</div>`;
}

/* вкладка «Кассы»: список с оборудованием; если выбрана одна касса, показываем её карточку */
function cKassas() {
  const sc = scope();
  if (typeOf(sc) === 'kassa') { const n = nodeById(sc); return [`<button class="btn" data-act="pick" data-id="${n.parent}">${ico('chev', 'back')}Все кассы</button>`, kassaView(n)]; }
  const ks = kassasUnder(sc);
  return ['', `<div class="note">${ico('info')}<span>Нажмите на кассу, чтобы увидеть, что на ней стоит, и поменять настройки. Касса применит их сама при ближайшей связи.</span></div>
    <div class="card flush">${ks.length ? `<table><tr><th>Касса</th><th>Где</th><th>Связь</th><th>Оборудование</th><th>ККТ · ФН до</th><th>Шаблон</th></tr>${ks.map(k => {
      const st = statusOf(k), days = fnDays(k);
      return `<tr class="click" data-act="pick" data-id="${k.id}"><td><b>${esc(k.name)}</b></td><td class="muted">${esc(nameOf(k.parent))}, ${esc(nameOf(nodeById(k.parent).parent))}</td>
        <td><span class="tag ${ST[st][0]}">${ST[st][1]}</span> <span class="muted">${ago(k.last)}</span></td><td>${eqChips(k.eq)}</td>
        <td>${esc(k.eq.kkt.model)} · <span class="${days <= 30 ? 'tag w' : ''}">${dmy(k.eq.kkt.fnTill)}</span></td><td>${tplTag(k)}</td></tr>`;
    }).join('')}</table>` : '<div class="empty">Касс нет.</div>'}</div>`];
}

/* ---------- каркасы вкладок, которые заполним позже ---------- */
const SOON = {
  combo: ['combo', 'Комплексы', 'Готовые наборы блюд за одну цену, например обед из первого, второго и напитка.', ['Название и цена комплекса', 'Из каких разделов и блюд он собирается', 'Какие блюда можно выбрать вместо основных']],
  assign: ['list', 'Задание комплексов', 'Какой комплекс продаётся в какое время и на каких кассах.', ['Дни недели и часы продажи', 'Столовые и кассы, где действует комплекс', 'Замена блюд на конкретный день']],
  keys: ['key', 'Горячие клавиши', 'Что лежит на быстрых кнопках кассы в каждом режиме: завтрак, обед, ужин, буфет.', ['Режимы кассы и их названия', 'Кнопки режима и что на них лежит', 'Режим, который включается при входе («Основной»)']],
  names: ['list', 'Названия блюд', 'Как блюдо называется на кнопке кассы, на чеке и на экране покупателя.', ['Короткое название для кнопки', 'Полное название для чека', 'Название для отчётов']],
  ads: ['ad', 'Показ рекламы', 'Что показывать, в каком порядке и когда, и на какие кассы это отправить.', ['Загрузка видео и фото', 'Порядок и длительность показа', 'Расписание по времени суток', 'На какие столовые и кассы отправить']],
};
const soon = ([ic, title, text, plan]) => `<div class="card soon"><span class="tpl-ic big">${ico(ic)}</span><div><h3>${title}</h3><p class="muted">${text}</p><div class="muted sm" style="margin-top:10px">Что здесь будет:</div><ul class="plan">${plan.map(x => `<li>${x}</li>`).join('')}</ul><span class="tag n">Каркас: поля заполним позже</span></div></div>`;
const menuSeg = () => `<div class="seg">${MTABS.map(([id, l]) => `<button class="${S.mtab === id ? 'on' : ''}" data-act="tab" data-key="mtab" data-id="${id}">${l}</button>`).join('')}</div>`;

function cAds() {
  const sc = scope(), n = kassasUnder(sc).length;
  const v = (ic, title, text) => `<div class="eqc dashed"><div class="eqh"><span class="tpl-ic">${ico(ic)}</span><div class="eqt"><b>${title}</b><span class="tag n">скоро</span></div></div><div class="muted">${text}</div></div>`;
  return ['', `<div class="note">${ico('info')}<span>Рекламу настраивают здесь и отправляют на кассы выбранного места (сейчас ${n} ${plural(n, 'касса', 'кассы', 'касс')}), как и меню: на организацию, подразделение или столовую. Показывается на экране покупателя.</span></div>
    <div class="lvl">Варианты рекламы</div>
    <div class="eqgrid">${v('play', 'Видео', 'Ролик на экране покупателя, пока касса свободна.')}${v('photo', 'Фото и слайд-шоу', 'Картинки с акциями, сменяются по кругу.')}${v('plus', 'Другие варианты', 'Добавим позже, когда определимся, что нужно.')}</div>
    ${soon(SOON.ads)}`];
}

/* ---------- Меню ---------- */
function pMenu() {
  if (S.mtab !== 'day') return ['', menuSeg() + soon(SOON[S.mtab])];
  const sc = hallOf(scope());
  const rows = effectiveMenu(sc), t = typeOf(sc), chain_ = chain(sc).map(nameOf).join(' → ');
  let sect = '';
  const body = rows.map(r => {
    const it = r.item, own = r.from === sc, ov = overAt(sc, it.id);
    let h = '';
    if (it.section !== sect) { sect = it.section; h = `<tr><td colspan="5" style="background:var(--card);font-weight:700;color:var(--tx-2);font-size:13px">${esc(sect)}</td></tr>`; }
    const src = own ? '<span class="tag n">здесь</span>' : `<span class="muted">${esc(nameOf(r.from))}</span>`;
    const tags = (r.priceFrom !== r.from ? ` <span class="tag w">цена: ${r.priceFrom === sc ? 'своя' : esc(nameOf(r.priceFrom))}</span>` : '') + (r.hidden ? ` <span class="tag b">скрыта${r.hiddenFrom === sc ? '' : ': ' + esc(nameOf(r.hiddenFrom))}</span>` : '');
    return h + `<tr class="${r.hidden ? 'dim' : ''}"><td>${esc(it.name)}</td><td class="r num"><b>${rub(r.price)}</b></td><td>${src}${tags}</td>
      <td class="acts"><button class="ibtn" data-act="item-edit" data-id="${it.id}" title="Изменить">${ico('pencil')}</button>${r.hidden ? `<button class="ibtn" data-act="item-show" data-id="${it.id}" title="Показывать на кассах">${ico('eye')}</button>` : `<button class="ibtn" data-act="item-hide" data-id="${it.id}" title="Скрыть на кассах">${ico('eyeoff')}</button>`}${ov ? `<button class="ibtn" data-act="item-reset" data-id="${it.id}" title="Вернуть как выше">${ico('undo')}</button>` : ''}${own ? `<button class="ibtn bad" data-act="item-del" data-id="${it.id}" title="Удалить позицию">${ico('trash')}</button>` : ''}</td></tr>`;
  }).join('');
  const kassas = kassasUnder(sc).length;
  return [`<button class="btn p" data-act="item-add">${ico('plus')}Позиция</button>`, `${menuSeg()}
    <div class="note">${ico('info')}<span>Правка здесь действует на <b>${kassas} ${kassas === 1 ? 'кассу' : 'кассы'}</b> (${esc(nameOf(sc))}) и сама доходит до касс. Меню наследуется сверху вниз: <b>${esc(chain_)}</b>. Позицию или цену, заданную выше, здесь можно переопределить, и это коснётся только этого уровня.${t === 'org' ? ' Сейчас выбрана вся организация: новые позиции появятся во всех столовых.' : ''}</span></div>
    <div class="card flush">${rows.length ? `<table><tr><th>Позиция</th><th class="r">Цена</th><th>Откуда</th><th class="acts"></th></tr>${body}</table>` : '<div class="empty">Позиций нет. Добавьте первую.</div>'}</div>`];
}

function itemForm(row, isNew) {
  const own = isNew || row.from === scopeForMenu();
  const it = row ? row.item : { name: '', section: SECTIONS[0], price: '' };
  return `${own ? `<div class="field"><label for="f-name">Название</label><input class="input" id="f-name" name="name" required value="${esc(it.name)}"></div>
    <div class="field"><label for="f-sec">Раздел</label><select class="input" id="f-sec" name="section">${SECTIONS.map(s => `<option ${s === it.section ? 'selected' : ''}>${s}</option>`).join('')}</select></div>` : `<div class="note" style="margin-bottom:14px">${ico('info')}<span>Позиция «${esc(it.name)}» пришла сверху (${esc(nameOf(row.from))}). Здесь можно поменять только цену, и только для «${esc(nameOf(scopeForMenu()))}».</span></div>`}
    <div class="field"><label for="f-price">Цена, ₽</label><input class="input" id="f-price" name="price" inputmode="decimal" required value="${isNew ? '' : row.price}"></div>`;
}
const scopeForMenu = () => hallOf(scope());

/* ---------- Пользователи и профили ---------- */
function pUsers() {
  const sc = hallOf(scope());
  const tabs = `<div class="seg"><button class="${S.uTab === 'users' ? 'on' : ''}" data-act="utab" data-id="users">Пользователи</button><button class="${S.uTab === 'profiles' ? 'on' : ''}" data-act="utab" data-id="profiles">Профили прав</button></div>`;
  if (S.uTab === 'profiles') {
    const ps = D.profiles.filter(p => p.org === S.org);
    return [`<button class="btn p" data-act="prof-add">${ico('plus')}Профиль</button>`, `${tabs}
      <div class="note">${ico('info')}<span>Профиль — набор прав. Пользователю назначается готовый профиль, права по одному не настраиваются.</span></div>
      <div class="profs">${ps.map(p => `<div class="prof"><h4>${esc(p.name)}</h4><div class="muted">${p.rights.length} из ${RIGHTS.length} прав · ${D.users.filter(u => u.profile === p.id).length} польз.</div>
        <div class="rights">${RIGHTS.filter(r => p.rights.includes(r[0])).map(r => `<span class="tag n">${r[1]}</span>`).join('')}</div>
        <div style="display:flex;gap:6px;margin-top:auto"><button class="btn sm" data-act="prof-edit" data-id="${p.id}">${ico('pencil')}Изменить</button><button class="btn sm bad" data-act="prof-del" data-id="${p.id}">${ico('trash')}</button></div></div>`).join('')}</div>`];
  }
  const us = D.users.filter(u => u.org === S.org && (sc === S.org || u.access.some(a => related(a, sc))));
  return [`<button class="btn p" data-act="user-add">${ico('plus')}Пользователь</button>`, `${tabs}
    <div class="card flush">${us.length ? `<table><tr><th>Пользователь</th><th>Профиль</th><th>Допуск</th><th>PIN</th><th class="acts"></th></tr>${us.map(u => {
      const p = D.profiles.find(p => p.id === u.profile);
      return `<tr><td><b>${esc(u.name)}</b></td><td>${p ? `<span class="tag i">${esc(p.name)}</span>` : '—'}</td><td class="muted">${u.access.length ? esc(u.access.map(nameOf).join(', ')) : 'нет допуска'}</td><td class="muted">••••</td>
        <td class="acts"><button class="ibtn" data-act="user-edit" data-id="${u.id}" title="Изменить">${ico('pencil')}</button><button class="ibtn bad" data-act="user-del" data-id="${u.id}" title="Удалить">${ico('trash')}</button></td></tr>`;
    }).join('')}</table>` : '<div class="empty">В этой части структуры пользователей нет.</div>'}</div>`];
}

function userForm(u) {
  const ps = D.profiles.filter(p => p.org === S.org);
  const units = children(S.org).filter(n => n.type === 'unit');
  const chk = (n, ind) => `<label class="chk ${ind ? 'ind1' : ''}"><input type="checkbox" name="acc" value="${n.id}" ${u.access.includes(n.id) ? 'checked' : ''}>${ico(n.type === 'unit' ? 'pin' : 'shop')}<span>${esc(n.name)}</span></label>`;
  return `<div class="field"><label for="f-name">Имя</label><input class="input" id="f-name" name="name" required value="${esc(u.name)}"></div>
    <div class="row2"><div class="field"><label for="f-pin">PIN-код (4 цифры)</label><input class="input num" id="f-pin" name="pin" inputmode="numeric" maxlength="4" required value="${esc(u.pin)}"></div>
    <div class="field"><label for="f-prof">Профиль прав</label><select class="input" id="f-prof" name="profile">${ps.map(p => `<option value="${p.id}" ${p.id === u.profile ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div></div>
    <div class="field"><span class="lbl">Допуск: где может работать</span><div class="checks">${units.map(un => chk(un, false) + children(un.id).filter(h => h.type === 'hall').map(h => chk(h, true)).join('')).join('') || '<div class="muted" style="padding:8px">Сначала создайте подразделения и столовые.</div>'}</div><span class="hint">Допуск на подразделение — на все его столовые.</span></div>`;
}

function kassaForm(k) {
  const ts = D.templates.filter(t => t.org === S.org), cur = k.tpl && tplById(k.tpl);
  return `<div class="tplbar">${ico('tpl')}<span class="grow">${cur ? `Шаблон: <b>${esc(cur.name)}</b>${tplMatch(k, cur) ? '' : ' <span class="tag w">изменена вручную</span>'}` : 'Касса без шаблона'}</span>
    <div class="tplrow">${ts.length ? `<select class="input sm" name="tpl_pick" aria-label="Шаблон">${ts.map(t => `<option value="${t.id}" ${t.id === k.tpl ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><button class="btn sm" type="button" data-act="tpl-fill">Подставить</button>` : ''}<button class="btn sm" type="button" data-act="tpl-from" data-id="${k.id}">${ico('plus')}Сохранить как шаблон</button></div></div>` + eqForm(k.eq, true);
}
function eqForm(e, full) {
  const sel = (name, opts, v) => `<select class="input" name="${name}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  const sw = (name, on, label) => `<label class="chk"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span>${label}</span></label>`;
  return `<div class="sec">Контрольно-кассовая техника</div>
    <div class="row2"><div class="field"><label>Модель</label>${sel('kkt_model', KKT_MODELS, e.kkt.model)}</div><div class="field"><label>Подключение</label>${sel('kkt_conn', CONNS, e.kkt.conn)}</div></div>
    ${full ? `<div class="row2"><div class="field"><label>Номер ФН</label><input class="input num" name="kkt_fn" value="${esc(e.kkt.fn)}"></div><div class="field"><label>ФН действует до</label><input class="input" type="date" name="kkt_till" value="${esc(e.kkt.fnTill)}"></div></div>
    <div class="field"><label>IP-адрес (если подключение по сети)</label><input class="input num" name="kkt_ip" placeholder="192.168.0.50" value="${esc(e.kkt.ip)}"></div>` : ''}
    <div class="sec">Эквайринг</div>
    ${sw('acq_on', e.acq.on !== false, 'Эквайринг включён')}
    <div class="row2"><div class="field"><label>Терминал</label>${sel('acq_model', ACQ_MODELS, e.acq.model)}</div><div class="field"><label>Подключение</label>${sel('acq_conn', CONNS, e.acq.conn)}</div></div>
    <div class="sec">Печать и периферия</div>
    <div class="row2"><div class="field"><label>Принтер чеков</label><input class="input" name="prn_model" value="${esc(e.printer.model)}"></div><div class="field"><label>Подключение</label>${sel('prn_conn', CONNS, e.printer.conn)}</div></div>
    ${sw('scale_on', e.scale.on, 'Весы подключены')}
    <div class="row2" style="margin-top:6px"><div class="field"><label>Модель весов</label><input class="input" name="scale_model" value="${esc(e.scale.model)}"></div><div class="field"><label>Подключение</label>${sel('scale_conn', CONNS, e.scale.conn)}</div></div>
    ${sw('disp_on', e.display.on, 'Дисплей покупателя')}
    <div class="sec">Оплата</div>
    ${sw('sbp', e.sbp, 'Оплата по СБП')}`;
}

function readEq(fd, e, full) {
  const g = n => String(fd.get(n) ?? '').trim();
  Object.assign(e.kkt, { model: g('kkt_model'), conn: g('kkt_conn') });
  if (full) Object.assign(e.kkt, { fn: g('kkt_fn'), fnTill: g('kkt_till') || e.kkt.fnTill, ip: g('kkt_ip') });
  Object.assign(e.acq, { model: g('acq_model'), conn: g('acq_conn'), on: fd.has('acq_on') });
  Object.assign(e.printer, { model: g('prn_model'), conn: g('prn_conn') });
  Object.assign(e.scale, { on: fd.has('scale_on'), model: g('scale_model'), conn: g('scale_conn') });
  e.display.on = fd.has('disp_on'); e.sbp = fd.has('sbp');
}

/* ---------- Шаблоны рабочих мест ---------- */
const tplById = id => D.templates.find(t => t.id === id);
function tplTag(k) {
  const t = k.tpl && tplById(k.tpl);
  if (!t) return '<span class="muted">без шаблона</span>';
  return tplMatch(k, t) ? `<span class="tag tn" title="${esc(t.name)}">${esc(t.name)}</span>` : `<span class="tag w tn" title="${esc(t.name)}: настройки кассы поменяли после применения шаблона">изменена · ${esc(t.name)}</span>`;
}
const eqSummary = e => [
  ['ККТ', `${e.kkt.model}, ${e.kkt.conn}`], ['Эквайринг', !acqOn(e) ? 'нет' : `${e.acq.model}, ${e.acq.conn}`],
  ['Принтер', `${e.printer.model}, ${e.printer.conn}`], ['Весы', e.scale.on ? `${e.scale.model}, ${e.scale.conn}` : 'нет'],
  ['Дисплей покупателя', e.display.on ? 'есть' : 'нет'], ['СБП', e.sbp ? 'включена' : 'выключена'],
];
function pTemplates() {
  const sc = scope(), ts = D.templates.filter(t => t.org === S.org);
  return [`<button class="btn p" data-act="tpl-add">${ico('plus')}Шаблон из кассы</button>`, `
    <div class="note">${ico('info')}<span>Настройте одну кассу, сохраните её как шаблон и примените к столовой целиком или к выбранным кассам. <b>Номер ФН, срок ФН и IP-адрес не переносятся:</b> они у каждой кассы свои. Кассы получат настройки при ближайшей связи.</span></div>
    ${ts.length ? `<div class="profs">${ts.map(t => {
      const ks = D.nodes.filter(k => k.type === 'kassa' && k.tpl === t.id), diff = ks.filter(k => !tplMatch(k, t)).length;
      const src = t.from && nodeById(t.from);
      return `<div class="prof"><div class="tplhead"><span class="tpl-ic">${ico('tpl')}</span><div style="flex:1;min-width:0"><h4>${esc(t.name)}</h4><div class="muted sm">${src ? `снят с: ${esc(src.name)}, ${esc(nameOf(src.parent))}` : 'создан вручную'}</div></div></div>
        <dl class="spec">${eqSummary(t.eq).map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
        <div class="muted sm">${ks.length ? `Применён к ${ks.length} ${plural(ks.length, 'кассе', 'кассам', 'кассам')}${diff ? `, <span class="warn-t">${diff} ${plural(diff, 'изменена', 'изменены', 'изменены')} вручную</span>` : ', все совпадают'}` : 'Ещё не применён'}</div>
        <div style="display:flex;gap:6px;margin-top:auto;flex-wrap:wrap"><button class="btn sm p" data-act="tpl-apply" data-id="${t.id}">${ico('check')}Применить</button><button class="btn sm" data-act="tpl-edit" data-id="${t.id}" aria-label="Изменить шаблон" title="Изменить">${ico('pencil')}</button><button class="btn sm bad" data-act="tpl-del" data-id="${t.id}" aria-label="Удалить шаблон" title="Удалить">${ico('trash')}</button></div></div>`;
    }).join('')}</div>` : '<div class="card"><div class="empty">Шаблонов пока нет. Настройте кассу и сохраните её как шаблон.</div></div>'}`];
}
function tplApplyForm() {
  const sc = scope(), pre = typeOf(sc) === 'org' ? [] : kassasUnder(sc).map(k => k.id);
  const halls = D.nodes.filter(n => n.type === 'hall' && n.org === S.org && children(n.id).length);
  return `<p class="muted" style="margin-bottom:12px">Отметьте столовую, чтобы взять все её кассы, или отдельные кассы.</p>
    <div class="checks">${halls.map(h => {
      const ks = children(h.id), all = ks.every(k => pre.includes(k.id));
      return `<label class="chk"><input type="checkbox" data-act="tpl-hall" data-id="${h.id}" ${all ? 'checked' : ''}>${ico('shop')}<span><b>${esc(h.name)}</b> <span class="muted">· ${esc(nameOf(h.parent))}</span></span></label>` +
        ks.map(k => `<label class="chk ind1"><input type="checkbox" name="k" value="${k.id}" data-h="${h.id}" ${pre.includes(k.id) ? 'checked' : ''}>${ico('reg')}<span style="flex:1">${esc(k.name)}</span>${tplTag(k)}</label>`).join('');
    }).join('')}</div>`;
}

/* ---------- Журнал безопасности ---------- */
function secFiltered(sc) {
  const all = secEvents(sc, S.period);
  return { all, rows: all.filter(e => (!S.secType || e.type === S.secType) && (!S.secWho || e.who === S.secWho) && (!S.secNew || !D.secOk[e.id])) };
}
const SEC_COLOR = { w: 'warn', b: 'bad', i: 'info' };
function pSecurity() {
  const sc = scope(), { all, rows } = secFiltered(sc);
  const pick = (list, ...types) => list.filter(e => types.includes(e.type));
  const sumOf = list => list.reduce((a, e) => a + (e.sum || 0), 0);
  const hi = rows.filter(e => e.hi && !D.secOk[e.id]).length;
  const byWho = new Map(), byType = new Map();
  for (const e of all) { byWho.set(e.who, (byWho.get(e.who) || 0) + 1); byType.set(e.type, (byType.get(e.type) || 0) + 1); }
  const who = [...byWho].sort((a, b) => b[1] - a[1]), types = Object.keys(SEC_TYPES).filter(t => byType.get(t)).map(t => [t, byType.get(t)]);
  const mxW = Math.max(1, ...who.map(x => x[1])), mxT = Math.max(1, ...types.map(x => x[1]));
  const cashiers = [...new Set(all.map(e => e.who))].sort((a, b) => a.localeCompare(b, 'ru'));
  if (S.secWho && !cashiers.includes(S.secWho)) cashiers.unshift(S.secWho);
  const LIM = 200, cr = pick(rows, 'cancel', 'refund'), rm = pick(rows, 'remove'), ds = pick(rows, 'discount');
  return [`<button class="btn" data-act="sec-export">${ico('down')}Скачать CSV</button>`, `
    <div class="filters"><div class="seg">${PERIODS.map(([id, l]) => `<button class="${S.period === id ? 'on' : ''}" data-act="period" data-id="${id}">${l}</button>`).join('')}</div>
      <select class="input sm" data-chg="secType" aria-label="Вид события"><option value="">Все события</option>${Object.entries(SEC_TYPES).map(([k, v]) => `<option value="${k}" ${S.secType === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <select class="input sm" data-chg="secWho" aria-label="Кассир"><option value="">Все кассиры</option>${cashiers.map(c => `<option ${S.secWho === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <label class="chk"><input type="checkbox" data-chg="secNew" ${S.secNew ? 'checked' : ''}><span>Только непроверенные</span></label></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Событий</div><div class="v">${nm(rows.length)}</div><div class="d">${hi ? `<span class="warn-t">${hi} ${plural(hi, 'требует', 'требуют', 'требуют')} внимания</span>` : 'срочных нет'}</div></div>
      <div class="kpi"><div class="l">Отмены и возвраты</div><div class="v">${rub(sumOf(cr))}</div><div class="d">${cr.length} шт.</div></div>
      <div class="kpi"><div class="l">Убрано из чеков</div><div class="v">${rub(sumOf(rm))}</div><div class="d">${rm.length} шт.</div></div>
      <div class="kpi"><div class="l">Скидки вручную</div><div class="v">${rub(sumOf(ds))}</div><div class="d">${ds.length} шт.</div></div>
    </div>
    <div class="grid2">
      <div class="card"><h3>По кассирам</h3><div class="bars">${who.map(([w, c]) => `<button class="bar link ${S.secWho === w ? 'on' : ''}" data-act="sec-who" data-id="${esc(w)}" title="Показать только этого кассира"><span class="nm">${esc(w)}</span><span class="t"><i style="width:${c / mxW * 100}%"></i></span><span class="vl num">${c}</span></button>`).join('') || '<div class="empty">Нет событий</div>'}</div></div>
      <div class="card"><h3>По видам</h3><div class="bars">${types.map(([t, c]) => `<button class="bar link ${S.secType === t ? 'on' : ''}" data-act="sec-type" data-id="${t}" title="Показать только этот вид"><span class="nm">${SEC_TYPES[t][0]}</span><span class="t"><i style="width:${c / mxT * 100}%;background:var(--${SEC_COLOR[SEC_TYPES[t][1]]})"></i></span><span class="vl num">${c}</span></button>`).join('') || '<div class="empty">Нет событий</div>'}</div></div>
    </div>
    <div class="card flush">${rows.length ? `<table><tr><th>Когда</th><th>Кассир и касса</th><th>Событие</th><th class="r">Чек</th><th class="r">Сумма</th><th class="acts"></th></tr>${rows.slice(0, LIM).map(e => {
      const k = nodeById(e.kassa), ok = D.secOk[e.id], ty = SEC_TYPES[e.type];
      return `<tr class="${ok ? 'dim' : ''}"><td class="num muted" style="white-space:nowrap">${stamp(e.t)}</td><td><span style="white-space:nowrap">${esc(e.who)}</span><div class="muted sm">${esc(k.name)} · ${esc(nameOf(k.parent))}, ${esc(nameOf(nodeById(k.parent).parent))}</div></td>
        <td><span class="tag ${ty[1]}">${ty[0]}</span>${e.hi && !ok ? ' <span class="tag b">внимание</span>' : ''}<div class="muted sm">${esc(e.text)}</div></td><td class="r num muted" style="white-space:nowrap">${e.chk ? '№ ' + e.chk : '—'}</td><td class="r num" style="white-space:nowrap">${e.sum != null ? `<b>${rub(e.sum)}</b>` : '—'}</td>
        <td class="acts"><button class="ibtn ${ok ? 'ok' : ''}" data-act="sec-ok" data-id="${e.id}" title="${ok ? 'Снять отметку' : 'Отметить проверенным'}" aria-pressed="${!!ok}">${ico('check')}</button></td></tr>`;
    }).join('')}</table>${rows.length > LIM ? `<div class="muted" style="padding:8px 14px">Показаны последние ${LIM} из ${rows.length}. Сузьте период или выберите кассира.</div>` : ''}` : `<div class="empty">За этот период событий нет.${S.period === 'today' || S.period === 'yesterday' ? `<div style="margin-top:10px"><button class="btn sm" data-act="period" data-id="week">Показать за 7 дней</button></div>` : ''}</div>`}</div>`];
}
const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };

/* ---------- Отчёты ---------- */
const PERIODS = [['today', 'Сегодня'], ['yesterday', 'Вчера'], ['week', '7 дней'], ['month', '30 дней']];
function pReports() {
  const sc = scope(), s = salesFor(sc, S.period), max = Math.max(1, ...s.rows.map(r => r.sum));
  const pay = [['Карта', s.tot.card, '--m-card'], ['СБП', s.tot.qr, '--m-qr'], ['Наличные', s.tot.cash, '--m-cash']];
  return [`<button class="btn" data-act="export">${ico('down')}Скачать CSV</button>`, `
    <div><div class="seg">${PERIODS.map(([id, l]) => `<button class="${S.period === id ? 'on' : ''}" data-act="period" data-id="${id}">${l}</button>`).join('')}</div></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Выручка</div><div class="v m">${rub(s.tot.sum)}</div></div>
      <div class="kpi"><div class="l">Чеков</div><div class="v">${nm(s.tot.checks)}</div></div>
      <div class="kpi"><div class="l">Средний чек</div><div class="v">${rub(s.avg)}</div></div>
      <div class="kpi"><div class="l">Касс в отчёте</div><div class="v">${s.kassas}</div></div>
    </div>
    <div class="card flush"><h3 style="padding:10px 14px 0">${esc(s.levelLabel)}</h3>${s.rows.length ? `<table><tr><th>${s.levelLabel === 'Дни' ? 'День' : 'Название'}</th><th></th><th class="r">Чеков</th><th class="r">Средний чек</th><th class="r">Выручка</th></tr>${s.rows.map(r => `<tr><td>${esc(r.name)}</td><td style="width:26%"><div class="bar" style="grid-template-columns:1fr"><span class="t"><i style="width:${r.sum / max * 100}%"></i></span></div></td><td class="r num">${nm(r.checks)}</td><td class="r num">${rub(r.avg)}</td><td class="r num"><b>${rub(r.sum)}</b></td></tr>`).join('')}</table>` : '<div class="empty">Нет данных</div>'}</div>
    <div class="grid2">
      <div class="card"><h3>Способы оплаты</h3><div class="bars">${pay.map(([l, v, c]) => `<div class="bar"><span>${l}</span><span class="t"><i style="width:${v / Math.max(1, s.tot.sum) * 100}%;background:var(${c})"></i></span><span class="vl num">${nm(v / Math.max(1, s.tot.sum) * 100)}%</span></div>`).join('')}</div></div>
      <div class="card flush"><h3 style="padding:10px 14px 0">Популярные позиции</h3><table><tr><th>Позиция</th><th class="r">Шт.</th><th class="r">Сумма</th></tr>${s.top.map(t => `<tr><td>${esc(t.name)}</td><td class="r num">${nm(t.qty)}</td><td class="r num">${rub(t.sum)}</td></tr>`).join('')}</table></div>
    </div>`];
}

/* ---------- Журнал ---------- */
function pJournal() {
  const sc = scope();
  const rows = D.log.filter(e => e.org === S.org && (sc === S.org || related(e.scope, sc)));
  return ['', `
    <div class="card flush">${rows.length ? `<table><tr><th>Когда</th><th>Кто</th><th>Что</th><th>Где</th></tr>${rows.map(e => `<tr><td class="num muted" style="white-space:nowrap">${stamp(e.t)}</td><td>${esc(e.who)}</td><td>${esc(e.act)}</td><td class="muted">${esc(chain(e.scope).length ? chain(e.scope).slice(1).map(nameOf).join(' › ') || 'вся организация' : '—')}</td></tr>`).join('')}</table>` : '<div class="empty">Записей нет.</div>'}</div>`];
}

/* ---------- окна ---------- */
let mSave = null;
function openModal({ title, body, save, label = 'Сохранить', sheet = false, danger = false }) {
  mSave = save;
  $('#modal').innerHTML = `<div class="veil ${sheet ? 'sheet' : ''}"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="mh"><h2>${esc(title)}</h2><button class="ibtn" data-act="mclose" aria-label="Закрыть">${ico('close')}</button></div>
    <form class="mb" id="mform" autocomplete="off" novalidate>${body}</form>
    <div class="mf"><button class="btn" data-act="mclose" type="button">Отмена</button>${save ? `<button class="btn ${danger ? 'bad' : 'p'}" data-act="msave" type="button">${label}</button>` : ''}</div></div></div>`;
  const f = $('#mform input:not([type=checkbox]),#mform select'); if (f) f.focus();
}
function closeModal() { $('#modal').innerHTML = ''; mSave = null; }
function submitModal() {
  if (!mSave) return;
  if (mSave(new FormData($('#mform'))) !== false) { closeModal(); save(); render(); }
}
let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2400); }
const num = v => parseFloat(String(v).replace(',', '.'));

function askName(title, value, done) {
  openModal({ title, body: `<div class="field"><label for="f-name">Название</label><input class="input" id="f-name" name="name" required value="${esc(value)}"></div>`, save: fd => { const v = String(fd.get('name')).trim(); if (!v) { toast('Введите название'); return false; } return done(v); } });
}

/* ---------- действия ---------- */
const A = {
  nav(el) { S.page = el.dataset.id; S.orgOpen = false; render(); },
  pick(el) { const id = el.dataset.id; S.node = id === S.org ? null : id; S.orgOpen = false; render(); },
  tab(el) { S[el.dataset.key] = el.dataset.id; render(); },
  goto(el) { S.page = 'company'; S.ctab = el.dataset.tab; if (el.dataset.tab === 'menu') S.mtab = 'day'; render(); },
  'eq-toggle'(el) {
    const k = nodeById(el.dataset.id); if (!k || k.type !== 'kassa') return;
    const key = el.dataset.key, e = k.eq, label = { acq: 'Эквайринг', scale: 'Весы', display: 'Дисплей покупателя', sbp: 'СБП' }[key];
    if (!label) return;
    let on;
    if (key === 'acq') { on = !acqOn(e); e.acq.on = on; if (on && e.acq.model === 'Без терминала') e.acq.model = ACQ_MODELS[0]; }
    else if (key === 'sbp') { on = !e.sbp; e.sbp = on; }
    else { on = !e[key].on; e[key].on = on; }
    logAct(`${k.name}: ${label} — ${on ? 'включено' : 'выключено'}`, k.id, S.org);
    save(); render(); toast('Сохранено. Касса применит настройки при ближайшей связи');
  },
  fold(el) { const id = el.dataset.id, cur = S.opened[id] ?? chain(scope()).includes(id); S.opened[id] = !cur; render(); },
  orgmenu() { S.orgOpen = !S.orgOpen; render(); },
  org(el) { S.org = el.dataset.id; S.node = null; S.opened = {}; render(); },
  neworg() {
    S.orgOpen = false; render();
    askName('Новая организация', '', v => { const id = uid('o'); D.orgs.push({ id, name: v }); D.profiles.push({ id: uid('p'), org: id, name: 'Кассир', rights: ['sale', 'shift'] }); S.org = id; S.node = null; logAct('Создана организация «' + v + '»', id, id); });
  },
  theme() { const l = document.documentElement.dataset.theme === 'light'; if (l) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = 'light'; try { localStorage.setItem('asoft-mgr-theme', l ? 'dark' : 'light'); } catch (_) {} render(); },
  reset() { openModal({ title: 'Сбросить демо-данные?', body: '<p class="muted">Все ваши правки в этой тестовой версии пропадут, вернётся исходный набор.</p>', label: 'Сбросить', danger: true, save: () => { resetData(); S.org = D.orgs[0].id; S.node = null; } }); },
  period(el) { S.period = el.dataset.id; render(); },
  utab(el) { S.uTab = el.dataset.id; render(); },

  /* структура */
  add(el) {
    const pid = el.dataset.id, [type, label] = CHILD_OF[typeOf(pid)];
    const auto = type === 'kassa' ? 'Касса №' + (D.nodes.filter(n => n.type === 'kassa' && n.org === S.org).reduce((m, k) => Math.max(m, parseInt(k.name.replace(/\D/g, '')) || 0), 0) + 1) : '';
    askName('Новое: ' + label.toLowerCase(), auto, v => {
      const n = { id: uid('n'), org: S.org, parent: pid, type, name: v };
      if (type === 'kassa') Object.assign(n, { last: 9999, eq: { kkt: { model: KKT_MODELS[0], fn: '', fnTill: ymd(new Date(Date.now() + 365 * 864e5)), conn: 'USB', ip: '' }, acq: { model: ACQ_MODELS[0], conn: 'LAN' }, printer: { model: 'Чековый принтер 80 мм', conn: 'USB' }, scale: { on: false, model: '', conn: 'COM' }, display: { on: false, conn: 'USB' }, sbp: true } });
      D.nodes.push(n); S.node = n.id; logAct(`Создан${type === 'kassa' ? 'а' : ''} ${label.toLowerCase()} «${v}»`, n.id, S.org);
    });
  },
  rename(el) {
    const id = el.dataset.id, o = orgById(id) || nodeById(id);
    askName('Переименовать', o.name, v => { logAct(`«${o.name}» переименовано в «${v}»`, id, S.org); o.name = v; });
  },
  del(el) {
    const id = el.dataset.id, n = nodeById(id), ids = subtreeIds(id), ks = kassasUnder(id).length;
    openModal({
      title: 'Удалить «' + n.name + '»?', label: 'Удалить', danger: true,
      body: `<p class="muted">${ks ? `Вместе с ним удалятся вложенные элементы, касс: ${ks}. ` : ''}Меню, заданное на этом уровне, тоже удалится. Действие нельзя отменить.</p>`,
      save: () => {
        const parent = n.parent; logAct(`Удалено «${n.name}»`, parent, S.org);
        const itemIds = D.items.filter(i => ids.includes(i.scope)).map(i => i.id);
        D.nodes = D.nodes.filter(x => !ids.includes(x.id));
        D.items = D.items.filter(i => !ids.includes(i.scope));
        D.over = D.over.filter(o => !ids.includes(o.scope) && !itemIds.includes(o.item));
        D.users.forEach(u => { u.access = u.access.filter(a => !ids.includes(a)); });
        S.node = parent === S.org ? null : parent;
      },
    });
  },

  /* меню */
  'item-add'() {
    const sc = scopeForMenu();
    openModal({ title: 'Новая позиция', body: itemForm(null, true), save: fd => {
      const name = String(fd.get('name')).trim(), price = num(fd.get('price'));
      if (!name || !(price >= 0)) { toast('Введите название и цену'); return false; }
      D.items.push({ id: uid('i'), scope: sc, name, section: fd.get('section'), price });
      logAct(`Добавлена позиция «${name}» (${rub(price)})`, sc, S.org);
    } });
  },
  'item-edit'(el) {
    const sc = scopeForMenu(), id = el.dataset.id, row = effectiveMenu(sc).find(r => r.item.id === id), it = row.item, own = row.from === sc;
    openModal({ title: 'Позиция «' + it.name + '»', body: itemForm(row, false), save: fd => {
      const price = num(fd.get('price'));
      if (!(price >= 0)) { toast('Введите цену'); return false; }
      if (own) {
        const name = String(fd.get('name')).trim(); if (!name) { toast('Введите название'); return false; }
        it.name = name; it.section = fd.get('section'); it.price = price;
      } else {
        const base = effectiveMenu(sc, sc).find(r => r.item.id === id).price;
        setOver(sc, id, { price: price === base ? undefined : price });
      }
      logAct(`Цена «${it.name}» → ${rub(price)}`, sc, S.org);
    } });
  },
  'item-hide'(el) { const sc = scopeForMenu(), id = el.dataset.id, it = D.items.find(i => i.id === id); setOver(sc, id, { hidden: true }); logAct(`Позиция «${it.name}» скрыта`, sc, S.org); save(); render(); },
  'item-show'(el) { const sc = scopeForMenu(), id = el.dataset.id, it = D.items.find(i => i.id === id), r = effectiveMenu(sc).find(r => r.item.id === id); setOver(sc, id, { hidden: r.hiddenFrom === sc ? undefined : false }); logAct(`Позиция «${it.name}» снова на кассах`, sc, S.org); save(); render(); },
  'item-reset'(el) { const sc = scopeForMenu(), id = el.dataset.id, it = D.items.find(i => i.id === id); D.over = D.over.filter(o => !(o.scope === sc && o.item === id)); logAct(`«${it.name}»: правки уровня «${nameOf(sc)}» сброшены`, sc, S.org); save(); render(); },
  'item-del'(el) {
    const sc = scopeForMenu(), id = el.dataset.id, it = D.items.find(i => i.id === id);
    openModal({ title: 'Удалить «' + it.name + '»?', label: 'Удалить', danger: true, body: '<p class="muted">Позиция пропадёт на всех кассах ниже по структуре.</p>', save: () => { D.items = D.items.filter(i => i.id !== id); D.over = D.over.filter(o => o.item !== id); logAct(`Удалена позиция «${it.name}»`, sc, S.org); } });
  },

  /* пользователи */
  'user-add'() {
    const sc = hallOf(scope()), t = typeOf(sc), u = { name: '', pin: '', profile: (D.profiles.find(p => p.org === S.org) || {}).id, access: ['unit', 'hall'].includes(t) ? [sc] : [] };
    openModal({ title: 'Новый пользователь', body: userForm(u), save: fd => saveUser(fd, null) });
  },
  'user-edit'(el) { const u = D.users.find(u => u.id === el.dataset.id); openModal({ title: u.name, body: userForm(u), save: fd => saveUser(fd, u) }); },
  'user-del'(el) { const u = D.users.find(u => u.id === el.dataset.id); openModal({ title: 'Удалить «' + u.name + '»?', label: 'Удалить', danger: true, body: '<p class="muted">Он больше не сможет войти ни на одну кассу.</p>', save: () => { D.users = D.users.filter(x => x !== u); logAct(`Удалён пользователь «${u.name}»`, S.org, S.org); } }); },
  'prof-add'() { openModal({ title: 'Новый профиль', body: profForm({ name: '', rights: ['sale'] }), save: fd => saveProf(fd, null) }); },
  'prof-edit'(el) { const p = D.profiles.find(p => p.id === el.dataset.id); openModal({ title: 'Профиль «' + p.name + '»', body: profForm(p), save: fd => saveProf(fd, p) }); },
  'prof-del'(el) {
    const p = D.profiles.find(p => p.id === el.dataset.id), used = D.users.filter(u => u.profile === p.id).length;
    if (used) { toast(`Профиль назначен ${used} польз., сначала смените им профиль`); return; }
    openModal({ title: 'Удалить профиль «' + p.name + '»?', label: 'Удалить', danger: true, body: '<p class="muted">Профиль никому не назначен.</p>', save: () => { D.profiles = D.profiles.filter(x => x !== p); logAct(`Удалён профиль «${p.name}»`, S.org, S.org); } });
  },

  /* кассы */
  'kassa-open'(el) {
    const k = nodeById(el.dataset.id);
    openModal({ title: k.name + ' · ' + nameOf(k.parent), sheet: true, body: kassaForm(k), save: fd => {
      readEq(fd, k.eq, true);
      const ft = $('#mform').dataset.tpl, tf = ft && tplById(ft);
      if (tf && tplMatch(k, tf)) k.tpl = ft;
      logAct(`${k.name}: изменены настройки оборудования`, k.id, S.org);
      toast('Сохранено. Касса применит настройки при ближайшей связи');
    } });
  },

  /* шаблоны */
  'tpl-add'() {
    const ks = kassasUnder(S.org);
    if (!ks.length) { toast('Сначала заведите кассу'); return; }
    const pre = kassasUnder(scope())[0] || ks[0];
    openModal({ title: 'Шаблон из кассы', label: 'Создать', body: `<div class="field"><label for="f-k">Касса-образец</label><select class="input" id="f-k" name="k">${ks.map(k => `<option value="${k.id}" ${k === pre ? 'selected' : ''}>${esc(k.name)} · ${esc(nameOf(k.parent))}, ${esc(nameOf(nodeById(k.parent).parent))}</option>`).join('')}</select></div>
      <div class="field"><label for="f-name">Название шаблона</label><input class="input" id="f-name" name="name" required placeholder="Например: касса раздачи"></div>`, save: fd => tplCreate(nodeById(fd.get('k')), String(fd.get('name')).trim()) });
  },
  'tpl-from'(el) {
    const k = nodeById(el.dataset.id);
    closeModal();
    askName('Шаблон из «' + k.name + '»', '', v => tplCreate(k, v));
  },
  'tpl-fill'() {
    const f = $('#mform'), t = tplById(f.elements.tpl_pick.value), e = t.eq;
    const set = (n, v) => { const x = f.elements[n]; if (x) { if (x.type === 'checkbox') x.checked = v; else x.value = v; } };
    set('kkt_model', e.kkt.model); set('kkt_conn', e.kkt.conn); set('acq_model', e.acq.model); set('acq_conn', e.acq.conn); set('acq_on', e.acq.on !== false);
    set('prn_model', e.printer.model); set('prn_conn', e.printer.conn); set('scale_on', e.scale.on); set('scale_model', e.scale.model); set('scale_conn', e.scale.conn);
    set('disp_on', e.display.on); set('sbp', e.sbp);
    f.dataset.tpl = t.id;
    toast('Подставлено. Нажмите «Сохранить», чтобы отправить на кассу');
  },
  'tpl-edit'(el) {
    const t = tplById(el.dataset.id);
    openModal({ title: 'Шаблон «' + t.name + '»', sheet: true, body: `<div class="field"><label for="f-name">Название</label><input class="input" id="f-name" name="name" required value="${esc(t.name)}"></div>${eqForm(t.eq, false)}
      <p class="hint" style="margin-top:8px">Правка шаблона сама на кассы не уходит. Чтобы отправить её, нажмите «Применить» на карточке шаблона.</p>`, save: fd => {
      const name = String(fd.get('name')).trim(); if (!name) { toast('Введите название'); return false; }
      t.name = name; readEq(fd, t.eq, false); logAct(`Изменён шаблон «${name}»`, S.org, S.org);
    } });
  },
  'tpl-del'(el) {
    const t = tplById(el.dataset.id), used = D.nodes.filter(k => k.tpl === t.id).length;
    openModal({ title: 'Удалить шаблон «' + t.name + '»?', label: 'Удалить', danger: true, body: `<p class="muted">${used ? `Кассы (${used}) сохранят свои настройки и останутся без шаблона.` : 'Шаблон ни к одной кассе не применён.'}</p>`, save: () => {
      D.nodes.forEach(k => { if (k.tpl === t.id) delete k.tpl; }); D.templates = D.templates.filter(x => x !== t); logAct(`Удалён шаблон «${t.name}»`, S.org, S.org);
    } });
  },
  'tpl-apply'(el) {
    const t = tplById(el.dataset.id);
    openModal({ title: 'Применить «' + t.name + '»', body: tplApplyForm(), label: 'Применить', save: fd => {
      const ks = fd.getAll('k').map(nodeById);
      if (!ks.length) { toast('Отметьте кассы'); return false; }
      ks.forEach(k => applyTpl(k, t));
      [...new Set(ks.map(k => k.parent))].forEach(h => logAct(`Шаблон «${t.name}» применён: ${ks.filter(k => k.parent === h).map(k => k.name).join(', ')}`, h, S.org));
      toast(`Применено к ${ks.length} ${plural(ks.length, 'кассе', 'кассам', 'кассам')}. Кассы получат настройки при ближайшей связи`);
    } });
  },
  'tpl-hall'(el) { document.querySelectorAll(`#mform input[data-h="${el.dataset.id}"]`).forEach(x => { x.checked = el.checked; }); },

  /* безопасность */
  'sec-open'(el) { S.period = el.dataset.id; S.page = 'reports'; S.rtab = 'security'; render(); },
  'sec-ok'(el) { const id = el.dataset.id; if (D.secOk[id]) delete D.secOk[id]; else D.secOk[id] = 1; save(); render(); },
  'sec-who'(el) { S.secWho = S.secWho === el.dataset.id ? '' : el.dataset.id; render(); },
  'sec-type'(el) { S.secType = S.secType === el.dataset.id ? '' : el.dataset.id; render(); },
  'sec-export'() {
    const sc = scope(), { rows } = secFiltered(sc), p = PERIODS.find(x => x[0] === S.period)[1];
    const lines = [['Когда', 'Касса', 'Где', 'Кассир', 'Событие', 'Подробно', 'Чек', 'Сумма', 'Внимание', 'Проверено'], ...rows.map(e => { const k = nodeById(e.kassa); return [new Date(e.t).toLocaleString('ru-RU'), k.name, nameOf(k.parent) + ', ' + nameOf(nodeById(k.parent).parent), e.who, SEC_TYPES[e.type][0], e.text, e.chk || '', e.sum ?? '', e.hi ? 'да' : '', D.secOk[e.id] ? 'да' : '']; })];
    downloadCsv(lines, `bezopasnost-${nameOf(sc)}-${p}.csv`);
    toast('Журнал скачан');
  },

  export() {
    const sc = scope(), s = salesFor(sc, S.period), p = PERIODS.find(x => x[0] === S.period)[1];
    const lines = [[s.levelLabel === 'Дни' ? 'День' : 'Название', 'Чеков', 'Средний чек', 'Выручка'], ...s.rows.map(r => [r.name, r.checks, Math.round(r.avg), Math.round(r.sum)]), ['Итого', s.tot.checks, Math.round(s.avg), Math.round(s.tot.sum)]];
    downloadCsv(lines, `otchet-${nameOf(sc)}-${p}.csv`);
    toast('Отчёт скачан');
  },

  mclose() { closeModal(); },
  msave() { submitModal(); },
};

function downloadCsv(lines, name) {
  const csv = '﻿' + lines.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function tplCreate(k, name) {
  if (!name) { toast('Введите название'); return false; }
  const t = { id: uid('t'), org: S.org, name, eq: tplEq(k.eq), from: k.id };
  D.templates.push(t); k.tpl = t.id;
  logAct(`Создан шаблон «${name}» из «${k.name}»`, k.id, S.org);
  S.page = 'company'; S.ctab = 'templates';
  toast('Шаблон создан. Примените его к столовой или кассам');
}

function saveUser(fd, u) {
  const name = String(fd.get('name')).trim(), pin = String(fd.get('pin')).trim(), access = fd.getAll('acc');
  if (!name) { toast('Введите имя'); return false; }
  if (!/^\d{4}$/.test(pin)) { toast('PIN — ровно 4 цифры'); return false; }
  if (!access.length) { toast('Выберите, где пользователь может работать'); return false; }
  if (D.users.some(x => x !== u && x.org === S.org && x.pin === pin)) { toast('Такой PIN уже занят'); return false; }
  if (u) { Object.assign(u, { name, pin, profile: fd.get('profile'), access }); logAct(`Изменён пользователь «${name}»`, access[0], S.org); }
  else { D.users.push({ id: uid('us'), org: S.org, name, pin, profile: fd.get('profile'), access }); logAct(`Добавлен пользователь «${name}»`, access[0], S.org); }
}
function profForm(p) {
  return `<div class="field"><label for="f-name">Название профиля</label><input class="input" id="f-name" name="name" required value="${esc(p.name)}"></div>
    <div class="field"><span class="lbl">Права</span><div class="checks">${RIGHTS.map(([k, l]) => `<label class="chk"><input type="checkbox" name="r" value="${k}" ${p.rights.includes(k) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>`;
}
function saveProf(fd, p) {
  const name = String(fd.get('name')).trim(), rights = fd.getAll('r');
  if (!name) { toast('Введите название'); return false; }
  if (p) { p.name = name; p.rights = rights; logAct(`Изменён профиль «${name}»`, S.org, S.org); }
  else { D.profiles.push({ id: uid('p'), org: S.org, name, rights }); logAct(`Создан профиль «${name}»`, S.org, S.org); }
}

/* ---------- события ---------- */
document.addEventListener('click', e => {
  if (e.target.classList.contains('veil')) { closeModal(); return; }
  if (S.orgOpen && !e.target.closest('.flyout') && !e.target.closest('[data-act="orgmenu"]')) { S.orgOpen = false; render(); }
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) A[el.dataset.act](el);
});
document.addEventListener('change', e => {
  const k = e.target.dataset.chg; if (!k) return;
  S[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; render();
});
document.addEventListener('submit', e => { if (e.target.id === 'mform') { e.preventDefault(); submitModal(); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#modal').firstChild) closeModal(); else if (S.orgOpen) { S.orgOpen = false; render(); } }
  if (e.key === 'Enter' && $('#mform') && e.target.matches('#mform input:not([type=checkbox])')) { e.preventDefault(); submitModal(); }
});

render();
