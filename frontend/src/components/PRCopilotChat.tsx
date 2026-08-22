import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  Code2, 
  Check, 
  Loader2,
  Terminal
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
      const res = await authFetch('http://localhost:8000/api/copilot/refine', {
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
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#11141d] border-l border-[#232838] shadow-2xl flex flex-col animate-slide-in-right select-none">
      
      {/* Header */}
      <div className="p-4 bg-[#161a25] border-b border-[#232838] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7553f6]/20 border border-[#7553f6]/40 flex items-center justify-center text-[#7553f6]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-[#f1f1f4] block">
              Gemini PR Copilot
            </span>
            <span className="text-[10px] font-mono text-[#5ee78a] block">
              ● Active • Gemini 2.5 Flash
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-[#5f6580] hover:text-[#f1f1f4] hover:bg-[#1e2331]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs ${
                msg.sender === 'user'
                  ? 'bg-[#1e2331] text-[#9aa1b3]'
                  : 'bg-[#7553f6]/20 text-[#7553f6]'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div className="space-y-1.5 max-w-[82%]">
              <div
                className={`p-3 rounded-lg text-xs font-mono leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#7553f6] text-[#0b0d14] font-medium'
                    : 'bg-[#161a25] border border-[#232838] text-[#f1f1f4]'
                }`}
              >
                {msg.text}
              </div>

              {msg.codeSnippet && (
                <div className="p-2.5 rounded-lg bg-[#0b0d14] border border-[#232838] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#5f6580]">
                    <span>Refined Preview</span>
                    <span className="text-[#5ee78a] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Auto-Applied
                    </span>
                  </div>
                  <pre className="text-[10px] font-mono text-[#7553f6] max-h-36 overflow-y-auto">
                    {msg.codeSnippet}
                  </pre>
                </div>
              )}

              <span className="text-[9px] font-mono text-[#5f6580] block px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {refining && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#7553f6] p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Gemini is refining your patch...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#161a25] border-t border-[#232838] flex gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="e.g. Add typing hints or handle null..."
          className="flex-1 bg-[#0b0d14] border border-[#232838] focus:border-[#7553f6] rounded-lg px-3 py-2 text-xs font-mono text-[#f1f1f4] placeholder-[#5f6580] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || refining}
          className="btn-warp-primary px-3 py-2 text-xs"
        >
          <Send className="w-3.5 h-3.5 text-[#0b0d14]" />
        </button>
      </form>

    </div>
  );
};
