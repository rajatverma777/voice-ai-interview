import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// ── Speech-to-Text ──────────────────────────────────────────────
export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await api.post('/api/speech/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.transcript;
};

// ── AI Chat ─────────────────────────────────────────────────────
export const sendChatMessage = async ({ message, sessionId, mode, history }) => {
  const response = await api.post('/api/ai/chat', {
    message,
    session_id: sessionId,
    mode,
    history: history.map(m => ({ role: m.role, content: m.content })),
  });
  return response.data;
};

export const getInterviewModes = async () => {
  const response = await api.get('/api/ai/modes');
  return response.data.modes;
};

// ── Text-to-Speech ───────────────────────────────────────────────
export const synthesizeSpeech = async (text) => {
  const response = await api.post(
    '/api/tts/synthesize',
    { text },
    { responseType: 'blob' }
  );
  return URL.createObjectURL(response.data);
};

// ── Session History ──────────────────────────────────────────────
export const getHistory = async (sessionId) => {
  const response = await api.get(`/api/history/${sessionId}`);
  return response.data;
};

export const clearHistory = async (sessionId) => {
  const response = await api.delete(`/api/history/${sessionId}`);
  return response.data;
};

// ── Health Check ─────────────────────────────────────────────────
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch {
    return null;
  }
};
