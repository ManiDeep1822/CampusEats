require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('--- Email Configuration Audit ---');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '******** (Set)' : 'Not Set');

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        console.log('🔍 Testing Connection...');
        await transporter.verify();
        console.log('✅ SMTP Connection Successful!');

        const mailOptions = {
            from: `CampusEats <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'SMTP Test - CampusEats',
            text: 'If you are reading this, your Gmail SMTP settings are working perfectly!',
            html: '<h3>Test Successful! 🧾</h3><p>Your Gmail App Password is active.</p>',
        };

        console.log('📨 Sending Test Email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('🚀 Email Sent Successfully! ID:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP Error:', error.message);
        if (error.message.includes('Invalid login')) {
            console.log('⚠️  Hint: Your Google App Password might be incorrect or revoked.');
        }
    }
};

testEmail();
