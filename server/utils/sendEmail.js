const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Graceful fallback for local development if ENV credentials are not yet configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n===================================================');
    console.log('📬 MOCK EMAIL OTP (Add EMAIL_USER and EMAIL_PASS to .env to push actual SMTP emails)');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message Payload:\n${options.message || options.html}`);
    console.log('===================================================\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"CampusEats Platform" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
