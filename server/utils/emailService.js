const axios = require('axios');

const sendWithSendGrid = async ({ to, subject, html }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error('SendGrid is not configured');
  }

  await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: 'text/html', value: html }],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

const sendWithSmtp = async ({ to, subject, html }) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL;

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP is not configured');
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    throw new Error('nodemailer is required for SMTP. Install it with: npm i nodemailer');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const useSendGrid =
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY.trim() !== '' &&
    process.env.SENDGRID_API_KEY.trim() !== 'your_sendgrid_api_key_here';

  if (useSendGrid) {
    await sendWithSendGrid({ to, subject, html });
    return;
  }

  await sendWithSmtp({ to, subject, html });
};

module.exports = { sendEmail };
