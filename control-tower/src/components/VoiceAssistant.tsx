import React, { useState, useEffect, useRef } from 'react';
import { Shipment, NearbyFacility, AlternativeFleet, VoiceChatMessage } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  Send, 
  X,
  Loader2
} from 'lucide-react';

interface VoiceAssistantProps {
  shipment: Shipment;
  nearbyFacilities: NearbyFacility[];
  alternativeFleets: AlternativeFleet[];
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  shipment,
  nearbyFacilities,
  alternativeFleets,
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Helper to construct short incident briefing
  const constructBriefingText = () => {
    const isAtRisk = shipment.status === 'AT_RISK' || shipment.currentTemp > shipment.safeRange.max;
    const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);
    const bestFleet = alternativeFleets[0];
    const bestFacility = nearbyFacilities[0];

    const fleetText = bestFleet 
      ? `Standby reefer ${bestFleet.transporterCompany} (${bestFleet.vehicleNo}) is available ${bestFleet.distanceKm} km away (ETA ~${bestFleet.etaToShipmentMins} mins).`
      : 'Standby reefer truck available within 14 km.';

    const facilityText = bestFacility 
      ? `Nearest cold store is ${bestFacility.name} (${bestFacility.distanceKm} km away) with ${bestFacility.availableMt} MT available.`
      : 'Cold storage available within 18 km.';

    if (isAtRisk) {
      return `Alert for shipment ${shipment.id} (${shipment.product}). Active temperature excursion at ${shipment.currentTemp}°C, which is +${delta}°C above the safe limit of ${shipment.safeRange.max}°C for ${shipment.excursionDurationMinutes || 38} minutes near ${shipment.route.currentGeo.split('(')[0]}. ${fleetText} ${facilityText}`;
    }

    return `Shipment ${shipment.id} carrying ${shipment.product} is operating normally at ${shipment.currentTemp}°C, within safe range of ${shipment.safeRange.min} to ${shipment.safeRange.max}°C along ${shipment.route.currentGeo.split('(')[0]}.`;
  };

  // Helper to answer operator questions instantly and accurately
  const getSmartAnswer = (rawQuery: string): string => {
    const q = rawQuery.toLowerCase();
    const isAtRisk = shipment.status === 'AT_RISK' || shipment.currentTemp > shipment.safeRange.max;
    const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);
    const bestFleet = alternativeFleets[0];
    const bestFacility = nearbyFacilities[0];

    if (q.includes('problem') || q.includes('issue') || q.includes('alert') || q.includes('excursion') || q.includes('wrong')) {
      return isAtRisk
        ? `The issue is an active temperature excursion on shipment ${shipment.id}. The cargo is at ${shipment.currentTemp}°C, exceeding the safe threshold of ${shipment.safeRange.max}°C by +${delta}°C for ${shipment.excursionDurationMinutes || 38} minutes near ${shipment.route.currentGeo.split('(')[0]}.`
        : `Shipment ${shipment.id} has no active alerts. Current temperature is ${shipment.currentTemp}°C, which is safe.`;
    }

    if (q.includes('cold store') || q.includes('storage') || q.includes('facility') || q.includes('warehouse')) {
      if (bestFacility) {
        return `The nearest verified cold storage is ${bestFacility.name} located ${bestFacility.distanceKm} km away (${bestFacility.estimatedTransitMins} mins transit) with ${bestFacility.availableMt} MT available space. Contact ${bestFacility.owner} at ${bestFacility.phone}.`;
      }
      return 'The closest facility is Cold Storage 50 in Taloja, 18 km away with 462 MT capacity.';
    }

    if (q.includes('fleet') || q.includes('truck') || q.includes('vehicle') || q.includes('transshipment') || q.includes('alternative')) {
      if (bestFleet) {
        return `The best alternative fleet is ${bestFleet.transporterCompany} (${bestFleet.vehicleNo}) located ${bestFleet.distanceKm} km away (ETA ~${bestFleet.etaToShipmentMins} mins). It has a ${bestFleet.payloadCapacityMt} MT capacity and is pre-cooled and ready. Driver: ${bestFleet.driverName} (${bestFleet.driverPhone}).`;
      }
      return 'Arctic TransLog reefer truck MH-04-GP-6721 is on standby 14 km away, pre-cooled and ready for transshipment.';
    }

    if (q.includes('driver') || q.includes('contact') || q.includes('phone') || q.includes('who')) {
      return `Current driver is ${shipment.transporter.driverName} (${shipment.transporter.company}), reachable at ${shipment.transporter.driverPhone}. Vehicle number is ${shipment.transporter.vehicleNo}. Standby fleet driver Sunil Verma is reachable at +91 98201 44521.`;
    }

    if (q.includes('action') || q.includes('recommend') || q.includes('next') || q.includes('what should') || q.includes('do')) {
      const fleetName = bestFleet ? `${bestFleet.transporterCompany} (${bestFleet.vehicleNo})` : 'Arctic TransLog (14 km away)';
      const facilityName = bestFacility ? bestFacility.name : 'Cold Storage 14 (34 km away)';
      return `Recommended action: Instruct driver ${shipment.transporter.driverName} to rendezvous with standby reefer ${fleetName} for immediate transshipment, or divert to ${facilityName}.`;
    }

    if (q.includes('temp') || q.includes('reading') || q.includes('range')) {
      return `Current temperature is ${shipment.currentTemp}°C. Safe configured range is ${shipment.safeRange.min} to ${shipment.safeRange.max}°C.`;
    }

    return `Shipment ${shipment.id} is at ${shipment.currentTemp}°C near ${shipment.route.currentGeo.split('(')[0]}. Both standby reefer fleets and cold stores are available within 20 km. Driver ${shipment.transporter.driverName} is reachable at ${shipment.transporter.driverPhone}.`;
  };

  // Text to Speech Helper
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    // Clean text for natural speech
    const clean = text.replace(/[*_#`~[\]]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Automatically populate incident briefing when assistant opens or shipment changes
  useEffect(() => {
    if (isOpen) {
      const briefing = constructBriefingText();
      const initialMsg: VoiceChatMessage = {
        id: `brief-${Date.now()}`,
        sender: 'assistant',
        text: briefing,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialMsg]);
      speakText(briefing);
    } else {
      stopSpeaking();
    }
  }, [isOpen, shipment.id]);

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
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText(transcript);
          handleAskQuestion(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
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
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingReply]);

  // Toggle Microphone Listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your question in the text box below.');
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

  // 1. One-Click Short Problem Briefing (re-speaks and adds to chat)
  const handleExplainProblemInShort = () => {
    const briefing = constructBriefingText();
    const newMsg: VoiceChatMessage = {
      id: `brief-${Date.now()}`,
      sender: 'assistant',
      text: briefing,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsg]);
    speakText(briefing);
  };

  // 2. Submit Question & Speak Response
  const handleAskQuestion = async (queryText?: string) => {
    const question = (queryText || inputText).trim();
    if (!question) return;

    // Add operator question to chat immediately
    const userMsg: VoiceChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'operator',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoadingReply(true);

    // Compute smart local answer immediately
    const localAnswer = getSmartAnswer(question);

    // Attempt backend server if available, but fallback smoothly
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

      if (response.ok) {
        const data = await response.json();
        const serverAnswer = data.answer || localAnswer;

        const assistantMsg: VoiceChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: serverAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, assistantMsg]);
        speakText(data.spokenText || serverAnswer);
        setIsLoadingReply(false);
        return;
      }
    } catch {
      // Backend unavailable; use local intelligence
    }

    // Local smart reply
    const assistantMsg: VoiceChatMessage = {
      id: `assistant-${Date.now()}`,
      sender: 'assistant',
      text: localAnswer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, assistantMsg]);
    speakText(localAnswer);
    setIsLoadingReply(false);
  };

  const quickQuestions = [
    'What is the exact problem?',
    'What is the nearest cold storage?',
    'Any alternative fleet nearby?',
    'Who is the driver and contact number?',
    'What is the recommended next action?',
  ];

  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '430px',
        maxWidth: 'calc(100vw - 32px)',
        height: '570px',
        backgroundColor: isLight ? '#ffffff' : 'var(--bg-surface)',
        border: '2px solid var(--brand-cyan)',
        borderRadius: '16px',
        boxShadow: isLight 
          ? '0 20px 45px rgba(0, 0, 0, 0.15), 0 0 24px rgba(8, 145, 178, 0.2)' 
          : '0 20px 45px rgba(0, 0, 0, 0.7), 0 0 24px rgba(6, 182, 212, 0.3)',
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
          borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-main)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: isLight ? '#f8fafc' : 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div 
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '9px', 
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: isLight ? '#0f172a' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ColdChainX Voice Assistant
              <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>
                Online
              </span>
            </h3>
            <span style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : 'var(--text-muted)' }}>
              Two-way voice alert synthesized briefing
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', color: 'var(--status-danger)' }}
              title="Stop Speech"
            >
              <VolumeX size={14} />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.35rem', borderRadius: '50%', color: isLight ? '#475569' : 'var(--text-main)' }}
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
          backgroundColor: isLight ? 'rgba(8, 145, 178, 0.08)' : 'rgba(6, 182, 212, 0.08)', 
          borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-main)',
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
            padding: '0.5rem 0.85rem', 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '0 0.4rem' }}>
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
          backgroundColor: isLight ? '#f8fafc' : 'transparent',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'operator';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '0.25rem',
              }}
            >
              <div
                style={{
                  maxWidth: '88%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: isUser 
                    ? '#0284c7' 
                    : (isLight ? '#ffffff' : '#1e293b'),
                  color: isUser 
                    ? '#ffffff' 
                    : (isLight ? '#0f172a' : '#f8fafc'),
                  border: isUser 
                    ? 'none' 
                    : (isLight ? '1.5px solid #cbd5e1' : '1px solid #334155'),
                  fontSize: '0.835rem',
                  lineHeight: 1.5,
                  boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
                  position: 'relative',
                  fontWeight: 500,
                }}
              >
                {!isUser && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: '0.35rem', 
                    borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', 
                    paddingBottom: '0.25rem' 
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                      AI Voice Operations Agent
                    </span>
                    <button
                      onClick={() => speakText(msg.text)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--brand-cyan)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.2rem', 
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                      title="Replay Voice"
                    >
                      <Volume2 size={13} />
                      <span>Replay</span>
                    </button>
                  </div>
                )}
                {msg.text}
              </div>
              <span style={{ fontSize: '0.65rem', color: isLight ? '#64748b' : 'var(--text-dim)', padding: '0 0.35rem' }}>
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isLoadingReply && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-cyan)', fontSize: '0.8rem', padding: '0.5rem' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Formulating response...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Quick Suggested Question Chips */}
      <div 
        style={{ 
          padding: '0.55rem 0.85rem', 
          backgroundColor: isLight ? '#f1f5f9' : 'var(--bg-secondary)', 
          borderTop: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-main)',
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
              padding: '0.3rem 0.65rem', 
              fontSize: '0.72rem', 
              borderRadius: '999px',
              backgroundColor: isLight ? '#ffffff' : 'var(--bg-primary)',
              border: isLight ? '1px solid #cbd5e1' : '1px solid var(--border-main)',
              color: isLight ? '#1e293b' : 'var(--text-main)',
              fontWeight: 500,
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
          backgroundColor: isLight ? '#ffffff' : 'var(--bg-surface)', 
          borderTop: isLight ? '1px solid #e2e8f0' : '1px solid var(--border-main)',
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
            backgroundColor: isLight ? '#f8fafc' : 'var(--bg-primary)',
            border: isListening ? '1.5px solid var(--status-danger)' : (isLight ? '1px solid #cbd5e1' : '1px solid var(--border-main)'),
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            color: isLight ? '#0f172a' : 'var(--text-main)',
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
