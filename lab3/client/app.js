'use strict';

const API = '/api';

const state = {
  token:    null,
  user:     null,
  view:     'books',
  books:    [],
  users:    [],
  sessions: [],
};

function el(id) { return document.getElementById(id); }
function on(id, evt, fn) {
  const node = el(id);
  if (node) node.addEventListener(evt, fn);
  else console.warn(`[app] #${id} not found`);
}
function setText(id, text) {
  const node = el(id);
  if (node) node.textContent = text;
}
function setDisplay(id, show) {
  const node = el(id);
  if (node) node.style.display = show ? '' : 'none';
}

const ROLE_LABEL = {
  user:      'Пользователь',
  moderator: 'Модератор',
  admin:     'Администратор',
};

const ROLE_HINT = {
  user:      'Вы видите и редактируете только свои книги',
  moderator: 'Вы видите и модерируете все книги пользователей',
  admin:     'Полный доступ: книги, пользователи, роли',
};

const ROLE_PERMS = {
  user: [
    { ok: true,  text: 'Просматривать и создавать свои книги' },
    { ok: true,  text: 'Редактировать и удалять только свои книги' },
    { ok: true,  text: 'Управлять своими активными сессиями' },
    { ok: false, text: 'Видеть книги других пользователей' },
    { ok: false, text: 'Управлять пользователями и ролями' },
  ],
  moderator: [
    { ok: true,  text: 'Просматривать все книги всех пользователей' },
    { ok: true,  text: 'Редактировать и удалять любые книги' },
    { ok: true,  text: 'Управлять своими активными сессиями' },
    { ok: false, text: 'Управлять пользователями и ролями' },
  ],
  admin: [
    { ok: true, text: 'Просматривать все книги всех пользователей' },
    { ok: true, text: 'Редактировать и удалять любые книги' },
    { ok: true, text: 'Просматривать список пользователей' },
    { ok: true, text: 'Менять роли пользователям' },
    { ok: true, text: 'Удалять пользователей' },
    { ok: true, text: 'Управлять своими активными сессиями' },
  ],
};

function toast(msg, type = 'info') {
  const box = el('toasts');
  if (!box) { console.warn('[toast]', msg); return; }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = 'all .2s';
    setTimeout(() => t.remove(), 200);
  }, 3500);
}

async function parseError(r) {
  let msg = `HTTP ${r.status}`;
  try {
    const b = await r.json();
    if (b && b.error) {
      msg = b.error.message || msg;
      if (Array.isArray(b.error.details)) {
        msg += ': ' + b.error.details.map(d => d.message || d.field).join('; ');
      }
    }
  } catch (_) { /* not json */ }
  return msg;
}

async function refresh() {
  try {
    const r = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'same-origin' });
    if (!r.ok) { state.token = null; state.user = null; return false; }
    const data = await r.json();
    state.token = data.accessToken;
    state.user  = data.user;
    return true;
  } catch (_) {
    state.token = null;
    state.user = null;
    return false;
  }
}

async function api(path, opts = {}, retry = true) {
  const headers = Object.assign({}, opts.headers || {});
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    opts = Object.assign({}, opts, { body: JSON.stringify(opts.body) });
  }

  let r;
  try {
    r = await fetch(API + path, Object.assign({}, opts, {
      headers,
      credentials: 'same-origin',
    }));
  } catch (e) {
    toast(`Сеть недоступна: ${e.message}`, 'error');
    return { ok: false, status: 0, json: async () => ({}) };
  }

  if (r.status === 401 && retry) {
    if (await refresh()) return api(path, opts, false);
  }
  return r;
}

async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await parseError(r));
  const d = await r.json();
  state.token = d.accessToken;
  state.user  = d.user;
}

async function register(email, password) {
  const r = await fetch(`${API}/auth/register`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await parseError(r));
  const d = await r.json();
  state.token = d.accessToken;
  state.user  = d.user;
}

async function logout() {
  try {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
  } catch (_) { /* ignore */ }
  state.token = null;
  state.user = null;
  state.view = 'books';
  state.books = [];
  state.users = [];
  state.sessions = [];
  render();
}

function render() {
  const authed = !!state.user;

  setDisplay('authView', !authed);
  setDisplay('appView', authed);
  setDisplay('topbarUser', authed);

  if (!authed) return;

  setText('userEmail', state.user.email);

  const badge = el('userRole');
  if (badge) {
    badge.className = `role-badge role-${state.user.role}`;
    badge.textContent = ROLE_LABEL[state.user.role] || state.user.role;
  }

  if (state.user.role === 'user') setText('pageHeading', 'Мои книги');
  else if (state.user.role === 'moderator') setText('pageHeading', 'Все книги');
  else setText('pageHeading', 'Панель управления');

  setText('pageSubheading', ROLE_HINT[state.user.role] || '');
  renderPermissions();

  const isAdmin = state.user.role === 'admin';
  const usersTab = document.querySelector('[data-view="users"]');
  if (usersTab) usersTab.style.display = isAdmin ? '' : 'none';
  if (state.view === 'users' && !isAdmin) state.view = 'books';

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === state.view);
  });

  setDisplay('booksView',    state.view === 'books');
  setDisplay('usersView',    state.view === 'users');
  setDisplay('sessionsView', state.view === 'sessions');

  if (state.view === 'books')    loadBooks();
  if (state.view === 'users')    loadUsersAndStats();
  if (state.view === 'sessions') loadSessions();
}

function renderPermissions() {
  const perms = ROLE_PERMS[state.user.role] || [];
  setText('permissionsTitle', `Что мне доступно (роль: ${ROLE_LABEL[state.user.role] || state.user.role})`);
  const list = el('permissionsList');
  if (!list) return;
  list.innerHTML = '';
  for (const p of perms) {
    const li = document.createElement('li');
    if (!p.ok) li.className = 'denied';
    li.textContent = p.text;
    list.appendChild(li);
  }
}

async function loadBooks() {
  const r = await api('/books');
  if (!r.ok) return toast(await parseError(r), 'error');
  state.books = await r.json();
  renderBooks();
}

function renderBooks() {
  const role = state.user.role;
  const canSeeAll = role !== 'user';

  if (role === 'user') {
    setText('booksHeading', 'Мои книги');
    setText('booksHint', `${state.books.length} шт. · редактировать может только владелец`);
  } else if (role === 'moderator') {
    setText('booksHeading', 'Все книги');
    setText('booksHint', `${state.books.length} шт. · модерация доступна`);
  } else {
    setText('booksHeading', 'Все книги');
    setText('booksHint', `${state.books.length} шт.`);
  }

  const grid = el('booksGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!state.books.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="emoji">📖</div>
        <div>Пока нет ни одной книги</div>
        <div class="sub">Добавьте первую через форму выше</div>
      </div>`;
    return;
  }

  for (const b of state.books) {
    const card = document.createElement('div');
    card.className = 'book-card';
    const cover = b.cover ? `<img src="${b.cover}" alt="">` : `<div class="cover-ph">📖</div>`;
    const canEdit = canSeeAll || b.owner_id === state.user.id;

    card.innerHTML = `
      ${cover}
      <div class="body">
        <div class="title"></div>
        <div class="author"></div>
        ${canSeeAll && b.owner_email ? `<div class="owner">Владелец: <span class="owner-chip"></span></div>` : ''}
      </div>
      <div class="actions"></div>
    `;
    card.querySelector('.title').textContent  = b.title;
    card.querySelector('.author').textContent = b.author;
    if (canSeeAll && b.owner_email) {
      card.querySelector('.owner-chip').textContent = b.owner_email;
    }

    const actions = card.querySelector('.actions');
    if (canEdit) {
      const edit = document.createElement('button');
      edit.className = 'btn btn-secondary btn-sm';
      edit.textContent = 'Изменить';
      edit.onclick = () => startEdit(b);
      actions.appendChild(edit);

      const del = document.createElement('button');
      del.className = 'btn btn-danger btn-sm';
      del.textContent = 'Удалить';
      del.onclick = () => deleteBook(b);
      actions.appendChild(del);
    } else {
      actions.innerHTML = '<span class="muted" style="font-size:12px;">только чтение</span>';
    }

    grid.appendChild(card);
  }
}

function resetBookForm() {
  if (el('bookId'))     el('bookId').value = '';
  if (el('bookTitle'))  el('bookTitle').value = '';
  if (el('bookAuthor')) el('bookAuthor').value = '';
  if (el('bookCover'))  el('bookCover').value = '';
  setText('bookSubmit', 'Добавить');
  setDisplay('bookCancel', false);
}

function startEdit(b) {
  if (el('bookId'))     el('bookId').value = b.id;
  if (el('bookTitle'))  el('bookTitle').value = b.title;
  if (el('bookAuthor')) el('bookAuthor').value = b.author;
  if (el('bookCover'))  el('bookCover').value = '';
  setText('bookSubmit', 'Сохранить');
  setDisplay('bookCancel', true);
  const form = el('bookFormCard');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (el('bookTitle')) el('bookTitle').focus();
}

async function deleteBook(b) {
  if (!confirm(`Удалить книгу «${b.title}»?`)) return;
  const r = await api(`/books/${b.id}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) return toast(await parseError(r), 'error');
  toast('Книга удалена', 'success');
  loadBooks();
}

async function loadUsersAndStats() {
  const [sR, uR] = await Promise.all([api('/admin/stats'), api('/admin/users')]);
  if (!sR.ok) return toast(await parseError(sR), 'error');
  if (!uR.ok) return toast(await parseError(uR), 'error');

  renderStats(await sR.json());
  state.users = await uR.json();
  renderUsers();
}

function renderStats(s) {
  const row = el('statsRow');
  if (!row) return;
  row.innerHTML = `
    <div class="stat-card"><div class="value">${s.users}</div><div class="label">Пользователей</div></div>
    <div class="stat-card"><div class="value">${s.books}</div><div class="label">Книг</div></div>
    <div class="stat-card"><div class="value">${s.admins}</div><div class="label">Админов</div></div>
    <div class="stat-card"><div class="value">${s.moderators}</div><div class="label">Модераторов</div></div>
  `;
}

function renderUsers() {
  const list = el('usersList');
  if (!list) return;
  list.innerHTML = '';

  for (const u of state.users) {
    const isSelf = u.id === state.user.id;
    const row = document.createElement('div');
    row.className = 'user-row';
    row.innerHTML = `
      <div class="main-info">
        <span class="email"></span>
        <span class="role-badge role-${u.role}"></span>
        ${isSelf ? '<span class="self-hint">— это вы</span>' : ''}
      </div>
      <div class="actions"></div>
    `;
    row.querySelector('.email').textContent = u.email;
    row.querySelector('.role-badge').textContent = ROLE_LABEL[u.role] || u.role;

    const actions = row.querySelector('.actions');

    const sel = document.createElement('select');
    sel.className = 'select';
    ['user', 'moderator', 'admin'].forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = ROLE_LABEL[r];
      if (r === u.role) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.disabled = isSelf;
    if (isSelf) sel.title = 'Нельзя менять себе роль';
    sel.onchange = async () => {
      const resp = await api(`/admin/users/${u.id}/role`, {
        method: 'PATCH',
        body: { role: sel.value },
      });
      if (!resp.ok) {
        toast(await parseError(resp), 'error');
        sel.value = u.role;
        return;
      }
      toast(`${u.email} → ${ROLE_LABEL[sel.value]}`, 'success');
      loadUsersAndStats();
    };
    actions.appendChild(sel);

    if (!isSelf) {
      const del = document.createElement('button');
      del.className = 'btn btn-danger btn-sm';
      del.textContent = 'Удалить';
      del.onclick = async () => {
        if (!confirm(`Удалить пользователя ${u.email}?`)) return;
        const resp = await api(`/admin/users/${u.id}`, { method: 'DELETE' });
        if (!resp.ok && resp.status !== 204) return toast(await parseError(resp), 'error');
        toast(`Пользователь ${u.email} удалён`, 'success');
        loadUsersAndStats();
      };
      actions.appendChild(del);
    }

    list.appendChild(row);
  }
}

async function loadSessions() {
  const r = await api('/auth/sessions');
  if (!r.ok) return toast(await parseError(r), 'error');
  state.sessions = await r.json();
  renderSessions();
}

function renderSessions() {
  const list = el('sessionsList');
  if (!list) return;
  list.innerHTML = '';

  if (!state.sessions.length) {
    list.innerHTML = '<div class="empty-state" style="padding:32px;">Нет активных сессий</div>';
    return;
  }

  for (const s of state.sessions) {
    const row = document.createElement('div');
    row.className = 'session-row' + (s.current ? ' current' : '');
    row.innerHTML = `
      <div class="info">
        <div class="ip"></div>
        <div class="ua"></div>
        <div class="time"></div>
      </div>
    `;
    row.querySelector('.ip').textContent = s.ip || 'IP неизвестен';
    row.querySelector('.ua').textContent = s.user_agent || '—';
    row.querySelector('.time').textContent =
      `Создана: ${new Date(s.created_at).toLocaleString()} · ` +
      `активность: ${new Date(s.last_seen).toLocaleString()}`;

    if (s.current) {
      const b = document.createElement('span');
      b.className = 'current-badge';
      b.textContent = 'Текущая';
      row.appendChild(b);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = 'Завершить';
      btn.onclick = async () => {
        const r2 = await api(`/auth/sessions/${s.jti}`, { method: 'DELETE' });
        if (!r2.ok && r2.status !== 204) return toast(await parseError(r2), 'error');
        toast('Сессия завершена', 'success');
        loadSessions();
      };
      row.appendChild(btn);
    }
    list.appendChild(row);
  }
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    if (state.view === t.dataset.view) return;
    state.view = t.dataset.view;
    render();
  });
});

on('tabLogin', 'click', () => {
  if (el('tabLogin'))    el('tabLogin').classList.add('active');
  if (el('tabRegister')) el('tabRegister').classList.remove('active');
  setDisplay('loginForm', true);
  setDisplay('registerForm', false);
});
on('tabRegister', 'click', () => {
  if (el('tabRegister')) el('tabRegister').classList.add('active');
  if (el('tabLogin'))    el('tabLogin').classList.remove('active');
  setDisplay('loginForm', false);
  setDisplay('registerForm', true);
});

on('loginForm', 'submit', async (e) => {
  e.preventDefault();
  try {
    await login(el('loginEmail').value.trim(), el('loginPassword').value);
    render();
    toast('Добро пожаловать!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
});

on('registerForm', 'submit', async (e) => {
  e.preventDefault();
  try {
    await register(el('regEmail').value.trim(), el('regPassword').value);
    render();
    toast('Аккаунт создан', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
});

on('logoutBtn', 'click', () => { logout(); });

on('bookForm', 'submit', async (e) => {
  e.preventDefault();
  const id = el('bookId').value;
  const fd = new FormData();
  fd.append('title',  el('bookTitle').value.trim());
  fd.append('author', el('bookAuthor').value.trim());
  if (el('bookCover').files[0]) fd.append('cover', el('bookCover').files[0]);

  const r = await api(id ? `/books/${id}` : '/books', {
    method: id ? 'PUT' : 'POST',
    body: fd,
  });
  if (!r.ok) return toast(await parseError(r), 'error');

  toast(id ? 'Книга обновлена' : 'Книга добавлена', 'success');
  resetBookForm();
  loadBooks();
});

on('bookCancel', 'click', () => resetBookForm());

on('revokeOthersBtn', 'click', async () => {
  if (!confirm('Завершить все сессии кроме текущей?')) return;
  const r = await api('/auth/sessions', { method: 'DELETE' });
  if (!r.ok && r.status !== 204) return toast(await parseError(r), 'error');
  toast('Остальные сессии завершены', 'success');
  loadSessions();
});

(async () => {
  await refresh();
  render();
  console.log('[app] ready, v=4', state.user ? `logged in as ${state.user.email} (${state.user.role})` : 'guest');
})();