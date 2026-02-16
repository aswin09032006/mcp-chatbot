import { useCallback, useEffect, useRef, useState } from 'react';

const useSpeech = () => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    const [analyser, setAnalyser] = useState(null);

    const recognitionRef = useRef(null);
    const synthesisRef = useRef(window.speechSynthesis);
    const audioContextRef = useRef(null);
    const sourceRef = useRef(null);
    const isListeningRef = useRef(false);
    const shouldStopRef = useRef(false);
    const onResultCallbackRef = useRef(null);
    const onErrorCallbackRef = useRef(null);

    // Initialize Audio Context for visualization
    const initAudioContext = async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const analyserNode = audioContextRef.current.createAnalyser();
            analyserNode.fftSize = 256;
            setAnalyser(analyserNode);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
                sourceRef.current.connect(analyserNode);
            } catch (err) {
                console.error("Mic access failed for visualization", err);
            }
        } else if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    };

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    shouldStopRef.current = true;
                    recognitionRef.current.stop();
                } catch (e) { /* Ignore */ }
            }
            if (synthesisRef.current) {
                synthesisRef.current.cancel();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const startListening = useCallback(async (onResult, onError) => {
        if (!recognitionRef.current) {
            console.error('Speech recognition not supported');
            if (onError) onError('Speech recognition not supported');
            return;
        }

        if (isListeningRef.current) return;

        // Initialize visualization
        await initAudioContext();

        onResultCallbackRef.current = onResult;
        onErrorCallbackRef.current = onError;
        shouldStopRef.current = false;

        try {
            recognitionRef.current.onstart = () => {
                isListeningRef.current = true;
                setIsListening(true);
            };

            recognitionRef.current.onend = () => {
                // Auto-restart if not manually stopped
                if (!shouldStopRef.current && isListeningRef.current) {
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        isListeningRef.current = false;
                        setIsListening(false);
                    }
                } else {
                    isListeningRef.current = false;
                    setIsListening(false);
                }
            };

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (interimTranscript) setLastTranscript(interimTranscript);

                if (finalTranscript) {
                    setLastTranscript(finalTranscript);
                    if (onResultCallbackRef.current) {
                        onResultCallbackRef.current(finalTranscript);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                if (event.error === 'no-speech') return;

                console.error('Speech error:', event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    shouldStopRef.current = true;
                    isListeningRef.current = false;
                    setIsListening(false);
                    if (onErrorCallbackRef.current) onErrorCallbackRef.current(event.error);
                }
            };

            recognitionRef.current.start();
        } catch (e) {
            console.error("Start listening failed", e);
            setIsListening(false);
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            shouldStopRef.current = true;
            isListeningRef.current = false;
            recognitionRef.current.stop();
            setIsListening(false);
        }
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
            audioContextRef.current.suspend();
        }
    }, []);

    const speak = useCallback((text) => {
        if (!synthesisRef.current) return;

        synthesisRef.current.cancel(); // Stop current speech
        setLastTranscript(''); // Clear user transcript when AI starts speaking

        // Strip code blocks and markdown for better TTS
        const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[*_~]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Try to pick a decent voice
        const voices = synthesisRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Microsoft Zira') || v.lang === 'en-US');
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthesisRef.current.speak(utterance);
    }, []);

    const cancelSpeech = useCallback(() => {
        if (synthesisRef.current) {
            synthesisRef.current.cancel();
            setIsSpeaking(false);
        }
    }, []);

    return {
        isListening,
        isSpeaking,
        lastTranscript,
        analyser,
        startListening,
        stopListening,
        speak,
        cancelSpeech
    };
};

export default useSpeech;
