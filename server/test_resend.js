require('dotenv').config();
const { Resend } = require('resend');

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  
  console.log('--- Resend Diagnostic ---');
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  console.log('From Email:', from);
  
  if (!apiKey) {
    console.error('Error: RESEND_API_KEY is missing from .env');
    return;
  }

  const resend = new Resend(apiKey);

  try {
    console.log('Attempting to send a test email...');
    const result = await resend.emails.send({
      from: `Test <${from}>`,
      to: ['delivered@resend.dev'], // Standard test address or they can put their own
      subject: 'Resend Diagnostic Test',
      html: '<strong>Resend is working correctly!</strong>',
    });

    if (result.error) {
      console.error('Resend API Error:', JSON.stringify(result.error, null, 2));
      
      if (result.error.name === 'validation_error' && from === 'onboarding@resend.dev') {
        console.warn('\n--- IMPORTANT NOTE ---');
        console.warn('You are using the "onboarding@resend.dev" email.');
        console.warn('By default, Resend only allows you to send emails to the address you signed up with.');
        console.warn('To send to others, you must verify your own domain in the Resend dashboard.');
        console.warn('----------------------\n');
      }
    } else {
      console.log('Success! Email sent. ID:', result.data.id);
    }
  } catch (err) {
    console.error('Unexpected Runtime Error:', err);
  }
}

testResend();
