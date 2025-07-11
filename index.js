require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== /api/generate =====
app.post('/api/generate', async (req, res) => {
  const { custom } = req.body;

  try {
    // Get available domain
    const domainRes = await axios.get('https://api.mail.tm/domains');
    const domain = domainRes.data['hydra:member'][0].domain;

    // Create email and password
    const address = custom
      ? `${custom}@${domain}`
      : `${Math.random().toString(36).substring(2, 10)}@${domain}`;
    const password = 'maildrophq123';

    // Create account
    const accountRes = await axios.post('https://api.mail.tm/accounts', {
      address,
      password
    });

    // Authenticate
    const tokenRes = await axios.post('https://api.mail.tm/token', {
      address,
      password
    });

    return res.json({
      id: accountRes.data.id,
      address,
      token: tokenRes.data.token
    });
  } catch (err) {
    if (err.response?.status === 422) {
      return res.status(400).json({ error: 'Email already taken. Try another name.' });
    }
    console.error('[generate] error:', err.message);
    return res.status(500).json({ error: 'Failed to create email address.' });
  }
});

// ===== /api/messages/:id =====
app.get('/api/messages/:id', async (req, res) => {
  const { id } = req.params;
  const auth = req.headers.authorization;

  if (!auth) return res.status(401).json({ error: 'Missing token' });

  try {
    const response = await axios.get('https://api.mail.tm/messages', {
      headers: { Authorization: auth }
    });
    return res.json(response.data['hydra:member']);
  } catch (err) {
    console.error('[messages] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ===== /api/message/:inboxId/:messageId =====
app.get('/api/message/:inboxId/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const auth = req.headers.authorization;

  if (!auth) return res.status(401).json({ error: 'Missing token' });

  try {
    const response = await axios.get(`https://api.mail.tm/messages/${messageId}`, {
      headers: { Authorization: auth }
    });
    return res.json(response.data);
  } catch (err) {
    console.error('[message] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ===== Root check =====
app.get('/', (req, res) => {
  res.send('MailDropHQ Backend is running.');
});

app.listen(PORT, () => {
  console.log(`✅ MailDropHQ backend running on port ${PORT}`);
});
