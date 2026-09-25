import { useEffect, useRef, useState } from 'react';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useAssistantVoice(open: boolean, context: string, onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const browser = window as SpeechWindow;
  const RecognitionClass = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  const canListen = !!RecognitionClass && window.isSecureContext;
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  function stopListening() {
    const active = recognition.current;
    recognition.current = null;
    if (active) {
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      active.abort();
    }
    setListening(false);
  }
  function stopSpeaking() {
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }
  useEffect(() => {
    setStatus('');
    return () => { stopListening(); stopSpeaking(); };
  }, [open, context]);

  function toggleListening() {
    if (listening) { stopListening(); setStatus('Microphone stopped. You can type your question.'); return; }
    if (!canListen || !RecognitionClass) return;
    stopSpeaking();
    stopListening();
    const active = new RecognitionClass();
    recognition.current = active;
    active.lang = 'en-IN';
    active.continuous = false;
    active.interimResults = false;
    active.onresult = event => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) { onTranscript(text.slice(0, 600)); setStatus('Question captured. Review it, then press Send.'); }
    };
    active.onerror = event => {
      setStatus(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was denied. Allow it in your browser or type a question.'
        : event.error === 'no-speech' ? 'No speech detected. Try again or type a question.'
        : 'Voice input is unavailable. Try again or type a question.');
      stopListening();
    };
    active.onend = () => {
      recognition.current = null;
      setListening(false);
      setStatus(previous => previous === 'Listening… Ask one of the demo questions in English.' ? 'Microphone stopped. Try again or type a question.' : previous);
    };
    try {
      active.start();
      setListening(true);
      setStatus('Listening… Ask one of the demo questions in English.');
    } catch {
      stopListening();
      setStatus('Could not start the microphone. You can type a question instead.');
    }
  }
  function readAnswer(text: string) {
    if (!canSpeak) return;
    stopListening();
    stopSpeaking();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-IN';
    speech.onend = () => { utterance.current = null; setSpeaking(false); };
    speech.onerror = () => { utterance.current = null; setSpeaking(false); setStatus('Audio playback is unavailable. The answer is shown above.'); };
    utterance.current = speech;
    setSpeaking(true);
    window.speechSynthesis.speak(speech);
  }
  return { canListen, canSpeak, listening, speaking, status, toggleListening, stopListening, stopSpeaking, readAnswer };
}
