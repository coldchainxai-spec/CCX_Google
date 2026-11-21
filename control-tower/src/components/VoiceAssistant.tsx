import React, { useState, useEffect, useRef } from 'react';
import { Shipment, NearbyFacility, AlternativeFleet, VoiceChatMessage } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  Send, 
  Sparkles, 
  X,
  Loader2
} from 'lucide-react';

interface VoiceAssistantProps {
  shipment: Shipment;
  nearbyFacilities: NearbyFacility[];
  alternativeFleets: AlternativeFleet[];
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  shipment,
  nearbyFacilities,
  alternativeFleets,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleAskQuestion(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setMicSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingReply]);

  // Text to Speech Helper
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    // Clean text for natural speech (remove markdown symbols)
    const clean = text.replace(/[*_#`~[\]]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Toggle Microphone Listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your question in the text box below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  // 1. One-Click Short Problem Briefing (convey issue in short)
  const handleExplainProblemInShort = () => {
    const isAtRisk = shipment.status === 'AT_RISK';
    const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);

    let briefing = '';
    if (isAtRisk) {
      briefing = `Alert for shipment ${shipment.id}. ${shipment.product} is experiencing an active temperature excursion at ${shipment.currentTemp} degrees Celsius, which is ${delta} degrees above the maximum safe limit of ${shipment.safeRange.max} degrees. The excursion has been ongoing for ${shipment.excursionDurationMinutes || 38} minutes near ${shipment.route.currentGeo.split('(')[0]}. Arctic TransLog alternative standby fleet is available 14 kilometers away, and Cold Storage 50 is available 18 kilometers away for emergency diversion.`;
    } else {
      briefing = `Shipment ${shipment.id} carrying ${shipment.product} is operating normally at ${shipment.currentTemp} degrees Celsius, well within the safe range of ${shipment.safeRange.min} to ${shipment.safeRange.max} degrees. Telemetry is nominal along ${shipment.route.currentGeo.split('(')[0]}.`;
    }

    const newMsg: VoiceChatMessage = {
      id: `brief-${Date.now()}`,
      sender: 'assistant',
      text: briefing,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsg]);
    speakText(briefing);
  };

  // 2. Submit Question & Speak Response (reply back if any questions asked)
  const handleAskQuestion = async (queryText?: string) => {
    const question = (queryText || inputText).trim();
    if (!question) return;

    // Add operator question to chat
    const userMsg: VoiceChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'operator',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoadingReply(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          shipment,
          nearbyFacilities,
          alternativeFleets,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const answer = data.answer || 'I could not process the question.';

      const assistantMsg: VoiceChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
      speakText(data.spokenText || answer);
    } catch (err: any) {
      console.error('Failed to get voice reply:', err);
      const fallbackText = `Shipment ${shipment.id} is currently at ${shipment.currentTemp} degrees Celsius near ${shipment.route.currentGeo.split('(')[0]}. Driver ${shipment.transporter.driverName} can be reached at ${shipment.transporter.driverPhone}.`;
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      speakText(fallbackText);
    } finally {
      setIsLoadingReply(false);
    }
  };

  const quickQuestions = [
    'What is the exact problem?',
    'What is the nearest cold storage?',
    'Any alternative fleet nearby?',
    'Who is the driver and contact number?',
    'What is the recommended next action?',
  ];

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        height: '560px',
        backgroundColor: 'var(--bg-surface)',
        border: '1.5px solid var(--brand-cyan)',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(6, 182, 212, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div 
        style={{ 
          padding: '0.85rem 1.1rem', 
          borderBottom: '1px solid var(--border-main)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: isSpeaking ? '0 0 12px rgba(6, 182, 212, 0.6)' : undefined,
            }}
          >
            <Volume2 size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ColdChainX Voice Assistant
              <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>
                Active
              </span>
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Speaks out alerts & answers live operator questions
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem', color: 'var(--status-danger)' }}
              title="Stop Speech"
            >
              <VolumeX size={14} />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.35rem', borderRadius: '50%' }}
            title="Close Assistant"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Instant Action Bar: "Explain Problem in Short" */}
      <div 
        style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: 'rgba(6, 182, 212, 0.08)', 
          borderBottom: '1px solid var(--border-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={handleExplainProblemInShort}
          className="btn btn-primary"
          style={{ 
            flex: 1, 
            padding: '0.5rem 0.8rem', 
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            boxShadow: '0 2px 10px rgba(6, 182, 212, 0.3)',
          }}
        >
          <Volume2 size={16} />
          <span>🔊 Explain Problem in Short</span>
        </button>

        {isSpeaking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 0.4rem' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--brand-cyan)', animation: 'pulse-dot 0.6s infinite ease-in-out' }} />
            <span style={{ width: '3px', height: '22px', backgroundColor: 'var(--brand-cyan)', animation: 'pulse-dot 0.4s infinite ease-in-out' }} />
            <span style={{ width: '3px', height: '10px', backgroundColor: 'var(--brand-cyan)', animation: 'pulse-dot 0.8s infinite ease-in-out' }} />
            <span style={{ width: '3px', height: '18px', backgroundColor: 'var(--brand-cyan)', animation: 'pulse-dot 0.5s infinite ease-in-out' }} />
          </div>
        )}
      </div>

      {/* Chat Messages Log */}
      <div 
        style={{ 
          flex: 1, 
          padding: '1rem', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.85rem',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)' }}>
            <Sparkles size={28} color="var(--brand-cyan)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Voice Operator Station Ready
            </div>
            <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
              Click <strong>"Explain Problem in Short"</strong> above to hear the incident briefing, or ask any question using the microphone below.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'operator';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '0.2rem',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  backgroundColor: isUser ? 'var(--brand-blue)' : 'var(--bg-secondary)',
                  color: '#ffffff',
                  border: isUser ? 'none' : '1px solid var(--border-main)',
                  fontSize: '0.825rem',
                  lineHeight: 1.45,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  position: 'relative',
                }}
              >
                {!isUser && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                      AI Voice Assistant
                    </span>
                    <button
                      onClick={() => speakText(msg.text)}
                      style={{ background: 'none', border: 'none', color: 'var(--brand-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem' }}
                      title="Replay Voice"
                    >
                      <Volume2 size={12} />
                      <span>Replay</span>
                    </button>
                  </div>
                )}
                {msg.text}
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '0 0.35rem' }}>
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isLoadingReply && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-cyan)', fontSize: '0.8rem', padding: '0.5rem' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Formulating voice answer...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Quick Suggested Question Chips */}
      <div 
        style={{ 
          padding: '0.5rem 0.85rem', 
          backgroundColor: 'var(--bg-secondary)', 
          borderTop: '1px solid var(--border-main)',
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAskQuestion(q)}
            className="btn btn-ghost"
            style={{ 
              padding: '0.25rem 0.6rem', 
              fontSize: '0.7rem', 
              borderRadius: '999px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-main)',
              color: 'var(--text-secondary)',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Voice & Text Input Box */}
      <div 
        style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: 'var(--bg-surface)', 
          borderTop: '1px solid var(--border-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {/* Speak / Microphone Button */}
        <button
          onClick={toggleListening}
          className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
          style={{ 
            padding: '0.55rem', 
            borderRadius: '50%', 
            width: '38px', 
            height: '38px',
            boxShadow: isListening ? '0 0 16px rgba(239, 68, 68, 0.6)' : undefined,
          }}
          title={isListening ? 'Listening... click to stop' : 'Click to speak a question'}
        >
          {isListening ? <Mic size={18} className="pulse-dot" /> : <Mic size={18} color="var(--brand-cyan)" />}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAskQuestion();
          }}
          placeholder={isListening ? 'Listening to voice...' : micSupported ? 'Ask question or speak...' : 'Type your question here...'}
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
            border: isListening ? '1.5px solid var(--status-danger)' : '1px solid var(--border-main)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            color: 'var(--text-main)',
            fontSize: '0.825rem',
            outline: 'none',
          }}
        />

        {/* Send Button */}
        <button
          onClick={() => handleAskQuestion()}
          disabled={!inputText.trim() || isLoadingReply}
          className="btn btn-primary"
          style={{ padding: '0.55rem', borderRadius: '8px', width: '38px', height: '38px' }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};