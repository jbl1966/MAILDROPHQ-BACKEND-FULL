require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let primaryAPI = '1secmail';
let lastPrimaryFailure = null;

const ONE_SEC_MAIL_DOMAIN = '1secmail.com';
const MAIL_TM_DOMAIN = 'mail.tm';

function get1SecMailInbox(email) {
  const [login, domain] = email.split('@');
  return `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`;
}

function get1SecMailMessage(email, id) {
  const [login, domain] = email.split('@');
  return `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
}

async function check1SecMailAvailability() {
  try {
    const res = await axios.get(
      'https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1',
      { timeout: 3000 }
    );
    return Array.isArray(res.data) && res.data.length > 0;
  } catch {
    return false;
  }
}

async function generateFallbackMailTMEmail() {
  try {
    const domainRes = await axios.get('https://api.mail.tm/domains');
    const domain = domainRes.data['hydra:member'][0].domain;
    const username = Math.random().toString(36).substring(2, 10);
    const password = 'TempPass123!';
    const email = `${username}@${domain}`;

    await axios.post('https://api.mail.tm/accounts', {
      address: email,
      password
    });

    const tokenRes = await axios.post('https://api.mail.tm/token', {
      address: email,
      password
    });

    const token = tokenRes.data.token;
    return { email, token };
  } catch {
    return null;
  }
}

// ========== ROUTES ==========

// Generate email route
app.post('/api/generate', async (req, res) => {
  const { custom } = req.body;

  try {
    const domainRes = await axios.get('https://api.mail.tm/domains');
    const domain = domainRes.data['hydra:member'][0].domain;

    const email = custom
      ? `${custom}@${domain}`
      : `${Math.random().toString(36).substring(2, 10)}@${domain}`;

    const password = 'maildrophq123';

    const accountRes = await axios.post('https://api.mail.tm/accounts', {
      address: email,
      password
    });

    const tokenRes = await axios.post('https://api.mail.tm/token', {
      address: email,
      password
    });

    return res.json({
      id: accountRes.data.id,
      address: email,
      token: tokenRes.data.token,
      engine: 'mail.tm'
    });
  } catch (err) {
    if (err.response && err.response.status === 422) {
      return res.status(400).json({ error: 'Email already taken. Try another name.' });
    }
    console.error('Generate error:', err.message);
    return res.status(500).json({ error: 'Failed to create email address.' });
  }
});


// Inbox polling route
app.get('/api/inbox', async (req, res) => {
  const { email, token, engine } = req.query;

  try {
    if (engine === '1secmail') {
      const inboxURL = get1SecMailInbox(email);
      const response = await axios.get(inboxURL);
      return res.json(response.data);
    } else if (engine === 'mail.tm') {
      const response = await axios.get('https://api.mail.tm/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json(response.data['hydra:member']);
    } else {
      return res.status(400).json({ error: 'Invalid engine' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Inbox fetch failed' });
  }
});

// Read message route
app.get('/api/message', async (req, res) => {
  const { email, id, token, engine } = req.query;

  try {
    if (engine === '1secmail') {
      const msgURL = get1SecMailMessage(email, id);
      const response = await axios.get(msgURL);
      return res.json(response.data);
    } else if (engine === 'mail.tm') {
      const response = await axios.get(`https://api.mail.tm/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json(response.data);
    } else {
      return res.status(400).json({ error: 'Invalid engine' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Message fetch failed' });
  }
});

// Root message
app.get('/', (req, res) => {
  res.send('MailDropHQ Backend is running.');
});

// Health check and auto-recovery
setInterval(async () => {
  if (primaryAPI === 'mail.tm' && Date.now() - lastPrimaryFailure > 60000) {
    const available = await check1SecMailAvailability();
    if (available) {
      console.log('[Recovery] Switching back to 1SecMail');
      primaryAPI = '1secmail';
    }
  }
}, 30000);

// Start server
app.listen(PORT, () => {
  console.log(`MailDropHQ backend running on port ${PORT}`);
});
