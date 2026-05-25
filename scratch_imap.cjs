const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  imap: {
    user: "vinicius.caramori@plannera.com.br",
    password: "Gremio@1903",
    host: "outlook.office365.com",
    port: 993,
    tls: true,
    authTimeout: 15000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

async function listEmails() {
  console.log('Connecting to IMAP...');
  let connection;
  try {
    connection = await imaps.connect(config);
    console.log('Connected!');
    
    await connection.openBox('Helpdesk');
    console.log('Opened Helpdesk box.');
    
    // Fetch all messages (both seen and unseen) to compare
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false
    };
    
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} emails in Helpdesk folder:`);
    
    for (const item of messages) {
      const all = item.parts.find(part => part.which === '');
      if (!all || !all.body) continue;
      const uid = item.attributes.uid;
      
      const mail = await simpleParser(all.body);
      console.log('----------------------------------------------------');
      console.log(`UID: ${uid}`);
      console.log(`Subject: ${mail.subject}`);
      console.log(`From: ${mail.from?.value[0]?.address}`);
      console.log(`Date: ${mail.date ? mail.date.toISOString() : 'N/A'}`);
      console.log(`Body snippet (100 chars): ${String(mail.text || mail.html).substring(0, 200).replace(/\n/g, ' ')}`);
      if (mail.attachments && mail.attachments.length > 0) {
        console.log('Attachments:');
        mail.attachments.forEach(att => {
          console.log(`  - Name: ${att.filename}, CID: ${att.cid}, ContentType: ${att.contentType}, Size: ${att.size}`);
        });
      }
    }
    
    connection.end();
  } catch (err) {
    console.error('IMAP Error:', err);
    if (connection) connection.end();
  }
}

listEmails();
