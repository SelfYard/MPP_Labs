function validateBook(body) {
  const title  = (body.title  ?? '').toString().trim();
  const author = (body.author ?? '').toString().trim();

  const details = [];
  if (!title)                    details.push({ field: 'title',  message: 'Название обязательно' });
  else if (title.length  > 200)  details.push({ field: 'title',  message: 'Максимум 200 символов' });
  if (!author)                   details.push({ field: 'author', message: 'Автор обязателен' });
  else if (author.length > 200)  details.push({ field: 'author', message: 'Максимум 200 символов' });

  return { errors: details, value: { title, author } };
}

module.exports = { validateBook };