const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'gravoka-7445d',
    clientEmail: 'firebase-adminsdk-fbsvc@gravoka-7445d.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQClCX9mKA+gpZYc\ni8QCwGmj8ShBxQPEgz6zuvgQU5LfSzLMeTqikRqRMaGglvJ1Ihb6jJL7uCPbELow\ncaYdEc6EcG56fnKA+mQbY8mGUCF+lf3nT/0r5ayjNEXlLsvZnibmGSAHm9K5Qgr8\n1S+6lP1LCrZOmvPBjpayGqhWFsNXrxyzVYalixlTlcpji35GTPVwSr7foGHcxjA3\n4uAlp/Ij2w4TwWXtUJCOiKjVOqUUMaFiI7/5uxCZ+slr/eCSNQJvIwWqooe3Yfjo\njSqMPWubUGwtCSZri1KKrTuERLkRJGhv3iBk7Yhk94BwiwUuNi4NfR6Gp6MafMaa\nmiJdIiBJAgMBAAECggEAI9cNbemuxSAYmo/mrANNnb7yE2Bd2lf3LrBgjSkdGPVb\nbYi5KVMyLgxVcYq+Uh4qV9Rd2iDp1nnKOVmA7civbNb+wwbBRo253jHcMpklwPgB\nSPG3xQfuZw3jzOrN9a8w+uDDciuOhlFXkgMZB5+x5xFHOIhRfbwBsWF1I6bzWo/R\nOBAEsBphi/zrwGagdyJ2eS80T1gDHvXbfjJqVtahTifB6XT3ONeeA/wKpH95ceFj\nXceIuTaks/o1yPjRJ4LgY9/sV8EjhdR8QqheE0HBZHuUb8q9jX6RuQWloYzlF+MR\nhIJySuylowPvgx6ZCXvw5ALXqv5R7Qwax8YRAI8gBQKBgQDPTgVmzunY+y72o9CF\nEDlw2+xV5WfoPj8JtyxAk6hgly3EitJwcezKfZWqPNUWNZKUY+WuFUuPxq4AxrBp\nWKlioU/zpfKtBIk45aodMVYfm7OuQVuA0alr5THeCcfqozZFczxUO2eHwvUaN9t1\n/xNdH1EB5N2Q9KbQ7lLS6RP/rQKBgQDLzcUi6FUpjHrjP4vCWYaqj8dhMUq/D03m\n8GqQNF7RW+BNdO8JYSGS7Sq51ouX4kVu+d1FZihyIc/H2wGjTkjDPS7OaOdSezGb\nE4S1gLdEnpES9T1op+WX7FvYGC6PF0u/tqO3eqbeYvZn4BG8W5i3XLx08+I4ZnRl\nIjFTLKlGjQKBgG4HGxbV+4gOyX5es+3sDpC4KVftypiZcRvW/MXJmTSrCL+obsj/\nro5K2YThhLek94eK/fzHkLNe4DvJORiw1jZjJ+xJx+PM5IguXXvhE7TzDwsN5WMZ\n5LI/k5gl2NXQip2R7BNI9Eo6T5z6yKB4Ie7rEDPRJUgqkd+SnqMS0mqBAoGBAJXC\naSBTlXDol8yxf2ObIcfny1zyObjX6CjRdZztvtcdKmAAkz5TL7alrIXOz9kWHmuE\nFELQ5NupWOPFXRjBh9pf9SscDw+fEz6fQx+UrBcyZeyGZU+oQKA4wOy0KFJhjfoc\nnYVQDZrRIbwG/UFqFXh4HsvaAtvq/ZDrZU93PBRpAoGANaYd6huIVxGT3YBmO/+1\nV1N1OnEh9cz2bjNUkGI0E8moeYbxuk1EWr0sX6EyteNHFuDlKdDuJc1IkIewJLPf\ncMisV8K1q1QgfVG3cWndEhnaZNZeo+LU7OGDbfTSWUUwXaoZ0x+IkcoG2J0caTm1\nwsaWdfKf46aEmm8FnxkVMjM=\n-----END PRIVATE KEY-----\n'
  })
});

async function run() {
  try {
    const listUsersResult = await admin.auth().listUsers(10);
    console.log("Found users: ", listUsersResult.users.length);
    listUsersResult.users.forEach((userRecord) => {
      console.log('user', userRecord.email, userRecord.uid);
    });
  } catch (error) {
    console.log('Error listing users:', error);
  }
}

run();
