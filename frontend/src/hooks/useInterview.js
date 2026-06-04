import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage, synthesizeSpeech, transcribeAudio } from '../services/api';

export default function useInterview() {
  const [messages, setMessages]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [sessionId]               = useState(() => uuidv4());
  const [mode, setMode]           = useState('dsa');
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

  const playAudio = useCallback(async (text) => {
    try {
      setIsPlaying(true);
      if (currentAudioUrl.current) URL.revokeObjectURL(currentAudioUrl.current);
      const audioUrl = await synthesizeSpeech(text);
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
    // This avoids the stale-closure problem when called right after setMessages.
    const historySnapshot = currentMessages ?? messages;

    addMessage('user', userText.trim());
    setIsLoading(true);

    try {
      const result = await sendChatMessage({
        message: userText.trim(),
        sessionId,
        mode,
        // Send the full history INCLUDING the opening AI message so the backend
        // knows which question was just asked.
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
  }, [messages, sessionId, mode, addMessage, playAudio]);

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
  const startSession = useCallback((selectedMode) => {
    setMode(selectedMode);
    setMessages([]);
    setFeedback(null);
    setError(null);

    // Opening questions — these MUST match the first entry the backend
    // will look for in history to determine the current topic.
    const openings = {
      dsa: "Hello! I'm your AI technical interviewer. We'll focus on **Data Structures & Algorithms**. Let's begin — **What is the time complexity of binary search, and what condition must the input satisfy for it to work?**",
      hr: "Welcome! I'm your behavioral interviewer. Let's start. **Tell me about a time you faced a significant technical challenge. Walk me through the situation, what you did, and the outcome.**",
      system_design: "Hi! Today we'll work through a system design problem. **Design a URL shortening service like bit.ly. Start by telling me what functional and non-functional requirements you'd clarify with the client.**",
    };

    const openingText = openings[selectedMode] || openings.dsa;

    // Add the opening message to state AND capture it immediately so
    // sendMessage can include it in the history on the very first reply.
    const openingMsg = { id: uuidv4(), role: 'assistant', content: openingText, timestamp: new Date(), feedback: null };

    setTimeout(() => {
      setMessages([openingMsg]);
    }, 300);
  }, []);

  // ── clear / reset ────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    stopAudio();
    setMessages([]);
    setFeedback(null);
    setError(null);
  }, [stopAudio]);

  return {
    messages, isLoading, isPlaying, feedback,
    sessionId, mode, error,
    sendMessage, processAudio, playAudio, stopAudio,
    startSession, clearSession, setMode,
  };
}