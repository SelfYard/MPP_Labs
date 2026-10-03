const API = 'http://localhost:3001/api/books';
const UPLOADS = 'http://localhost:3001';

const $error   = document.getElementById('error');
const $form    = document.getElementById('form');
const $id      = document.getElementById('id');
const $title   = document.getElementById('title');
const $author  = document.getElementById('author');
const $cover   = document.getElementById('cover');
const $list    = document.getElementById('list');
const $submit  = document.getElementById('submitBtn');
const $cancel  = document.getElementById('cancelBtn');

function showError(msg) {
  $error.textContent = Array.isArray(msg) ? msg.join('; ') : msg;
  $error.hidden = !msg;
}
function clearForm() {
  $id.value = '';
  $title.value = '';
  $author.value = '';
  $cover.value = '';
  $submit.textContent = 'Добавить';
  $cancel.hidden = true;
}

async function load() {
  showError('');
  try {
    const r = await fetch(API);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const books = await r.json();
    render(books);
  } catch (e) {
    showError(`Не удалось загрузить: ${e.message}`);
  }
}

function render(books) {
  $list.innerHTML = '';
  if (!books.length) {
    $list.innerHTML = '<li class="empty">Пока пусто. Добавь первую книгу 📚</li>';
    return;
  }

  for (const b of books) {
    const li = document.createElement('li');
    li.className = 'book';

    const cover = b.cover
      ? `<img src="${UPLOADS}${b.cover}" alt="">`
      : `<div class="cover-placeholder">📖</div>`;

    li.innerHTML = `
      ${cover}
      <div class="meta">
        <div class="title"></div>
        <div class="author"></div>
      </div>
      <div class="actions"></div>
    `;
    li.querySelector('.title').textContent = b.title;
    li.querySelector('.author').textContent = b.author;

    const actions = li.querySelector('.actions');

    const edit = document.createElement('button');
    edit.className = 'btn btn-ghost';
    edit.textContent = 'Изменить';
    edit.onclick = () => startEdit(b);

    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.textContent = 'Удалить';
    del.onclick = () => remove(b.id);

    actions.append(edit, del);
    $list.appendChild(li);
  }
}

function startEdit(b) {
  $id.value = b.id;
  $title.value = b.title;
  $author.value = b.author;
  $cover.value = '';
  $submit.textContent = 'Сохранить';
  $cancel.hidden = false;
}

async function remove(id) {
  if (!confirm('Удалить?')) return;
  showError('');
  const r = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    showError(body.error || `HTTP ${r.status}`);
    return;
  }
  load();
}

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');

  const fd = new FormData();
  fd.append('title', $title.value.trim());
  fd.append('author', $author.value.trim());
  if ($cover.files[0]) fd.append('cover', $cover.files[0]);

  const id = $id.value;
  const url = id ? `${API}/${id}` : API;
  const method = id ? 'PUT' : 'POST';

  const r = await fetch(url, { method, body: fd });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    showError(body.errors || body.error || `HTTP ${r.status}`);
    return;
  }
  clearForm();
  load();
});

$cancel.addEventListener('click', () => { clearForm(); showError(''); });

load();