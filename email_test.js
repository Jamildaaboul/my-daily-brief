require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

console.log('Sending test email to:', process.env.EMAIL_USER);

transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: 'My Daily Brief - Email Test',
  text: 'If you get this, Gmail is working perfectly!'
}).then(() => {
  console.log('✅ Email sent successfully!');
}).catch(err => {
  console.error('❌ Email error:', err.message);
});
