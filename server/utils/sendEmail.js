const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * sendEmail - Utility to send emails via Resend (Production) or SMTP (Fallback)
 * @param {Object} options - {email, subject, message, html}
 */
const sendEmail = async (options) => {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  
  if (RESEND_KEY) {
    console.log(`📧 Sending email via Resend API [To: ${options.email}]...`);
    const resend = new Resend(RESEND_KEY);
    
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
      });

      if (error) {
        console.error(`❌ Resend Error [${options.subject}]:`, error.message);
        // If Resend fails, we don't fallback to SMTP automatically to avoid confusion
        throw new Error(`Resend API failed: ${error.message}`);
      }

      console.log(`📨 Email sent successfully via Resend! ID: ${data.id}`);
      return data;
    } catch (err) {
      console.error(`❌ Resend Send Error:`, err.message);
      throw err;
    }
  }

  // FALLBACK: SMTP (Gmail) - Mostly for legacy or local environments where Resend isn't configured.
  console.log(`📧 Falling back to SMTP (Gmail) [To: ${options.email}]...`);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });

  const mailOptions = {
    from: `CampusEats <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully via SMTP! ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ SMTP Send Error:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`, { cause: error });
  }
};

module.exports = sendEmail;
