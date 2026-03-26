const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'support@campuseats.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push VAPID details configured');
} else {
  console.warn('⚠️ Web Push VAPID keys missing. Push notifications will be disabled.');
}

module.exports = webpush;
