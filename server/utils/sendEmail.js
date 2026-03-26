const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Graceful fallback for local development if ENV credentials are not yet configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n===================================================');
    console.log('📬 MOCK EMAIL OTP (Add EMAIL_USER and EMAIL_PASS to .env to send real emails)');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message || '[html body]'}`);
    console.log('===================================================\n');
    return;
  }

  // Gmail App Passwords are formatted with spaces (e.g., "xxxx xxxx xxxx xxxx") - strip them
  const emailUser = process.env.EMAIL_USER.trim();
  const emailPass = process.env.EMAIL_PASS.replace(/\s/g, '');

  // Use explicit SMTP host/port config for maximum reliability
  // Port 587 (STARTTLS) is used instead of 465 (SSL) because port 465 is commonly blocked by ISPs
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // upgrade later with STARTTLS
    requireTLS: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"CampusEats Platform" <${emailUser}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ SMTP Send Error [${options.subject}]:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

module.exports = sendEmail;

