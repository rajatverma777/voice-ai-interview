import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage, synthesizeSpeech, transcribeAudio } from '../services/api';

export default function useInterview() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [sessionId] = useState(() => uuidv4());
  const [mode, setMode] = useState('dsa');
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const currentAudioUrl = useRef(null);

  const addMessage = useCallback((role, content, feedbackData = null) => {
    setMessages(prev => [
      ...prev,
      {
        id: uuidv4(),
        role,
        content,
        timestamp: new Date(),
        feedback: feedbackData,
      }
    ]);
  }, []);

  const playAudio = useCallback(async (text) => {
    try {
      setIsPlaying(true);
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
      }

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

  const sendMessage = useCallback(async (userText, autoPlay = true) => {
    if (!userText?.trim()) return;

    setError(null);
    addMessage('user', userText.trim());
    setIsLoading(true);

    try {
      const result = await sendChatMessage({
        message: userText.trim(),
        sessionId,
        mode,
        history: messages.slice(-8),
      });

      addMessage('assistant', result.response, result.feedback);
      if (result.feedback) setFeedback(result.feedback);

      if (autoPlay) {
        await playAudio(result.response);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to get AI response. Is the backend running?';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, mode, addMessage, playAudio]);

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

  const startSession = useCallback((selectedMode) => {
    setMode(selectedMode);
    setMessages([]);
    setFeedback(null);
    setError(null);

    const openings = {
      dsa: "Hello! I'm your AI technical interviewer. We'll be focusing on **Data Structures & Algorithms** today. Ready? Let's start with a classic — **Can you explain the difference between an array and a linked list, and when would you use each?**",
      hr: "Welcome! I'm your behavioral interviewer today. Let's get to know you better. **Tell me about yourself and what excites you most about software engineering?**",
      system_design: "Great to meet you! Today we'll tackle **System Design**. Let's dive right in — **How would you design a URL shortening service like bit.ly? Start by clarifying the requirements you'd need.**",
    };

    setTimeout(() => {
      addMessage('assistant', openings[selectedMode] || openings.dsa);
    }, 300);
  }, [addMessage]);

  const clearSession = useCallback(() => {
    stopAudio();
    setMessages([]);
    setFeedback(null);
    setError(null);
  }, [stopAudio]);

  return {
    messages,
    isLoading,
    isPlaying,
    feedback,
    sessionId,
    mode,
    error,
    sendMessage,
    processAudio,
    playAudio,
    stopAudio,
    startSession,
    clearSession,
    setMode,
  };
}
