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
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // TLS
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certs in dev environments
    }
  });

  // Verify SMTP connectivity before sending
  try {
    await transporter.verify();
    console.log(`✅ SMTP connected. Sending email to: ${options.email}`);
  } catch (verifyError) {
    console.error('❌ SMTP Connection Failed:', verifyError.message);
    console.error('Check EMAIL_USER and EMAIL_PASS in your .env file. Make sure a Gmail App Password is used (not your regular password).');
    throw new Error(`SMTP connection failed: ${verifyError.message}`);
  }

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

