const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Use SMTP (Nodemailer) as the primary transport for development/testing
  // This avoids Resend's "verified domain only" restrictions.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `CampusEats <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  console.log(`📧 Preparing to send email via SMTP (Gmail)...`);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully via SMTP! ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ SMTP Send Error [${options.subject}]:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`, { cause: error });
  }
};

module.exports = sendEmail;
