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
    const domainRes = await axios.get('https://api.mail.tm/domains');
    const domain = domainRes.data['hydra:member'][0].domain;

    const base = custom || Math.random().toString(36).substring(2, 10);
    const password = 'maildrophq123';
    let address = `${base}@${domain}`;
    let modified = false;

    try {
      // Try to create custom email
      const accountRes = await axios.post('https://api.mail.tm/accounts', {
        address,
        password
      });

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
      if (err.response?.status !== 422) throw err;

      // Email already taken – append random suffix
      const suffix = Math.random().toString(36).substring(2, 8);
      const modifiedAddress = `${base}-${suffix}@${domain}`;
      modified = true;

      // Retry with modified address
      const accountRes = await axios.post('https://api.mail.tm/accounts', {
        address: modifiedAddress,
        password
      });

      const tokenRes = await axios.post('https://api.mail.tm/token', {
        address: modifiedAddress,
        password
      });

      return res.json({
        id: accountRes.data.id,
        address: modifiedAddress,
        token: tokenRes.data.token,
        modified: true,
        original: address
      });
    }
  } catch (err) {
    console.error('[generate] error:', err.response?.data || err.message);
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
    console.error('[messages] error:', err.response?.data || err.message);
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
    console.error('[message] error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ===== Root Check =====
app.get('/', (req, res) => {
  res.send('MailDropHQ Backend is running.');
});

app.listen(PORT, () => {
  console.log(`✅ MailDropHQ backend running on port ${PORT}`);
});
