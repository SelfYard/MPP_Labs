const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../logger');

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: false,
  ignoreTLS: true,
});

async function sendPasswordReset(to, rawToken) {
  const url = `${config.mail.publicUrl}/reset.html?token=${rawToken}`;
  try {
    const info = await transporter.sendMail({
      from: config.mail.from,
      to,
      subject: 'Восстановление доступа',
      text: `Сброс пароля: ${url}\nСсылка действует 15 минут.`,
      html: `<p>Для сброса пароля перейдите:</p>
             <p><a href="${url}">${url}</a></p>
             <p>Ссылка действует 15 минут.</p>`,
    });
    logger.info({ to, messageId: info.messageId }, 'password reset email sent');
  } catch (e) {
    logger.error({ err: e, to }, 'failed to send password reset email');
  }
  return url;
}

module.exports = { sendPasswordReset };