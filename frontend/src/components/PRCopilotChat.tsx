import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  Check, 
  Loader2
} from 'lucide-react';

interface PRCopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  onApplyRefinedCode: (refinedCode: string) => void;
  targetFile?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  codeSnippet?: string;
  timestamp: string;
}

export const PRCopilotChat: React.FC<PRCopilotChatProps> = ({
  isOpen,
  onClose,
  currentCode,
  onApplyRefinedCode,
  targetFile = 'backend/src/autopatch/main.py',
}) => {
  const { authFetch } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'gemini',
      text: `Hello! I'm your Gemini PR Copilot. How would you like to refine the fix for \`${targetFile}\`? You can ask me to add type hints, docstrings, handle edge cases, or adjust logic.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [refining, setRefining] = useState(false);

  if (!isOpen) return null;

  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env &&
      (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
    'http://localhost:8000';

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || refining) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setRefining(true);

    try {
      const res = await authFetch(`${API_BASE}/api/copilot/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_code: currentCode,
          instruction: userText,
          file_path: targetFile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const refined = data.refined_code;
        const geminiMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'gemini',
          text: `I've updated the patch according to your instructions: "${userText}"`,
          codeSnippet: refined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, geminiMsg]);
        onApplyRefinedCode(refined);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'gemini',
          text: 'Sorry, I encountered an issue refining the code.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-modal flex flex-col animate-slide-in-right select-none">
      
      {/* Header */}
      <div className="p-4 bg-surface-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-bg-alt border border-border flex items-center justify-center text-accent">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-[13px] font-bold text-text block">
              Gemini PR Copilot
            </span>
            <span className="text-[10px] font-mono text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Active • Gemini 2.0 Flash
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-[6px] text-text-dim hover:text-text hover:bg-surface transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3.5 overflow-y-auto bg-bg">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 text-[11px] ${
                msg.sender === 'user'
                  ? 'bg-accent text-bg font-bold'
                  : 'bg-surface-2 text-accent border border-border'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div className="space-y-1 max-w-[82%]">
              <div
                className={`p-3 rounded-[8px] text-[12px] font-mono leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-accent text-bg font-medium'
                    : 'bg-surface border border-border text-text'
                }`}
              >
                {msg.text}
              </div>

              {msg.codeSnippet && (
                <div className="p-2.5 rounded-[8px] bg-bg-alt border border-border space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-dim">
                    <span>Refined Preview</span>
                    <span className="text-success flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" /> Auto-Applied
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-accent max-h-36 overflow-y-auto">
                    {msg.codeSnippet}
                  </pre>
                </div>
              )}

              <span className="text-[10px] font-mono text-text-dim block px-1 tabular-nums">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {refining && (
          <div className="flex items-center gap-2 text-[12px] font-mono text-accent p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Gemini is refining your patch...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-surface-2 border-t border-border flex gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="e.g. Add typing hints or handle null..."
          className="input-warp flex-1 py-1.5 px-3 text-[12px] placeholder:text-text-dim"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || refining}
          className="btn-primary py-1.5 px-3 text-[12px]"
        >
          <Send className="w-3.5 h-3.5 text-bg" />
        </button>
      </form>

    </div>
  );
};
