const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * sendEmail - Utility to send emails via Resend (Production) or SMTP (Fallback)
 * @param {Object} options - {email, subject, message, html}
 */
const sendEmail = async (options) => {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  
  const EMAIL_FROM = process.env.EMAIL_FROM || 'campuseats124@gmail.com';
  const isGmailSender = EMAIL_FROM.toLowerCase().includes('gmail.com');

  // STRATEGY: 
  // 1. If the sender is a @gmail.com address, we MUST use SMTP (Resend blocks public domains).
  // 2. If RESEND_API_KEY is present and it's NOT a Gmail sender, try Resend first.
  if (RESEND_KEY && !isGmailSender) {
    console.log(`📧 Attempting email via Resend API [To: ${options.email}]...`);
    const resend = new Resend(RESEND_KEY);
    
    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
      });

      if (error) {
        console.warn(`⚠️ Resend rejected the request: ${error.message}. Falling back to SMTP...`);
        // Fall through to SMTP logic below
      } else {
        console.log(`📨 Email sent successfully via Resend! ID: ${data.id}`);
        return data;
      }
    } catch (err) {
      console.error(`❌ Resend critical failure:`, err.message);
      console.log(`📡 Falling back to SMTP for reliability...`);
      // Fall through to SMTP logic below
    }
  }

  // FALLBACK: SMTP (Gmail) - Mostly for legacy or local environments where Resend isn't configured.
  console.log(`📧 Falling back to SMTP (Gmail) [To: ${options.email}]...`);
  
  // Using explicit port 587 and STARTTLS since many production hosting environments block port 465.
  // We also force IPv4 if possible to avoid node DNS timeout issues with smtp.gmail.com.
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Let nodemailer automatically select the best connection strategy
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000, // increased from 10s to 30s to allow slow cross-datacenter handshakes
    greetingTimeout: 20000,
    socketTimeout: 30000,
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
