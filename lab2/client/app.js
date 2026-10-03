const API = '/api/books';   // относительно — nginx проксирует на backend

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
  $error.textContent = msg || '';
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

async function extractError(r) {
  let msg = `HTTP ${r.status}`;
  try {
    const body = await r.json();
    if (body && body.error) {
      msg = body.error.message || msg;
      const details = body.error.details;
      if (Array.isArray(details) && details.length) {
        msg += ': ' + details.map(d => d.message || d.field).join('; ');
      }
    }
  } catch { /* не JSON — оставим базовый текст */ }
  return msg;
}

async function load() {
  showError('');
  try {
    const r = await fetch(API);
    if (!r.ok) return showError(await extractError(r));
    render(await r.json());
  } catch (e) {
    showError(`Сеть недоступна: ${e.message}`);
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
      ? `<img src="${b.cover}" alt="">`
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
  try {
    const r = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!r.ok) return showError(await extractError(r));
    load();
  } catch (e) {
    showError(`Сеть недоступна: ${e.message}`);
  }
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

  try {
    const r = await fetch(url, { method, body: fd });
    if (!r.ok) return showError(await extractError(r));
    clearForm();
    load();
  } catch (e) {
    showError(`Сеть недоступна: ${e.message}`);
  }
});

$cancel.addEventListener('click', () => { clearForm(); showError(''); });

load();