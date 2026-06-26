import React from 'react';
import { Send, Sparkles, MessageSquare, X, Trash2, User, ArrowRight } from 'lucide-react';
import { Button, IconButton } from '../Button';
import { Input } from '../Input';
import { AIChatSkeleton } from '../Skeleton';
import { useAIChat } from '@/hooks/useAIChat';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AIChatPanelProps {
  userId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatPanel({ userId, isOpen, onClose }: AIChatPanelProps) {
  const { messages, isLoading, send, isSending } = useAIChat(userId);
  const [input, setInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const currentInput = input;
    setInput('');
    try {
      await send({
        message: currentInput,
        history: messages,
      });
    } catch (err: any) {
      toast.error('Failed to send message.');
      setInput(currentInput);
    }
  };

  const handleClearHistory = async () => {
    if (!userId || !window.confirm('Are you sure you want to clear your AI chat history?')) return;
    
    try {
      const { error } = await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      toast.success('Chat history cleared!');
      // Reload history
      window.location.reload();
    } catch (err: any) {
      toast.error('Failed to clear chat history.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card/90 backdrop-blur-2xl border-l border-foreground/10 shadow-2xl z-50 flex flex-col transition-all duration-300">
      {/* Top Header bar */}
      <div className="p-4 border-b border-foreground/5 flex items-center justify-between bg-gradient-to-r from-primary-500/10 to-secondary-500/5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-500/15 text-primary-500 animate-pulse">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Financial Assistant</h3>
            <p className="text-[10px] font-semibold text-foreground/50">Powered by Gemini 2.5</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <IconButton 
              onClick={handleClearHistory}
              className="text-foreground/50 hover:text-red-500 hover:bg-red-500/5 p-2 rounded-xl transition-all"
              title="Clear History"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </IconButton>
          )}
          <IconButton onClick={onClose} className="text-foreground/50 hover:bg-foreground/5 p-2 rounded-xl">
            <X className="h-4.5 w-4.5" />
          </IconButton>
        </div>
      </div>

      {/* Messages Scroll Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <AIChatSkeleton />
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center shadow-lg border border-primary-500/20">
              <MessageSquare className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Ask me anything about your finances</h4>
              <p className="text-xs text-foreground/45 mt-2 leading-relaxed">
                I can help you review budgets, locate transactions, explain reports, or identify trends.
              </p>
            </div>
            <div className="w-full bg-foreground/[0.01] border border-foreground/5 rounded-2xl p-3 text-left space-y-2">
              <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest px-1">Try these queries:</p>
              <button 
                onClick={() => setInput("Show my food expenses from last month")}
                className="w-full text-xs font-medium text-foreground/70 hover:text-foreground text-left p-2 rounded-xl hover:bg-foreground/5 transition-all flex items-center justify-between"
              >
                <span>"Show my food expenses from last month"</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </button>
              <button 
                onClick={() => setInput("How much did I spend on card vs cash?")}
                className="w-full text-xs font-medium text-foreground/70 hover:text-foreground text-left p-2 rounded-xl hover:bg-foreground/5 transition-all flex items-center justify-between"
              >
                <span>"How much did I spend on card vs cash?"</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="h-8 w-8 rounded-lg bg-primary-500/10 text-primary-500 flex-shrink-0 flex items-center justify-center border border-primary-500/10">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                )}
                <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                  isUser 
                    ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-tr-none font-medium'
                    : 'bg-foreground/5 text-foreground rounded-tl-none border border-foreground/5'
                }`}>
                  {msg.message}
                </div>
                {isUser && (
                  <div className="h-8 w-8 rounded-lg bg-foreground/5 text-foreground/60 flex-shrink-0 flex items-center justify-center border border-foreground/5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        {isSending && (
          <div className="flex gap-2.5 justify-start">
            <div className="h-8 w-8 rounded-lg bg-primary-500/10 text-primary-500 flex-shrink-0 flex items-center justify-center border border-primary-500/10">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div className="p-3 rounded-2xl bg-foreground/5 border border-foreground/5 rounded-tl-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel bar */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-foreground/5 bg-background">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              className="bg-foreground/[0.02]"
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isSending}
            className="flex-shrink-0 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 border-none text-white p-2.5"
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
export default AIChatPanel;
