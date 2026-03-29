const { Resend } = require('resend');

const sendEmail = async (options) => {
  // Check for RESEND_API_KEY
  if (!process.env.RESEND_API_KEY) {
    console.log('\n===================================================');
    console.log('📬 MOCK EMAIL OTP (Add RESEND_API_KEY to .env to send real emails via Resend)');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message || '[html body]'}`);
    console.log('===================================================\n');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  console.log(`📧 Preparing to send email via Resend...`);

  try {
    const data = await resend.emails.send({
      from: `CampusEats <${fromEmail}>`,
      to: [options.email],
      subject: options.subject,
      html: options.html,
      text: options.message,
    });

    if (data.error) {
      console.error('❌ Resend API Error:', JSON.stringify(data.error, null, 2));
      throw new Error(data.error.message || 'Resend API error');
    }

    console.log(`📨 Email sent successfully! ID: ${data.data?.id}`);
    return data;
  } catch (error) {
    console.error(`❌ Resend Send Error [${options.subject}]:`, error.message);
    if (error.response) {
      console.error('Full Resend Error Context:', JSON.stringify(error.response, null, 2));
    } else {
      console.debug('Full Resend Error Context:', error);
    }
    throw new Error(`Email delivery failed: ${error.message}`, { cause: error });
  }
};

module.exports = sendEmail;
