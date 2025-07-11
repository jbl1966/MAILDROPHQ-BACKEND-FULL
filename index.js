const BACKEND_URL = 'https://maildrophq-backend-full.onrender.com';

const generateBtn = document.getElementById('generateBtn');
const newEmailBtn = document.getElementById('newEmailBtn');
const customEmailInput = document.getElementById('customEmailInput');
const generatedEmail = document.getElementById('generatedEmail');
const emailDisplay = document.getElementById('emailDisplay');
const copyBtn = document.getElementById('copyBtn');
const copyTooltip = document.getElementById('copyTooltip');
const inboxList = document.getElementById('inboxList');
const inboxSection = document.getElementById('inboxSection');
const inboxLoading = document.getElementById('inboxLoading');
const messageContent = document.getElementById('messageContent');
const messageSubject = document.getElementById('messageSubject');
const messageFrom = document.getElementById('messageFrom');
const messageDate = document.getElementById('messageDate');
const messageBody = document.getElementById('messageBody');
const closeMessage = document.getElementById('closeMessage');
const countdown = document.getElementById('countdown');
const timerSection = document.getElementById('timerSection');
const darkModeToggle = document.getElementById('darkModeToggle');

let inboxId = '';
let userToken = '';
let timerInterval;
let inboxInterval;
let timeLeft = 600;

// Hide tooltip and email display on initial load
copyTooltip.classList.add('hidden');
emailDisplay.classList.add('hidden');
inboxSection.classList.add('hidden');
timerSection.classList.add('hidden');
newEmailBtn.style.display = 'none';

generateBtn.addEventListener('click', async () => {
  const customName = customEmailInput.value.trim();
  try {
    generateBtn.disabled = true;
    const res = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom: customName })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      inboxId = data.id;
      userToken = data.token;
      generatedEmail.textContent = data.address;

      emailDisplay.classList.remove('hidden');
      inboxSection.classList.remove('hidden');
      timerSection.classList.remove('hidden');
      copyBtn.style.display = 'inline-block';
      newEmailBtn.style.display = 'inline-block';
      customEmailInput.disabled = true;

      pollInbox();
      inboxInterval = setInterval(pollInbox, 8000);
      startTimer();
    } else {
      alert(data.error || 'Failed to create email. Try another name.');
      generateBtn.disabled = false;
    }
  } catch (err) {
    alert('Error creating email. Please try again.');
    generateBtn.disabled = false;
  }
});

newEmailBtn.addEventListener('click', () => location.reload());

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(generatedEmail.textContent).then(() => {
    copyTooltip.classList.remove('hidden');
    setTimeout(() => copyTooltip.classList.add('hidden'), 2000);
  });
});

closeMessage.addEventListener('click', () => {
  messageContent.classList.add('hidden');
  inboxList.classList.remove('hidden');
});

function startTimer() {
  timeLeft = 600;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    countdown.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(inboxInterval);
      customEmailInput.disabled = true;
      generateBtn.disabled = true;
      newEmailBtn.disabled = false;
      countdown.textContent = 'Expired';
    }
  }, 1000);
}

async function pollInbox() {
  if (!inboxId || !userToken) return;
  inboxLoading.classList.remove('hidden');
  try {
    const res = await fetch(`${BACKEND_URL}/api/messages/${inboxId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    const messages = await res.json();
    inboxList.innerHTML = '';

    if (Array.isArray(messages) && messages.length > 0) {
      messages.forEach(msg => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>${msg.from.address}</strong> — ${msg.subject}
          <span>${new Date(msg.createdAt).toLocaleTimeString()}</span>
        `;
        li.addEventListener('click', () => loadMessage(msg.id));
        inboxList.appendChild(li);
      });
    } else {
      inboxList.innerHTML = '<li>No messages yet</li>';
    }
  } catch (err) {
    inboxList.innerHTML = '<li>Error loading inbox</li>';
  }
  inboxLoading.classList.add('hidden');
}

async function loadMessage(messageId) {
  if (!userToken) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/message/${inboxId}/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    const msg = await res.json();
    messageSubject.textContent = msg.subject || '(No Subject)';
    messageFrom.textContent = msg.from.address;
    messageDate.textContent = new Date(msg.createdAt).toLocaleString();
    messageBody.innerHTML = msg.html || `<pre>${msg.text}</pre>`;
    messageContent.classList.remove('hidden');
    inboxList.classList.add('hidden');
  } catch (err) {
    alert('Failed to load message.');
  }
}

// Dark Mode
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }
});
