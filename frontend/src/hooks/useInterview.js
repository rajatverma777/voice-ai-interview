import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage, synthesizeSpeech, transcribeAudio, getOpeningMessage, getHistory } from '../services/api';

const parseSafeDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  try {
    let s = val.toString().trim();
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    const match = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\d+(.*)$/);
    if (match) {
      s = match[1] + match[2];
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const fallback = s.replace(/-/g, '/').replace('T', ' ');
    const dFallback = new Date(fallback);
    if (!isNaN(dFallback.getTime())) return dFallback;
  } catch (e) {
    console.error("Error parsing date:", e);
  }
  return new Date();
};

export default function useInterview() {
  const [messages, setMessages]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [modelPreference, setModelPreference] = useState(() => {
    return localStorage.getItem('vai_model_preference') || 'cloud';
  });
  const [isApiLimitReached, setIsApiLimitReached] = useState(false);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [mode, setMode]           = useState('dsa');
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [error, setError]         = useState(null);

  const audioRef        = useRef(null);
  const currentAudioUrl = useRef(null);

  const changeModelPreference = useCallback((pref) => {
    if (pref === 'cloud' && isApiLimitReached) {
      return;
    }
    setModelPreference(pref);
    localStorage.setItem('vai_model_preference', pref);
  }, [isApiLimitReached]);

  // ── helpers ──────────────────────────────────────────────────────
  const addMessage = useCallback((role, content, feedbackData = null) => {
    setMessages(prev => [
      ...prev,
      { id: uuidv4(), role, content, timestamp: new Date(), feedback: feedbackData },
    ]);
  }, []);

  const playAudio = useCallback(async (text, isManual = false) => {
    const settingsStr = localStorage.getItem('vai_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};

    if (!isManual && settings.autoPlay === false) {
      return;
    }

    try {
      setIsPlaying(true);
      if (currentAudioUrl.current) URL.revokeObjectURL(currentAudioUrl.current);
      const voice = settings.voice || 'en-US-JennyNeural';
      const speed = settings.voiceSpeed !== undefined ? parseFloat(settings.voiceSpeed) : 1.0;
      const audioUrl = await synthesizeSpeech(text, voice, speed);
      currentAudioUrl.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsPlaying(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // ── send a typed/spoken message ──────────────────────────────────
  const sendMessage = useCallback(async (userText, autoPlay = true, currentMessages = null) => {
    if (!userText?.trim()) return;

    setError(null);

    // Use the messages we pass in (or fall back to state).
    const historySnapshot = currentMessages ?? messages;

    addMessage('user', userText.trim());
    setIsLoading(true);

    const settingsStr = localStorage.getItem('vai_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const targetRole = settings.targetRole || null;
    const targetCompany = settings.targetCompany || null;
    
    let preferredModel = 'gemini';
    if (modelPreference === 'cloud') {
      preferredModel = settings.preferredModel || 'gemini';
      if (preferredModel === 'gpt2' || preferredModel === 'svm') {
        preferredModel = 'gemini';
      }
    } else if (modelPreference === 'gpt2' || modelPreference === 'local') {
      preferredModel = 'gpt2';
    } else if (modelPreference === 'svm') {
      preferredModel = 'svm';
    }

    try {
      const result = await sendChatMessage({
        message: userText.trim(),
        sessionId,
        mode,
        difficulty,
        history: historySnapshot.slice(-12),
        targetRole,
        targetCompany,
        preferredModel,
      });

      addMessage('assistant', result.response, result.feedback);
      if (result.feedback) setFeedback(result.feedback);
      if (result.model_used) {
        setActiveModel(result.model_used);
        // Detect rate limit fallback
        if ((preferredModel === 'gemini' || preferredModel === 'openai' || preferredModel === 'openai_gpt4') && (result.model_used.includes('Local') || result.model_used.includes('SVM'))) {
          setIsApiLimitReached(true);
          const updated = { ...settings, preferredModel: 'gpt2' };
          localStorage.setItem('vai_settings', JSON.stringify(updated));
          window.dispatchEvent(new Event('vai_settings_updated'));
          setModelPreference('local');
          localStorage.setItem('vai_model_preference', 'local');
        }
      }
      if (autoPlay) await playAudio(result.response);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to get AI response. Is the backend running?';
      setError(msg);
      if (modelPreference === 'cloud') {
        setIsApiLimitReached(true);
        setModelPreference('local');
        localStorage.setItem('vai_model_preference', 'local');
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, mode, difficulty, addMessage, playAudio, isApiLimitReached]);

  // ── process voice recording ──────────────────────────────────────
  const processAudio = useCallback(async (audioBlob) => {
    setIsLoading(true);
    setError(null);
    try {
      const transcript = await transcribeAudio(audioBlob);
      if (!transcript?.trim()) {
        setError("Couldn't understand the audio. Please try speaking more clearly.");
        setIsLoading(false);
        return null;
      }
      await sendMessage(transcript);
      return transcript;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Transcription failed. Is the backend running?';
      setError(msg);
      setIsLoading(false);
      return null;
    }
  }, [sendMessage]);

  // ── start a new session ──────────────────────────────────────────
  const startSession = useCallback(async (selectedMode, selectedDiff = 'medium') => {
    setMode(selectedMode);
    setDifficulty(selectedDiff);
    setMessages([]);
    setFeedback(null);
    setError(null);
    setIsLoading(true);

    // Set a new session ID for a fresh session
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    const settingsStr = localStorage.getItem('vai_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const targetRole = settings.targetRole || null;
    const targetCompany = settings.targetCompany || null;
    
    let preferredModel = 'gemini';
    if (modelPreference === 'cloud') {
      preferredModel = settings.preferredModel || 'gemini';
      if (preferredModel === 'gpt2' || preferredModel === 'svm') {
        preferredModel = 'gemini';
      }
    } else if (modelPreference === 'gpt2' || modelPreference === 'local') {
      preferredModel = 'gpt2';
    } else if (modelPreference === 'svm') {
      preferredModel = 'svm';
    }

    try {
      const data = await getOpeningMessage(selectedMode, selectedDiff, newSessionId, targetRole, targetCompany, preferredModel);
      const openingText = data.opening_text;
      const modelUsed = data.model_used;
      const openingMsg = { id: uuidv4(), role: 'assistant', content: openingText, timestamp: new Date(), feedback: null };
      
      setMessages([openingMsg]);
      if (modelUsed) {
        setActiveModel(modelUsed);
        // Detect fallback
        if ((preferredModel === 'gemini' || preferredModel === 'openai' || preferredModel === 'openai_gpt4') && (modelUsed.includes('Local') || modelUsed.includes('SVM'))) {
          setIsApiLimitReached(true);
          const updated = { ...settings, preferredModel: 'gpt2' };
          localStorage.setItem('vai_settings', JSON.stringify(updated));
          window.dispatchEvent(new Event('vai_settings_updated'));
          setModelPreference('local');
          localStorage.setItem('vai_model_preference', 'local');
        } else {
          setIsApiLimitReached(false);
        }
      }
      setIsLoading(false);
      await playAudio(openingText);
    } catch (err) {
      console.error(err);
      setError("Failed to start session. Is the backend running?");
      if (preferredModel === 'gemini' || preferredModel === 'openai' || preferredModel === 'openai_gpt4') {
        setIsApiLimitReached(true);
        const updated = { ...settings, preferredModel: 'gpt2' };
        localStorage.setItem('vai_settings', JSON.stringify(updated));
        window.dispatchEvent(new Event('vai_settings_updated'));
        setModelPreference('local');
        localStorage.setItem('vai_model_preference', 'local');
      }
      setIsLoading(false);
    }
  }, [playAudio, isApiLimitReached]);

  // ── load a past session ──────────────────────────────────────────
  const loadSession = useCallback(async (pastSessionId, pastMode) => {
    stopAudio();
    setError(null);
    setSessionId(pastSessionId);
    setMode(pastMode || 'dsa');
    setFeedback(null);

    // Try loading from localStorage cache first to bypass loading screen
    const cacheKey = `vai_session_cache_${pastSessionId}`;
    const cachedData = localStorage.getItem(cacheKey);
    let hasLoadedFromCache = false;

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.messages) {
          setMessages(parsed.messages.map(m => ({
            id: uuidv4(),
            role: m.role,
            content: m.content,
            timestamp: parseSafeDate(m.timestamp),
            feedback: m.feedback || null
          })));
          // Extract model from cached message list
          const lastAssistantMsg = [...parsed.messages].reverse().find(m => m.role === 'assistant');
          if (lastAssistantMsg && lastAssistantMsg.model_used) {
            setActiveModel(lastAssistantMsg.model_used);
          } else {
            setActiveModel(null);
          }
          hasLoadedFromCache = true;
        }
      } catch (e) {
        console.error("Failed parsing cached session", e);
      }
    }

    if (!hasLoadedFromCache) {
      setIsLoading(true);
    }

    try {
      const data = await getHistory(pastSessionId);
      if (data && data.messages) {
        const parsedMessages = data.messages.map(m => ({
          id: uuidv4(),
          role: m.role,
          content: m.content,
          timestamp: parseSafeDate(m.timestamp),
          feedback: m.feedback || null
        }));
        setMessages(parsedMessages);
        // Extract model from fresh history response
        const lastAssistantMsg = [...data.messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMsg && lastAssistantMsg.model_used) {
          setActiveModel(lastAssistantMsg.model_used);
        } else {
          setActiveModel(null);
        }
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify({ messages: data.messages }));
        return data;
      }
    } catch (err) {
      console.error(err);
      if (!hasLoadedFromCache) {
        setError("Failed to load session history.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [stopAudio]);

  // ── clear / reset ────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    stopAudio();
    setMessages([]);
    setFeedback(null);
    setActiveModel(null);
    setIsApiLimitReached(false);
    setError(null);
  }, [stopAudio]);

  // Auto-cache active session messages to localStorage (deferred to idle time — never block the UI)
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      const save = () => {
        try {
          localStorage.setItem(`vai_session_cache_${sessionId}`, JSON.stringify({ messages }));
        } catch (_) {}
      };
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(save, { timeout: 3000 });
      } else {
        setTimeout(save, 200);
      }
    }
  }, [messages, sessionId]);

  return {
    messages, isLoading, isPlaying, feedback, activeModel,
    modelPreference, changeModelPreference, isApiLimitReached,
    sessionId, mode, difficulty, error,
    sendMessage, processAudio, playAudio, stopAudio,
    startSession, loadSession, clearSession, setMode, setDifficulty,
  };
}