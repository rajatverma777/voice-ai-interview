import axios from 'axios';

const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:8000"
  : "https://voice-ai-backend-yk1m.onrender.com";
const interval = 30000;

function reloadWebsite() {
  axios
    .get(BASE_URL)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);

console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("REACT_APP_API_URL =", process.env.REACT_APP_API_URL);
console.log("BASE_URL =", BASE_URL);
const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

// Attach JWT on every request if present
api.interceptors.request.use(config => {
  const token = localStorage.getItem('vai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vai_token');
      localStorage.removeItem('vai_user');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────
export const registerUser = async ({ username, email, password }) => {
  const res = await api.post('/api/auth/register', { username, email, password });
  return res.data;
};

export const loginUser = async ({ email, password }) => {
  const res = await api.post('/api/auth/login', { email, password });
  return res.data;
};

export const logoutUser = async () => {
  try { await api.post('/api/auth/logout'); } catch {}
};

export const getMe = async () => {
  const res = await api.get('/api/auth/me');
  return res.data;
};

// ── Speech-to-Text ───────────────────────────────────────────────
export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  const res = await api.post('/api/speech/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.transcript;
};

// ── AI Chat ──────────────────────────────────────────────────────
export const sendChatMessage = async ({ message, sessionId, mode, difficulty, history }) => {
  const res = await api.post('/api/ai/chat', {
    message,
    session_id: sessionId,
    mode,
    difficulty,
    history: history.map(m => ({ role: m.role, content: m.content })),
  });
  return res.data;
};

export const getInterviewModes = async () => {
  const res = await api.get('/api/ai/modes');
  return res.data.modes;
};

export const getOpeningMessage = async (mode, difficulty) => {
  const res = await api.get(`/api/ai/opening?mode=${mode}&difficulty=${difficulty}`);
  return res.data.opening_text;
};

export const getQuestionHint = async (mode, question) => {
  const res = await api.get(`/api/ai/hint?mode=${mode}&question=${encodeURIComponent(question)}`);
  return res.data.hint;
};

// ── Text-to-Speech ───────────────────────────────────────────────
export const synthesizeSpeech = async (text) => {
  const res = await api.post('/api/tts/synthesize', { text }, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

// ── Session History ──────────────────────────────────────────────
export const getHistory = async (sessionId) => {
  const res = await api.get(`/api/history/${sessionId}`);
  return res.data;
};

export const clearHistory = async (sessionId) => {
  const res = await api.delete(`/api/history/${sessionId}`);
  return res.data;
};

export const listSessions = async () => {
  const res = await api.get('/api/history');
  return res.data.sessions;
};

// ── Health Check ─────────────────────────────────────────────────
export const checkHealth = async () => {
  try { return (await api.get('/health')).data; } catch { return null; }
};
