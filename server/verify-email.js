require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testEmail() {
  const recipient = 'indlachinnu123@gmail.com'; // Account owner's email per Resend error
  console.log('--- Starting Email Delivery Test ---');
  
  try {
    await sendEmail({
      email: recipient,
      subject: '🧪 CampusEats - Production Email Test',
      message: 'If you are reading this, your production-grade email delivery system is working successfully via Resend API!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #f97316;">Success!</h2>
          <p>Your production email delivery system is now active using <strong>Resend</strong>.</p>
          <p>This resolves the issue where emails were working locally but failing in production.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">Sent from CampusEats Verification Test</p>
        </div>
      `
    });
    console.log('--- ✅ Test Completed Successfully ---');
  } catch (error) {
    console.error('--- ❌ Test Failed ---');
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}

testEmail();
