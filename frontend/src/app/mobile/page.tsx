'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  description: string;
  action: () => void;
  color: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

interface RecentDeed {
  id: number;
  type: string;
  address: string;
  status: string;
  lastModified: string;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  }[];
}

export default function MobileApp() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [recentDeeds, setRecentDeeds] = useState<RecentDeed[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Check if app is installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Mock data
    setRecentDeeds([
      {
        id: 1,
        type: 'Grant Deed',
        address: '123 Main St, Los Angeles',
        status: 'In Progress',
        lastModified: '2 hours ago'
      },
      {
        id: 2,
        type: 'Quitclaim Deed',
        address: '456 Oak Ave, Beverly Hills',
        status: 'Completed',
        lastModified: 'Yesterday'
      }
    ]);

    setAiSuggestions([
      '💡 You have 3 cached properties ready for quick deed creation',
      '⚡ Complete your profile to unlock 60% faster deed creation',
      '🏠 Similar property found: 125 Main St (same legal description)'
    ]);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'create-deed',
      title: 'Create Deed',
      icon: '📄',
      description: 'AI-powered creation',
      action: () => router.push('/create-deed'),
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'property-search',
      title: 'Property Search',
      icon: '🏠',
      description: 'Find cached properties',
      action: () => router.push('/property-search'),
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 'voice-deed',
      title: 'Voice Deed',
      icon: '🎤',
      description: 'Speak to create',
      action: () => startVoiceInput(),
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      id: 'scan-document',
      title: 'Scan Document',
      icon: '📷',
      description: 'Extract data via camera',
      action: () => startDocumentScan(),
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
  ];

  const startVoiceInput = () => {
    // Check if speech recognition is available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || (window as unknown as {webkitSpeechRecognition: typeof SpeechRecognition}).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        alert('🎤 Listening... Say something like "Create a grant deed for 123 Main Street"');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        alert(`🤖 AI Processing: "${transcript}"\n\nThis would create a deed with AI-extracted information!`);
        // In production: parse speech and create deed
      };

      recognition.onerror = () => {
        alert('❌ Speech recognition not available. Please try typing instead.');
      };

      recognition.start();
    } else {
      alert('❌ Speech recognition not supported in this browser. Please use Chrome or Edge.');
    }
  };

  const startDocumentScan = () => {
    // Check if camera is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      alert('📷 Document scanning would start here!\n\n✨ AI would extract:\n• Property addresses\n• APN numbers\n• Names and signatures\n• Legal descriptions\n\nComing soon!');
      // In production: start camera and OCR processing
    } else {
      alert('❌ Camera access not available. Please enable camera permissions.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '0',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Status Bar Overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '44px',
        background: 'rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <div>9:41</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div>📶</div>
          <div>📴</div>
          <div>🔋</div>
        </div>
      </div>

      {/* App Container */}
      <div style={{
        marginTop: '44px',
        background: 'white',
        minHeight: 'calc(100vh - 44px)',
        borderRadius: isInstalled ? '0' : '20px 20px 0 0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: 0
            }}>
              DeedPro Mobile
            </h1>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              ⚙️
            </div>
          </div>
          <p style={{
            margin: 0,
            opacity: 0.9,
            fontSize: '16px'
          }}>
            AI-powered deed creation in your pocket
          </p>
        </div>

        {/* Install App Banner */}
        {!isInstalled && deferredPrompt && (
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                📱 Install DeedPro App
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                Access offline, faster performance
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              style={{
                background: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Install
            </button>
          </div>
        )}

        {/* AI Suggestions Banner */}
        {aiSuggestions.length > 0 && (
          <div style={{
            margin: '20px',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.05) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#4F46E5',
              fontWeight: '600'
            }}>
              <span>✨</span>
              AI Assistant
            </div>
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  fontSize: '14px',
                  color: '#374151',
                  marginBottom: index < aiSuggestions.length - 1 ? '8px' : '0'
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions Grid */}
        <div style={{
          padding: '0 20px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px'
          }}>
            🚀 Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                style={{
                  background: action.color,
                  border: 'none',
                  borderRadius: '20px',
                  padding: '20px',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.2s ease',
                  transform: 'scale(1)'
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {action.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    {action.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    opacity: 0.9
                  }}>
                    {action.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Deeds */}
        <div style={{
          padding: '0 20px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px'
          }}>
            📄 Recent Deeds
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentDeeds.map((deed) => (
              <div
                key={deed.id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '4px'
                    }}>
                      {deed.type}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {deed.address}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: deed.status === 'Completed' ? '#D1FAE5' : '#FEF3C7',
                    color: deed.status === 'Completed' ? '#065F46' : '#92400E'
                  }}>
                    {deed.status}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#9CA3AF'
                }}>
                  Last modified {deed.lastModified}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          borderTop: '1px solid #E5E7EB',
          padding: '12px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          {[
            { icon: '🏠', label: 'Home', active: true },
            { icon: '📄', label: 'Deeds', active: false },
            { icon: '🏠', label: 'Properties', active: false },
            { icon: '👤', label: 'Profile', active: false }
          ].map((item, index) => (
            <button
              key={index}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: item.active ? '#4F46E5' : '#9CA3AF'
              }}
            >
              <div style={{ fontSize: '20px' }}>{item.icon}</div>
              <div style={{ fontSize: '10px', fontWeight: '500' }}>
                {item.label}
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Padding for Navigation */}
        <div style={{ height: '80px' }} />
      </div>
    </div>
  );
}
