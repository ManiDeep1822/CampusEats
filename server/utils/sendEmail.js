/**
 * sendEmail - Utility to send emails via Brevo HTTPS API (Replaces Nodemailer)
 * @param {Object} options - {email, subject, message, html}
 */
const sendEmail = async (options) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY; 
  const EMAIL_FROM = process.env.EMAIL_FROM || 'campuseats124@gmail.com'; 

  if (!BREVO_API_KEY || BREVO_API_KEY === 'YOUR_BREVO_API_KEY_HERE') {
    console.warn(`⚠️ Warning: BREVO_API_KEY is not set in .env. Email to ${options.email} will be skipped.`);
    return;
  }

  console.log(`📧 Dispatching email payload via Brevo HTTPS API [To: ${options.email}]...`);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'CampusEats', email: EMAIL_FROM },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html || `<p>${options.message}</p>`,
        textContent: options.message,
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Brevo API rejection');
    }

    const data = await response.json();
    console.log(`📨 Secure Email dispatched instantly! MessageID: ${data.messageId}`);
    return data;
    
  } catch (error) {
    console.error(`❌ Brevo API Delivery Failed:`, error.message);
    throw new Error(`Email delivery blocked by gateway: ${error.message}`, { cause: error });
  }
};

module.exports = sendEmail;
