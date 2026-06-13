import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ShieldCheck, CornerDownLeft, Circle } from 'lucide-react';
import { dbService } from '../services/dbService';
import { ChatMessage } from '../types';

interface LiveSupportWidgetProps {
  userId: string;
  userName: string;
}

export default function LiveSupportWidget({ userId, userName }: LiveSupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync messages
  const fetchMessages = () => {
    const msgs = dbService.getUserMessages(userId);
    setMessages(msgs);

    // Calculate unread from system/admin
    if (!isOpen) {
      const unread = msgs.filter(m => m.senderId !== userId && !m.isReadByUser).length;
      setUnreadCount(unread);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Listen to real-time sync custom event
    const handleUpdate = () => {
      fetchMessages();
    };

    window.addEventListener('swiftbank_update_messages', handleUpdate);
    return () => {
      window.removeEventListener('swiftbank_update_messages', handleUpdate);
    };
  }, [userId, isOpen]);

  // Scroll to bottom on open or new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (isOpen) {
      // Mark all user messages as read when they open the pane
      const allMsgs = dbService.getMessages();
      let changed = false;
      allMsgs.forEach(m => {
        if (m.senderId === 'admin' && !m.isReadByUser) {
          m.isReadByUser = true;
          changed = true;
        }
      });
      if (changed) {
        dbService.saveMessages(allMsgs);
        setUnreadCount(0);
      }
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    dbService.sendMessage(userId, userName, inputText.trim());
    setInputText("");
    fetchMessages();
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 font-sans">
      {/* Closed Button Widget */}
      {!isOpen && (
        <button
          id="toggle-chat-btn"
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_12px_24px_rgba(0,87,255,0.35)] transition-all duration-300 hover:scale-105 active:scale-95 group"
        >
          <MessageSquare className="w-6 h-6 group-hover:rotate-6 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
              {unreadCount}
            </span>
          )}
          {/* Green Status indicator */}
          <span className="absolute bottom-0 right-1 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-slate-900"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[360px] h-[380px] sm:h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  SB
                </div>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-slate-950"></div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-display">Swift Support</h4>
                <div className="flex items-center text-[10px] text-slate-400 space-x-1">
                  <span className="text-green-400">●</span> 
                  <span>Expert Desk Available 24/7</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Secure Note */}
          <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-900/30 flex items-center space-x-1.5 text-[10px] text-blue-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted with bank-grade security protocols.</span>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/70 scrollbar-thin">
            {messages.map((msg) => {
              const isAdminMsg = msg.senderId === 'admin' || msg.senderId === 'system';
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isAdminMsg ? 'items-start' : 'items-end'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                    {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div 
                    className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                      isAdminMsg 
                        ? 'bg-slate-800 text-slate-100 rounded-tl-none' 
                        : 'bg-blue-600 text-white rounded-tr-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Area */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="How can we assist you today?"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
