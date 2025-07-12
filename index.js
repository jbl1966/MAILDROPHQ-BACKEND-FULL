require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Robust /api/generate route with fallback logic
app.post('/api/generate', async (req, res) => {
  const { custom } = req.body;

  try {
    const domainRes = await axios.get('https://api.mail.tm/domains');
    const domain = domainRes.data['hydra:member'][0].domain;

    const base = custom || Math.random().toString(36).substring(2, 10);
    const password = 'maildrophq123';
    let address = `${base}@${domain}`;

    try {
      const accountRes = await axios.post('https://api.mail.tm/accounts', { address, password });
      const tokenRes = await axios.post('https://api.mail.tm/token', { address, password });

      return res.json({
        id: accountRes.data.id,
        address,
        token: tokenRes.data.token
      });
    } catch (initialErr) {
      const suffix = Math.random().toString(36).substring(2, 8);
      const fallbackAddress = `${base}-${suffix}@${domain}`;

      try {
        const accountRes = await axios.post('https://api.mail.tm/accounts', {
          address: fallbackAddress,
          password
        });

        const tokenRes = await axios.post('https://api.mail.tm/token', {
          address: fallbackAddress,
          password
        });

        return res.json({
          id: accountRes.data.id,
          address: fallbackAddress,
          token: tokenRes.data.token,
          modified: true,
          original: address
        });
      } catch (fallbackErr) {
        console.error('[generate:fallback] failed:', fallbackErr.response?.data || fallbackErr.message);
        return res.status(500).json({ error: 'Unable to create a unique email address.' });
      }
    }
  } catch (err) {
    console.error('[generate] general error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create email address.' });
  }
});

// /api/messages/:id
app.get('/api/messages/:id', async (req, res) => {
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

// /api/message/:inboxId/:messageId
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

// Root status
app.get('/', (req, res) => {
  res.send('MailDropHQ Backend is running.');
});

app.listen(PORT, () => {
  console.log(`✅ MailDropHQ backend running on port ${PORT}`);
});
