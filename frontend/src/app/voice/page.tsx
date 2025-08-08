'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

interface VoiceCommand {
  transcript: string;
  confidence: number;
  timestamp: string;
  intent: string;
  extracted_data: any;
  response: string;
}

export default function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onend = handleSpeechEnd;
      recognitionRef.current.onerror = handleSpeechError;
    }

    // Load available voices
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      // Select a nice default voice
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Samantha') || 
        voice.name.includes('Karen') || 
        voice.name.includes('Google US English')
      ) || voices[0];
      setSelectedVoice(preferredVoice);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    // Load previous commands
    const savedCommands = localStorage.getItem('deedpro_voice_commands');
    if (savedCommands) {
      setCommands(JSON.parse(savedCommands));
    }
  }, []);

  const handleSpeechResult = (event: any) => {
    let interimTranscript = '';
    let finalTranscriptResult = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptPart = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscriptResult += transcriptPart;
      } else {
        interimTranscript += transcriptPart;
      }
    }

    setTranscript(interimTranscript);
    if (finalTranscriptResult) {
      setFinalTranscript(finalTranscriptResult);
      processVoiceCommand(finalTranscriptResult);
    }
  };

  const handleSpeechEnd = () => {
    setIsListening(false);
  };

  const handleSpeechError = (event: any) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      setTranscript('');
      setFinalTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const command = analyzeVoiceCommand(text);
    const newCommand: VoiceCommand = {
      transcript: text,
      confidence: 0.95,
      timestamp: new Date().toLocaleTimeString(),
      intent: command.intent,
      extracted_data: command.data,
      response: command.response
    };

    const updatedCommands = [newCommand, ...commands.slice(0, 9)]; // Keep last 10
    setCommands(updatedCommands);
    localStorage.setItem('deedpro_voice_commands', JSON.stringify(updatedCommands));

    // Speak the response
    if (voiceEnabled && selectedVoice) {
      speakResponse(command.response);
    }

    // Execute the command
    if (command.action) {
      setTimeout(() => {
        command.action();
      }, voiceEnabled ? 3000 : 1000); // Wait for speech to finish
    }

    setIsProcessing(false);
  };

  const analyzeVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase();

    // Create deed commands
    if (lowerText.includes('create') && (lowerText.includes('deed') || lowerText.includes('document'))) {
      const deedType = extractDeedType(lowerText);
      const address = extractAddress(text);
      
      return {
        intent: 'create_deed',
        data: { deed_type: deedType, address: address },
        response: `Creating a ${deedType} for ${address || 'the specified property'}. Taking you to the deed wizard now.`,
        action: () => router.push(`/create-deed?type=${deedType}&address=${encodeURIComponent(address || '')}`)
      };
    }

    // Property search commands
    if (lowerText.includes('search') && lowerText.includes('property')) {
      const address = extractAddress(text);
      return {
        intent: 'search_property',
        data: { address: address },
        response: `Searching for property information for ${address || 'the specified address'}.`,
        action: () => router.push(`/property-search?q=${encodeURIComponent(address || '')}`)
      };
    }

    // Team commands
    if (lowerText.includes('team') || lowerText.includes('dashboard')) {
      return {
        intent: 'view_team',
        data: {},
        response: 'Opening your team collaboration dashboard.',
        action: () => router.push('/team')
      };
    }

    // Profile commands
    if (lowerText.includes('profile') || lowerText.includes('settings')) {
      return {
        intent: 'view_profile',
        data: {},
        response: 'Opening your account settings and profile.',
        action: () => router.push('/account-settings')
      };
    }

    // Security commands
    if (lowerText.includes('security') || lowerText.includes('audit')) {
      return {
        intent: 'view_security',
        data: {},
        response: 'Opening your security dashboard and audit logs.',
        action: () => router.push('/security')
      };
    }

    // Default response
    return {
      intent: 'unknown',
      data: { raw_text: text },
      response: `I heard "${text}" but I'm not sure what you'd like me to do. Try saying "create a grant deed" or "search for a property".`,
      action: null
    };
  };

  const extractDeedType = (text: string) => {
    if (text.includes('grant')) return 'grant_deed';
    if (text.includes('quitclaim') || text.includes('quit claim')) return 'quitclaim_deed';
    if (text.includes('warranty')) return 'warranty_deed';
    if (text.includes('trust')) return 'trust_transfer';
    return 'grant_deed'; // default
  };

  const extractAddress = (text: string) => {
    // Simple address extraction - in production, use more sophisticated NLP
    const addressPattern = /(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|place|pl))/i;
    const match = text.match(addressPattern);
    return match ? match[1] : '';
  };

  const speakResponse = (text: string) => {
    if (selectedVoice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const exampleCommands = [
    '🎤 "Create a grant deed for 123 Main Street Los Angeles"',
    '🎤 "Search for property 456 Oak Avenue"',
    '🎤 "Show me my team dashboard"',
    '🎤 "Open my profile settings"',
    '🎤 "Create a quitclaim deed"',
    '🎤 "Show security audit logs"'
  ];

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '0 1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--gray-900)',
              margin: 0
            }}>
              🎤 Voice Command Center
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--gray-600)',
              margin: '0.5rem 0 0 0'
            }}>
              Control DeedPro with natural voice commands
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              Voice Responses
            </label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = availableVoices.find(v => v.name === e.target.value);
                setSelectedVoice(voice || null);
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--gray-300)',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
            >
              {availableVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Voice Interface */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          padding: '0 1rem',
          marginBottom: '2rem'
        }}>
          {/* Voice Input */}
          <div style={{
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 2rem auto',
              background: isListening 
                ? 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)'
                : isProcessing
                ? 'linear-gradient(135deg, #F59E0B 0%, #EAB308 100%)'
                : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease',
              animation: isListening ? 'pulse 1.5s infinite' : 'none'
            }}
            onClick={isListening ? stopListening : startListening}
            >
              {isProcessing ? '🤖' : isListening ? '🎤' : '🎯'}
            </div>

            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '1rem'
            }}>
              {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Ready for Command'}
            </h3>

            <p style={{
              fontSize: '1rem',
              color: 'var(--gray-600)',
              marginBottom: '2rem'
            }}>
              {isProcessing 
                ? 'AI is analyzing your request...' 
                : isListening 
                ? 'Speak your command clearly'
                : 'Click the button and speak naturally'
              }
            </p>

            {/* Live Transcript */}
            {(isListening || transcript) && (
              <div style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '1rem',
                  color: 'var(--gray-700)',
                  fontStyle: transcript && !finalTranscript ? 'italic' : 'normal'
                }}>
                  {finalTranscript || transcript || 'Waiting for speech...'}
                </p>
              </div>
            )}

            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              style={{
                backgroundColor: isListening ? '#EF4444' : 'var(--primary-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              {isProcessing ? '⏳ Processing...' : isListening ? '⏹️ Stop Listening' : '🎤 Start Listening'}
            </button>
          </div>

          {/* Example Commands */}
          <div style={{
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '1rem'
            }}>
              💡 Try These Commands
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exampleCommands.map((command, index) => (
                <div
                  key={index}
                  style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    const text = command.replace('🎤 "', '').replace('"', '');
                    setFinalTranscript(text);
                    processVoiceCommand(text);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-dark)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                    e.currentTarget.style.color = 'initial';
                  }}
                >
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    {command}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#4F46E5',
                fontWeight: '600'
              }}>
                💡 Pro Tip: Speak naturally! The AI understands context and can extract addresses, deed types, and actions from conversational speech.
              </p>
            </div>
          </div>
        </div>

        {/* Command History */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '16px',
          margin: '0 1rem',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--gray-200)',
            backgroundColor: 'var(--gray-50)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--gray-900)',
              margin: 0
            }}>
              📋 Command History
            </h3>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {commands.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--gray-500)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎤</div>
                <p>No voice commands yet. Try speaking a command above!</p>
              </div>
            ) : (
              commands.map((command, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: index < commands.length - 1 ? '1px solid var(--gray-100)' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--gray-900)'
                    }}>
                      "{command.transcript}"
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--gray-500)'
                    }}>
                      {command.timestamp}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: 'var(--primary-dark)',
                      color: 'white'
                    }}>
                      {command.intent.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--gray-500)'
                    }}>
                      Confidence: {Math.round(command.confidence * 100)}%
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--gray-700)',
                    backgroundColor: 'var(--gray-50)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--primary-dark)'
                  }}>
                    🤖 {command.response}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CSS for pulse animation */}
        <style jsx>{`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
