import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Bot, Send, Trash2 } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { sendMessage, addMessage, clearChat } from '../store/chatSlice';

interface RightAssistantProps {
  formValues?: any;
}

const RightAssistant = ({ formValues }: RightAssistantProps) => {
  const [input, setInput] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { id: routeHcpId } = useParams<{ id: string }>();

  const { messages, loading } = useSelector((state: RootState) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    dispatch(addMessage({ role: 'user', content: userText }));

    dispatch(sendMessage({
      message: userText,
      hcp_id: formValues?.hcp_id || routeHcpId || null,
      context_form_data: formValues || null
    }));
  };

  // Pre-compiled list of suggested prompts matching the assignment demo scenario
  const suggestedPrompts = [
    { label: "Log Visit (Dr Shah)", text: "Today I met Dr Shah. Discussed CardioCare. Doctor was interested. Shared brochure. Requested clinical trial paper. Follow up next Tuesday." },
    { label: "Suggest Follow-up", text: "Suggest follow-up for my last visit with Dr. Shah" },
    { label: "Meeting Prep (Dr Shah)", text: "Prepare meeting briefing before my next visit with Dr Shah" },
    { label: "Summarize History", text: "Summarize previous interactions with Dr Shah" },
    { label: "Edit: Change Sentiment", text: "Update database: Change sentiment to Positive for my last visit with Dr. Shah" }
  ];

  // Helper to parse and render JSON blocks beautifully
  const renderMessageContent = (content: string, toolTriggered?: string) => {
    const jsonMatch = content.match(/```json([\s\S]*?)```/);
    if (jsonMatch) {
      const cleanText = content.replace(/```json[\s\S]*?```/, '').trim();
      return (
        <div className="space-y-1.5">
          {toolTriggered && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/10 text-teal-650 dark:text-teal-400 font-extrabold text-[9px] uppercase tracking-wider mb-1 w-max border border-teal-500/25">
              ⚙️ Agent Tool Executed: {toolTriggered}
            </div>
          )}
          <p className="whitespace-pre-line leading-relaxed font-light">{cleanText || 'Operation completed successfully.'}</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-1.5">
        {toolTriggered && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 text-teal-650 dark:text-teal-400 font-extrabold text-[9px] uppercase tracking-wider mb-1 w-max border border-teal-500/25">
            ⚙️ Agent Tool Executed: {toolTriggered}
          </div>
        )}
        <p className="whitespace-pre-line leading-relaxed font-light">{content}</p>
      </div>
    );
  };

  return (
    <div className="glass-card h-full flex flex-col justify-between overflow-hidden relative">
      
      {/* 1. Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 text-healthcare-600 dark:text-healthcare-400">
          <Bot className="w-5 h-5" />
          <div>
            <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200">Aivoa Sidekick AI</h4>
            <span className="text-[9px] text-teal-500 font-bold block mt-0.5">Online detailing AI Agent</span>
          </div>
        </div>

        <button
          onClick={() => dispatch(clearChat())}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          title="Clear assistant chat logs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Chat history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-healthcare-600 text-white shadow shadow-healthcare-600/10 rounded-tr-none font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-850 dark:text-slate-300 border border-slate-200/20 dark:border-slate-800/40 rounded-tl-none font-light'
              }`}
            >
              {msg.role === 'user' ? msg.content : renderMessageContent(msg.content, msg.tool_triggered)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-healthcare-550 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-healthcare-550 animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-healthcare-550 animate-bounce delay-150"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Suggested prompt pills */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10">
        <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 w-full mb-1 flex items-center gap-1">💡 Suggested Demo Prompts:</div>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInput(p.text)}
            className="text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-healthcare-500 text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 4. Chat Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-800/40 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or click a suggested prompt..."
          disabled={loading}
          className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200 placeholder-slate-450"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-10 h-10 bg-healthcare-600 hover:bg-healthcare-700 disabled:bg-slate-200 dark:disabled:bg-slate-850 text-white disabled:text-slate-450 rounded-xl flex items-center justify-center transition-all shadow-md shadow-healthcare-600/10"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>

    </div>
  );
};

export default RightAssistant;
