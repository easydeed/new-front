import React, { useState, useRef, useEffect } from 'react';
import { AdvancedAIService, NLPResponse, AIAction } from '../services/advancedAIService';
import { WizardContext } from '../lib/wizardState';

interface NaturalLanguageInterfaceProps {
  context: WizardContext;
  onActionExecute: (action: AIAction) => void;
  onFieldUpdate: (field: string, value: any) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  confidence?: number;
}

interface SuggestionBubble {
  text: string;
  action?: () => void;
  type: 'quick_action' | 'follow_up' | 'help';
}

export function NaturalLanguageInterface({
  context,
  onActionExecute,
  onFieldUpdate,
  className = '',
  placeholder = "Ask me anything about this step or say what you'd like to do...",
  disabled = false
}: NaturalLanguageInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionBubble[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition if available
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Initialize with welcome message and suggestions
  useEffect(() => {
    if (conversation.length === 0) {
      initializeConversation();
    }
  }, [context.documentType, context.currentStep]);

  const initializeConversation = () => {
    const welcomeMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      type: 'ai',
      content: `Hi! I'm here to help you with your ${context.documentType.replace('_', ' ')} document. You can ask me questions, tell me what you want to do, or ask for help with any step.`,
      timestamp: new Date(),
      confidence: 1.0
    };

    setConversation([welcomeMessage]);
    generateInitialSuggestions();
  };

  const generateInitialSuggestions = () => {
    const initialSuggestions: SuggestionBubble[] = [
      {
        text: "Fill in the property information",
        type: 'quick_action',
        action: () => handleSuggestionClick("Fill in the property information from the search results")
      },
      {
        text: "Show me the ownership history",
        type: 'quick_action',
        action: () => handleSuggestionClick("Show me the ownership history for this property")
      },
      {
        text: "Check for title issues",
        type: 'quick_action',
        action: () => handleSuggestionClick("Are there any title issues with this property?")
      },
      {
        text: "What information do I need for this step?",
        type: 'help',
        action: () => handleSuggestionClick("What information do I need for this step?")
      },
      {
        text: "Analyze title risks",
        type: 'quick_action',
        action: () => handleSuggestionClick("What are the risks with this property title?")
      },
      {
        text: "Help me calculate transfer tax",
        type: 'quick_action',
        action: () => handleSuggestionClick("Help me calculate the transfer tax")
      }
    ];

    setSuggestions(initialSuggestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing || disabled) return;

    await processUserInput(inputValue.trim());
    setInputValue('');
  };

  const processUserInput = async (input: string) => {
    setIsProcessing(true);

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);

    try {
      // Check if this is a chain of title query and process accordingly
      let response;
      if (this.isChainOfTitleQuery(input)) {
        response = await AdvancedAIService.processChainOfTitleQuery(
          input,
          context.propertyData,
          context
        );
      } else {
        // Process with standard advanced AI service
        response = await AdvancedAIService.processNaturalLanguagePrompt(
          input,
          context,
          conversationId
        );
      }

      // Add AI response to conversation
      const aiMessage: ConversationMessage = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: response.response,
        timestamp: new Date(),
        actions: response.actions,
        confidence: response.confidence
      };

      setConversation(prev => [...prev, aiMessage]);

      // Execute high-confidence actions automatically
      for (const action of response.actions) {
        if (action.confidence > 0.8 && !action.requiresConfirmation) {
          executeAction(action);
        }
      }

      // Update suggestions based on response
      updateSuggestions(response);

    } catch (error) {
      console.error('Natural language processing failed:', error);
      
      const errorMessage: ConversationMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'system',
        content: "I'm having trouble understanding that request. Could you try rephrasing it or being more specific?",
        timestamp: new Date()
      };

      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = (action: AIAction) => {
    switch (action.type) {
      case 'update_field':
        onFieldUpdate(action.target, action.value);
        break;
      case 'navigate_step':
        // Handle step navigation
        onActionExecute(action);
        break;
      case 'show_help':
        // Show contextual help
        showHelp(action.target);
        break;
      case 'validate_data':
        // Trigger validation
        onActionExecute(action);
        break;
      default:
        onActionExecute(action);
    }
  };

  const showHelp = (topic: string) => {
    const helpMessage: ConversationMessage = {
      id: `msg_${Date.now()}_help`,
      type: 'ai',
      content: `Here's help information about: ${topic}`,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, helpMessage]);
  };

  const updateSuggestions = (response: NLPResponse) => {
    const newSuggestions: SuggestionBubble[] = [];

    // Add follow-up questions as suggestions
    response.followUpQuestions.forEach(question => {
      newSuggestions.push({
        text: question,
        type: 'follow_up',
        action: () => handleSuggestionClick(question)
      });
    });

    // Add general suggestions
    response.suggestions.forEach(suggestion => {
      newSuggestions.push({
        text: suggestion,
        type: 'help',
        action: () => handleSuggestionClick(suggestion)
      });
    });

    // Add actions that require confirmation as suggestions
    response.actions
      .filter(action => action.requiresConfirmation)
      .forEach(action => {
        newSuggestions.push({
          text: `${action.reasoning} (Click to confirm)`,
          type: 'quick_action',
          action: () => executeAction(action)
        });
      });

    setSuggestions(newSuggestions.slice(0, 6)); // Limit to 6 suggestions
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInputValue(suggestionText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const isChainOfTitleQuery = (query: string): boolean => {
    const chainKeywords = [
      'chain of title', 'ownership history', 'title issues', 'title problems',
      'previous owner', 'current owner', 'title search', 'title report',
      'liens', 'encumbrances', 'title insurance', 'title risk', 'title defects',
      'ownership timeline', 'property history', 'deed history', 'transfers'
    ];
    
    const lowerQuery = query.toLowerCase();
    return chainKeywords.some(keyword => lowerQuery.includes(keyword));
  };

  const clearConversation = () => {
    setConversation([]);
    setSuggestions([]);
    AdvancedAIService.clearConversationHistory(conversationId);
    initializeConversation();
  };

  return (
    <div className={`natural-language-interface ${className}`}>
      {/* Header */}
      <div className="nl-header">
        <div className="nl-title">
          <span className="nl-icon">🤖</span>
          <h3>AI Assistant</h3>
          <span className="nl-status">
            {isProcessing ? '🔄 Thinking...' : '💬 Ready to help'}
          </span>
        </div>
        <div className="nl-controls">
          <button
            className="nl-expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? '📉' : '📈'}
          </button>
          <button
            className="nl-clear-button"
            onClick={clearConversation}
            title="Clear conversation"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Conversation Area */}
      {isExpanded && (
        <div className="nl-conversation-container">
          <div className="nl-conversation" ref={conversationRef}>
            {conversation.map(message => (
              <div key={message.id} className={`nl-message nl-message-${message.type}`}>
                <div className="nl-message-header">
                  <span className="nl-message-sender">
                    {message.type === 'user' ? '👤 You' : 
                     message.type === 'ai' ? '🤖 AI Assistant' : 
                     '⚙️ System'}
                  </span>
                  <span className="nl-message-time">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.confidence && (
                    <span className="nl-message-confidence">
                      {Math.round(message.confidence * 100)}% confident
                    </span>
                  )}
                </div>
                <div className="nl-message-content">
                  {message.content}
                </div>
                {message.actions && message.actions.length > 0 && (
                  <div className="nl-message-actions">
                    <p><strong>Suggested actions:</strong></p>
                    {message.actions.map((action, index) => (
                      <button
                        key={index}
                        className="nl-action-button"
                        onClick={() => executeAction(action)}
                        disabled={action.confidence < 0.5}
                      >
                        {action.reasoning}
                        <span className="nl-action-confidence">
                          ({Math.round(action.confidence * 100)}%)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="nl-message nl-message-ai nl-message-processing">
                <div className="nl-message-header">
                  <span className="nl-message-sender">🤖 AI Assistant</span>
                </div>
                <div className="nl-message-content">
                  <div className="nl-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="nl-suggestions">
          <div className="nl-suggestions-header">
            <span>💡 Suggestions:</span>
          </div>
          <div className="nl-suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className={`nl-suggestion-bubble nl-suggestion-${suggestion.type}`}
                onClick={suggestion.action}
                disabled={disabled}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="nl-input-form">
        <div className="nl-input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isProcessing}
            className="nl-input"
          />
          
          {/* Voice Input Button */}
          {recognitionRef.current && (
            <button
              type="button"
              className={`nl-voice-button ${isListening ? 'nl-voice-listening' : ''}`}
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              disabled={disabled || isProcessing}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            className="nl-submit-button"
            disabled={disabled || isProcessing || !inputValue.trim()}
            title="Send message"
          >
            {isProcessing ? '⏳' : '📤'}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="nl-help-text">
        <p>
          💬 Try saying: "Fill in the grantor names" • "What's a grant deed?" • "Calculate transfer tax" • "Go to next step"
        </p>
      </div>
    </div>
  );
}

export default NaturalLanguageInterface;
