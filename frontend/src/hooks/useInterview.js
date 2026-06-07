import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage, synthesizeSpeech, transcribeAudio, getOpeningMessage, getHistory } from '../services/api';

export default function useInterview() {
  const [messages, setMessages]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [mode, setMode]           = useState('dsa');
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [error, setError]         = useState(null);

  const audioRef        = useRef(null);
  const currentAudioUrl = useRef(null);

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

    try {
      const result = await sendChatMessage({
        message: userText.trim(),
        sessionId,
        mode,
        difficulty,
        history: historySnapshot.slice(-12),
      });

      addMessage('assistant', result.response, result.feedback);
      if (result.feedback) setFeedback(result.feedback);
      if (autoPlay) await playAudio(result.response);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to get AI response. Is the backend running?';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, mode, difficulty, addMessage, playAudio]);

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

    try {
      const openingText = await getOpeningMessage(selectedMode, selectedDiff);
      const openingMsg = { id: uuidv4(), role: 'assistant', content: openingText, timestamp: new Date(), feedback: null };
      
      setMessages([openingMsg]);
      setIsLoading(false);
      await playAudio(openingText);
    } catch (err) {
      console.error(err);
      setError("Failed to start session. Is the backend running?");
      setIsLoading(false);
    }
  }, [playAudio]);

  // ── load a past session ──────────────────────────────────────────
  const loadSession = useCallback(async (pastSessionId, pastMode) => {
    stopAudio();
    setIsLoading(true);
    setError(null);
    setSessionId(pastSessionId);
    setMode(pastMode || 'dsa');
    setFeedback(null);

    try {
      const data = await getHistory(pastSessionId);
      if (data && data.messages) {
        setMessages(data.messages.map(m => ({
          id: uuidv4(),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          feedback: m.feedback || null
        })));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load session history.");
    } finally {
      setIsLoading(false);
    }
  }, [stopAudio]);

  // ── clear / reset ────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    stopAudio();
    setMessages([]);
    setFeedback(null);
    setError(null);
  }, [stopAudio]);

  return {
    messages, isLoading, isPlaying, feedback,
    sessionId, mode, difficulty, error,
    sendMessage, processAudio, playAudio, stopAudio,
    startSession, loadSession, clearSession, setMode, setDifficulty,
  };
}