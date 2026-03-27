const bcrypt = require('bcryptjs');

async function test() {
  const password = 'my_password';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log('Testing correctly matching password:');
  console.log('Result:', await bcrypt.compare(password, hash));

  console.log('\nTesting empty string matching vs hash:');
  console.log('Result:', await bcrypt.compare('', hash));

  console.log('\nTesting null matching vs hash:');
  try {
    console.log('Result:', await bcrypt.compare(null, hash));
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\nTesting undefined matching vs hash:');
  try {
    console.log('Result:', await bcrypt.compare(undefined, hash));
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\nTesting email string matching vs hash:');
  console.log('Result:', await bcrypt.compare('user@email.com', hash));
}

test();
