const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

function readTasks() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
}


app.get('/', (req, res) => {
  const tasks = readTasks();
  const filter = req.query.status || 'all';

  let filtered = tasks;
  if (filter === 'done') {
    filtered = tasks.filter(t => t.done);
  } else if (filter === 'pending') {
    filtered = tasks.filter(t => !t.done);
  }

  res.render('index', {
    tasks: filtered,
    filter,
    total: tasks.length
  });
});

app.post('/tasks', upload.array('files'), (req, res) => {
  const { title, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.redirect('/');
  }

  const tasks = readTasks();

  const newTask = {
    id: Date.now().toString(),
    title: title.trim(),
    dueDate: dueDate || '',
    done: false,
    createdAt: new Date().toISOString(),
    files: (req.files || []).map(f => f.filename)
  };

  tasks.push(newTask);
  writeTasks(tasks);

  res.redirect('/');
});

app.post('/tasks/:id/toggle', (req, res) => {
  const tasks = readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (task) {
    task.done = !task.done;
    writeTasks(tasks);
  }
  res.redirect(req.get('referer') || '/');
});

app.post('/tasks/:id/delete', (req, res) => {
  let tasks = readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (task) {
    (task.files || []).forEach(name => {
      const p = path.join(UPLOAD_DIR, name);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    tasks = tasks.filter(t => t.id !== req.params.id);
    writeTasks(tasks);
  }
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
