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

  console.log(`📧 Preparing to send email using account: ${emailUser}`);


  // Gmail App Passwords work best with the 'service' configuration which handles
  // the correct host, port, and security settings automatically.
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
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ SMTP Send Error [${options.subject}]:`, error.message);
    if (error.code === 'EAUTH') {
        console.error('   -> Check if EMAIL_PASS is a valid App Password and EMAIL_USER is correct.');
    } else if (error.code === 'ESOCKET') {
        console.error('   -> Network or Firewall issue. Check your server\'s outbound connectivity.');
    }
    // We log the full error for high-level debugging
    console.debug('Full SMTP Error Context:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

module.exports = sendEmail;

