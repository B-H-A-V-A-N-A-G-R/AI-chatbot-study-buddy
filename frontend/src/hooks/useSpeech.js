import { useCallback, useEffect, useRef, useState } from 'react';

// Voice dictation for the microphone button, using the browser's built-in speech recognition
// (Chrome and Edge support it; Firefox does not). `supported` is false where it is missing,
// and the UI then hides the microphone instead of showing a button that does nothing.
//
// onResult(text) is called repeatedly with the text heard so far.
export function useSpeech(onResult) {
  const Recognition =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult; // always call the latest callback, even from an old recognition session

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true; // show words while the person is still speaking
    recognition.continuous = false;    // stop by itself after a pause

    recognition.onresult = (event) => {
      const heard = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      onResultRef.current(heard);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false); // e.g. microphone permission denied

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Recognition]);

  // Stop listening if the component goes away.
  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  return { supported: Boolean(Recognition), listening, toggle: () => (listening ? stop() : start()) };
}
