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

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS.replace(/\s/g, ''); // Remove spaces from Gmail app passwords

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"CampusEats Platform" <${emailUser}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`❌ SMTP Error [${options.subject}]:`, error.message);
    if (process.env.NODE_ENV !== 'production') console.error(error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

module.exports = sendEmail;
