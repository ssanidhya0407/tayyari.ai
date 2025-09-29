'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  Bot,
  Send,
  User as UserIcon,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Plus,
  Trophy,
  Trash2,
  GitBranch,
  Code,
  PenLine,
  Brain,
  Settings,
  Menu,
  X,
  PlusCircle,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import type mermaidType from 'mermaid';
import Quiz from '../../components/Quiz';
import EnhancedQuiz from '../../components/EnhancedQuiz';
import { Message as ChatMessageType } from '../../components/types';

import {
  ChatSession,
  loadChats,
  saveChats,
  newChatSession,
  deriveTitleFromMessage,
  getActiveChatId,
  setActiveChatId as persistActiveChatId,
  upsertChat,
  deleteChat as removeChat,
} from './chatStore';

// ----------------------
// Utils
// ----------------------
const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:5000';

// ----------------------
// UI Notification System
// ----------------------
const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: 'success' | 'error' | 'achievement' }>
  >([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'achievement' = 'success') => {
    const id = uuid();
    setToasts(prev => [...prev, { id, message, type }]);
    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    (window as any).notify = addToast;
    return () => {
      (window as any).notify = undefined;
    };
  }, [addToast]);

  return (
    <>
      {children}
      <div className="fixed top-6 right-6 z-[100] space-y-3">
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              role="status"
              aria-live="polite"
              className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-base font-medium border ${
                toast.type === 'success' 
                  ? 'bg-white border-slate-200 text-slate-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {toast.type === 'achievement' && <Trophy size={18} className="text-amber-500" />}
              {toast.type === 'success' && <Check size={18} className="text-emerald-500" />}
              {toast.type === 'error' && <span className="text-red-500 font-bold" aria-hidden>!</span>}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

const notify = (message: string, type: 'success' | 'error' | 'achievement' = 'success') => {
  if (typeof window !== 'undefined' && (window as any).notify) {
    (window as any).notify(message, type);
  }
};

// ----------------------
// Mermaid Diagram Component (lazy-loaded)
// ----------------------
const MermaidDiagram = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let mermaid: typeof mermaidType | null = null;
    const currentRef = ref.current;

    (async () => {
      try {
        const m = (await import('mermaid')).default;
        if (!isMounted) return;

        mermaid = m;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#f8fafc',
            primaryTextColor: '#0f172a',
            primaryBorderColor: '#e2e8f0',
            lineColor: '#94a3b8',
            background: '#ffffff',
            mainBkg: '#ffffff',
          },
        });

        if (!ref.current || !chart) return;

        const id = `mermaid-${uuid()}`;
        mermaid
          .render(id, chart)
          .then(({ svg }) => {
            if (ref.current) ref.current.innerHTML = svg;
          })
          .catch(() => {
            if (ref.current) {
              ref.current.innerHTML =
                '<p class="text-slate-400 text-sm p-4">Could not render diagram.</p>';
            }
          });
      } catch {
        if (ref.current) {
          ref.current.innerHTML =
            '<p class="text-slate-400 text-sm p-4">Could not render diagram.</p>';
        }
      }
    })();

    return () => {
      isMounted = false;
      if (currentRef) currentRef.innerHTML = '';
    };
  }, [chart]);

  return <div ref={ref} className="[&>svg]:w-full [&>svg]:h-auto text-slate-800" />;
};

// ----------------------
// Code Block Component
// ----------------------
const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const codeText = useMemo(
    () => (Array.isArray(children) ? children.join('') : String(children || '')),
    [children]
  );

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[0.94em] font-mono">
        {children}
      </code>
    );
  }

  const language = (className || '').replace('language-', '') || 'text';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      notify('Copied to clipboard');
      setTimeout(() => setIsCopied(false), 1600);
    } catch {
      notify('Failed to copy', 'error');
    }
  };

  return (
    <div className="group relative my-5 rounded-xl border border-slate-200 bg-slate-50/60">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          aria-label={isCopied ? 'Code copied' : 'Copy code to clipboard'}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-[0.95rem] overflow-x-auto font-mono leading-relaxed" {...props}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
});
CodeBlock.displayName = 'CodeBlock';

// ----------------------
// Markdown Rendering Components
// ----------------------
const markdownComponents = {
  h1: (props: any) => <h1 {...props} className="text-4xl font-bold text-slate-900 mt-8 mb-5" />,
  h2: (props: any) => <h2 {...props} className="text-3xl font-semibold text-slate-900 mt-7 mb-4 border-b border-slate-200 pb-3" />,
  h3: (props: any) => <h3 {...props} className="text-2xl font-semibold text-slate-900 mt-6 mb-3" />,
  p: (props: any) => <p {...props} className="text-slate-700 leading-relaxed my-4 text-[1.01rem]" />,
  ul: (props: any) => <ul {...props} className="list-disc list-outside space-y-2.5 text-slate-700 my-4 ml-6" />,
  ol: (props: any) => <ol {...props} className="list-decimal list-outside space-y-2.5 text-slate-700 my-4 ml-6" />,
  li: (props: any) => <li {...props} className="pl-2 text-[1.01rem]" />,
  a: (props: any) => (
    <a
      {...props}
      className="text-blue-600 hover:underline underline-offset-2 decoration-blue-400"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-slate-300 pl-5 my-5 text-slate-600 italic text-base">
      {props.children}
    </blockquote>
  ),
  code: CodeBlock as any,
};

// ----------------------
// Sidebar Components
// ----------------------
const SidebarButton = ({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'link';
}) => {
  const base = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium transform hover:scale-105 hover:shadow-md';
  const styles =
    variant === 'danger'
      ? 'text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 hover:shadow-red-100'
      : variant === 'link'
      ? 'text-violet-700 hover:bg-violet-50 border border-violet-200 hover:border-violet-300 hover:shadow-violet-100'
      : 'text-violet-800 bg-white/90 backdrop-blur-sm border border-violet-200 hover:border-violet-300 hover:bg-violet-50/80 hover:shadow-violet-100';
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
};

function formatRelTime(ts: number) {
  const d = Date.now() - ts;
  const mins = Math.floor(d / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ----------------------
// Main Chat Interface
// ----------------------
export default function ElegantChat() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const searchParams = useSearchParams();

  // Mode: Learn | Quiz
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');

  // Session-level state
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveId] = useState<string | null>(null);

  // Message list for the active session (FULL transcript across modes)
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Persist and load mode preference
  useEffect(() => {
    try {
      const m = localStorage.getItem('tayyari.mode') as 'learn' | 'quiz' | null;
      if (m === 'learn' || m === 'quiz') setMode(m);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('tayyari.mode', mode);
    } catch {}
  }, [mode]);

  // Persisted chats init
  useEffect(() => {
    const stored = loadChats();
    if (stored.length === 0) {
      const fresh = newChatSession();
      saveChats([fresh]);
      setChats([fresh]);
      setActiveId(fresh.id);
      persistActiveChatId(fresh.id);
      setMessages([]);
      return;
    }
    const sorted = [...stored].sort((a, b) => b.updatedAt - a.updatedAt);
    setChats(sorted);
    const savedActive = getActiveChatId();
    const pick = savedActive && sorted.find(c => c.id === savedActive) ? savedActive : sorted[0].id;
    setActiveId(pick);
    persistActiveChatId(pick);
    setMessages(sorted.find(c => c.id === pick)?.messages as ChatMessageType[] || []);
  }, []);

  // Save when messages change
  useEffect(() => {
    if (!activeChatId) return;
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === activeChatId);
      if (idx === -1) return prev;
      const current = prev[idx];
      let title = current.title;
      if (!title || title === 'New chat') {
        const firstUser = (messages || []).find(m => m.sender === 'user');
        if (firstUser?.content) title = deriveTitleFromMessage(firstUser.content);
      }
      const updated: ChatSession = {
        ...current,
        title: title || current.title,
        messages: messages.map(m => ({
          ...m,
          timestamp: m.timestamp ?? new Date(),
        })),
        updatedAt: Date.now(),
      };
      const next = upsertChat(prev.filter(c => c.id !== activeChatId), updated);
      saveChats(next);
      return next;
    });
  }, [messages, activeChatId]);

  // Filter messages by current mode (default old messages without mode => learn)
  const visibleMessages = useMemo(() => {
    return (messages || []).filter(m => (((m as any).mode ?? 'learn') === mode));
  }, [messages, mode]);

  // Autoscroll (also on mode switch)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, mode]);

  // Inject prompt on first load of a fresh session
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && messages.length === 0) {
      setInputValue(prompt);
      const t = setTimeout(() => handleSubmit(prompt), 400);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize input
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [inputValue, isSending]);

  const handleSubmit = useCallback(async (customInput?: string) => {
    const input = (customInput ?? inputValue).trim();
    if (!input || isSending || !activeChatId) return;

    setIsSending(true);
    setShowQuickActions(false);

    // Tag user message with mode
    const userMessage: ChatMessageType = {
      id: Date.now(),
      sender: 'user',
      content: input,
      timestamp: new Date(),
    } as any;
    (userMessage as any).mode = mode;

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Abort any in-flight request
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/process-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: input, files: [], mode: mode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();

      if (data?.status === 'success') {
        if (mode === 'quiz') {
          const quizMsg: ChatMessageType = {
            id: Date.now() + 1,
            sender: 'ai',
            content: data.response, // quiz content based on API answer
            timestamp: new Date(),
          } as any;
          (quizMsg as any).mode = 'quiz';
          (quizMsg as any).forceQuiz = true; // render as quiz-only
          (quizMsg as any).originalPrompt = input; // Store original prompt for regeneration
          setMessages(prev => [...prev, quizMsg]);
        } else {
          const aiMessage: ChatMessageType = {
            id: Date.now() + 1,
            sender: 'ai',
            content: data.response,
            mermaidChart: data.mermaidChart,
            timestamp: new Date(),
          } as any;
          (aiMessage as any).mode = 'learn';
          setMessages(prev => [...prev, aiMessage]);
        }
      } else {
        // Fallbacks
        if (mode === 'quiz') {
          const quizMsg: ChatMessageType = {
            id: Date.now() + 1,
            sender: 'ai',
            content: input,
            timestamp: new Date(),
          } as any;
          (quizMsg as any).mode = 'quiz';
          (quizMsg as any).forceQuiz = true;
          (quizMsg as any).originalPrompt = input; // Store original prompt for regeneration
          setMessages(prev => [...prev, quizMsg]);
        } else {
          notify('Sorry, an error occurred. Please try again.', 'error');
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        if (mode === 'quiz') {
          const quizMsg: ChatMessageType = {
            id: Date.now() + 1,
            sender: 'ai',
            content: input,
            timestamp: new Date(),
          } as any;
          (quizMsg as any).mode = 'quiz';
          (quizMsg as any).forceQuiz = true;
          (quizMsg as any).originalPrompt = input; // Store original prompt for regeneration
          setMessages(prev => [...prev, quizMsg]);
          notify('Network issue; generated quiz from your prompt text.', 'error');
        } else {
          notify('Connection failed. Please check your network.', 'error');
        }
      }
    } finally {
      setIsLoading(false);
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isSending, activeChatId, mode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowQuickActions(prev => !prev);
      }
    },
    [handleSubmit]
  );

  // Chat session actions
  const createNewChat = () => {
    const fresh = newChatSession();
    const nextList = upsertChat(chats, fresh);
    saveChats(nextList);
    setChats(nextList);
    setActiveId(fresh.id);
    persistActiveChatId(fresh.id);
    setMessages([]);
  };

  const openChat = (id: string) => {
    if (id === activeChatId) return;
    const target = chats.find(c => c.id === id);
    if (!target) return;
    setActiveId(id);
    persistActiveChatId(id);
    setMessages((target.messages || []) as ChatMessageType[]);
  };

  const clearActiveChat = () => {
    if (!activeChatId) return;
    setMessages([]);
    notify('Chat cleared');
  };

  const deleteChat = (id: string) => {
    const next = removeChat(chats, id);
    saveChats(next);
    setChats(next);
    if (activeChatId === id) {
      const fallback = next[0] || newChatSession();
      if (!next.length) {
        const arr = [fallback];
        saveChats(arr);
        setChats(arr);
      }
      setActiveId(fallback.id);
      persistActiveChatId(fallback.id);
      setMessages(next[0]?.messages as ChatMessageType[] || []);
    }
    notify('Chat deleted');
  };

  // ----------------------
  // Chat Message Component
  // ----------------------
  const ChatMessage = memo(({ message }: { message: ChatMessageType }) => {
    const isUser = message.sender === 'user';
    const [showVisuals, setShowVisuals] = useState(!!(message as any).mermaidChart);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizContent, setQuizContent] = useState<string>('');
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [originalPrompt, setOriginalPrompt] = useState<string>('');

    const forceQuiz = !!(message as any).forceQuiz;
    const hasAIQuiz = !isUser && message.content && message.content.trim().length > 0;

    const generateQuizFromContent = async () => {
      if (isGeneratingQuiz) return;
      
      setIsGeneratingQuiz(true);
      try {
        const response = await fetch(`${API_URL}/process-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: message.content, 
            files: [], 
            mode: 'quiz' 
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const data = await response.json();
        if (data?.status === 'success') {
          setQuizContent(data.response);
          setOriginalPrompt(message.content); // Store the original content for regeneration
          setShowQuiz(true);
        } else {
          notify('Failed to generate quiz. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Quiz generation error:', error);
        notify('Failed to generate quiz. Please try again.', 'error');
      } finally {
        setIsGeneratingQuiz(false);
      }
    };

    const handleQuizButtonClick = () => {
      if (showQuiz) {
        setShowQuiz(false);
      } else if (quizContent) {
        setShowQuiz(true);
      } else {
        generateQuizFromContent();
      }
    };

    const handleRegenerateQuiz = async () => {
      // For "quiz me" regeneration
      if (!originalPrompt) {
        await generateQuizFromContent();
        return;
      }
      
      setIsGeneratingQuiz(true);
      try {
        const response = await fetch(`${API_URL}/process-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: originalPrompt, 
            files: [], 
            mode: 'quiz' 
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const data = await response.json();
        if (data?.status === 'success') {
          setQuizContent(data.response);
          setShowQuiz(true);
        } else {
          notify('Failed to regenerate quiz. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Quiz regeneration error:', error);
        notify('Failed to regenerate quiz. Please try again.', 'error');
      } finally {
        setIsGeneratingQuiz(false);
      }
    };

    const handleRegenerateQuizMode = async () => {
      // For quiz mode message regeneration
      const storedOriginalPrompt = (message as any).originalPrompt;
      
      if (!storedOriginalPrompt) {
        console.error('No original prompt found for regeneration');
        notify('Cannot regenerate quiz - original prompt not found', 'error');
        return;
      }
      
      setIsGeneratingQuiz(true);
      try {
        const response = await fetch(`${API_URL}/process-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: storedOriginalPrompt, 
            files: [], 
            mode: 'quiz' 
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const data = await response.json();
        if (data?.status === 'success') {
          // Update the current message with new quiz content
          setMessages(prev => prev.map(m => 
            m.id === message.id 
              ? { ...m, content: data.response }
              : m
          ));
        } else {
          notify('Failed to regenerate quiz. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Quiz regeneration error:', error);
        notify('Failed to regenerate quiz. Please try again.', 'error');
      } finally {
        setIsGeneratingQuiz(false);
      }
    };

    if (!isUser && forceQuiz) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="group max-w-4xl mx-auto flex items-start gap-4 md:gap-5 my-6 md:my-8 px-2 sm:px-0"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg bg-gradient-to-br from-violet-600 to-purple-700 hover:shadow-xl transition-all duration-300 hover:scale-110" aria-hidden>
            <Bot size={20} className="text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '0px' }}
              className="bg-white/90 backdrop-blur-sm border border-violet-200/60 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              {message.content.includes('**QUIZ START**') ? (
                <EnhancedQuiz 
                  text={message.content} 
                  onRegenerate={handleRegenerateQuizMode}
                />
              ) : (
                <Quiz text={message.content} />
              )}
            </motion.div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="group max-w-4xl mx-auto flex items-start gap-4 md:gap-5 my-6 md:my-8 px-2 sm:px-0"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-600 to-violet-700' 
              : 'bg-gradient-to-br from-violet-600 to-purple-700'
          }`}
          aria-hidden
        >
          {isUser ? <UserIcon size={20} className="text-white" /> : <Bot size={20} className="text-white animate-pulse" />}
        </div>

        <div className="flex-1">
          {!isUser && (
            <div className="prose max-w-none text-slate-800">
              <ReactMarkdown components={markdownComponents as any}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {isUser && (
            <div className="text-slate-700 whitespace-pre-wrap">{message.content}</div>
          )}

          {!isUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="mt-4 flex items-center gap-4"
            >
              {(message as any).mermaidChart && (
                <button
                  type="button"
                  onClick={() => setShowVisuals(v => !v)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  <GitBranch size={16} />
                  <span>{showVisuals ? 'Hide' : 'Show'} Flowchart</span>
                </button>
              )}

              {hasAIQuiz && (
                <button
                  type="button"
                  onClick={handleQuizButtonClick}
                  disabled={isGeneratingQuiz}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium disabled:opacity-50"
                >
                  <Brain size={16} />
                  <span>
                    {isGeneratingQuiz 
                      ? 'Generating Quiz...' 
                      : showQuiz 
                        ? 'Hide Quiz' 
                        : 'Quiz me'}
                  </span>
                </button>
              )}
            </motion.div>
          )}

          {showVisuals && !isUser && (message as any).mermaidChart && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '16px' }}
              className="bg-white border border-solid border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="p-5">
                <MermaidDiagram chart={(message as any).mermaidChart as string} />
              </div>
            </motion.div>
          )}

          {showQuiz && !isUser && hasAIQuiz && quizContent && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '16px' }}
              className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
            >
              {quizContent.includes('**QUIZ START**') ? (
                <EnhancedQuiz 
                  text={quizContent} 
                  onRegenerate={handleRegenerateQuiz}
                />
              ) : (
                <Quiz text={quizContent} />
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  });
  ChatMessage.displayName = 'ChatMessage';

  // ----------------------
  // Empty State
  // ----------------------
  const EmptyState = () => (
    <div className="text-center py-20 md:py-24 px-4 relative">
      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-2 h-2 bg-violet-400 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-80" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse opacity-70" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-violet-500 rounded-full animate-pulse opacity-60" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/4 right-1/2 w-2 h-2 bg-purple-300 rounded-full animate-pulse opacity-50" style={{animationDelay: '2s'}}></div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="max-w-2xl mx-auto relative z-10"
      >
        <motion.div 
          className="w-24 h-24 bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
          whileHover={{ rotate: [0, -10, 10, -5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles size={48} className="text-white animate-pulse" />
        </motion.div>

        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 bg-clip-text text-transparent mb-4 tracking-tight">
          {mode === 'quiz' ? '🧠 Quiz Mode' : '✨ Learning Starts Here'}
        </h1>
        <p className="text-lg text-violet-700/80 mb-10">
          {mode === 'quiz'
            ? 'Type a topic or paste content. I will generate a focused quiz from it. 🎯'
            : 'Ask me anything. I can help you understand complex topics, visualize data, and more. 🚀'}
        </p>

        {mode === 'learn' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {[
              { title: '🔬 Explain a Concept', prompt: "Explain quantum computing to me like I'm five.", gradient: 'from-violet-500 to-purple-600' },
              { title: '📊 Visualize a Process', prompt: 'Visualize the process of photosynthesis for me.', gradient: 'from-purple-500 to-indigo-600' },
              { title: '💻 Write Code', prompt: 'Show me a Python code example for a simple web scraper.', gradient: 'from-indigo-500 to-violet-600' },
              { title: '✍️ Draft Content', prompt: 'Draft an email to my team about the new project timeline.', gradient: 'from-violet-600 to-purple-500' },
            ].map((item, index) => (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.06 }}
                onClick={() => handleSubmit(item.prompt)}
                className="group p-4 bg-white/90 backdrop-blur-sm border-2 border-violet-200/60 rounded-xl hover:border-violet-300 hover:bg-white active:scale-[0.99] transition-all duration-300 text-left hover:shadow-lg hover:shadow-violet-200/50 hover:-translate-y-1 relative overflow-hidden"
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{background: `linear-gradient(135deg, var(--tw-gradient-stops))`}} />
                <div className="font-semibold text-violet-800 relative z-10">{item.title}</div>
                <div className="text-sm text-violet-600/80 mt-1 relative z-10">{item.prompt}</div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );

  // Sidebar chat list item
  const ChatListItem = ({
    chat,
    active,
    onOpen,
    onDelete,
  }: {
    chat: ChatSession;
    active: boolean;
    onOpen: () => void;
    onDelete: () => void;
  }) => {
    return (
      <div
        className={`group flex items-center gap-2 p-2 rounded-lg border transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-md ${
          active
            ? 'bg-violet-50 border-violet-300 shadow-violet-100'
            : 'bg-white/90 backdrop-blur-sm border-violet-200 hover:bg-violet-50/80 hover:border-violet-300'
        }`}
        onClick={onOpen}
        title={chat.title}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-violet-800 truncate">{chat.title || 'New chat'}</div>
          <div className="text-[11px] text-violet-500/80">{formatRelTime(chat.updatedAt)}</div>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 rounded hover:bg-red-50 hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete chat"
          title="Delete chat"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>
    );
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 font-sans relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-xl border-b border-violet-200/40 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 relative">
            {/* Centered segmented control (Learn | Quiz) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="pointer-events-auto inline-flex items-center gap-1 bg-white/90 backdrop-blur-md border border-violet-200/60 rounded-full p-1 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                role="tablist"
                aria-label="Mode switcher"
              >
                <button
                  type="button"
                  onClick={() => setMode('learn')}
                  role="tab"
                  aria-selected={mode === 'learn'}
                  className={`group relative overflow-hidden px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm md:text-base font-semibold transition-all flex items-center gap-2 min-w-[96px] justify-center ${
                    mode === 'learn'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'text-violet-700 hover:text-violet-900 hover:bg-violet-50/80'
                  }`}
                >
                  {mode === 'learn' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
                  )}
                  <span aria-hidden className="relative z-10 animate-bounce">📚</span>
                  <span className="relative z-10">Learn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('quiz')}
                  role="tab"
                  aria-selected={mode === 'quiz'}
                  className={`group relative overflow-hidden px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm md:text-base font-semibold transition-all flex items-center gap-2 min-w-[96px] justify-center ${
                    mode === 'quiz'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'text-violet-700 hover:text-violet-900 hover:bg-violet-50/80'
                  }`}
                >
                  {mode === 'quiz' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-violet-400/20 rounded-full animate-pulse"></div>
                  )}
                  <span aria-hidden className="relative z-10 animate-bounce">🧠</span>
                  <span className="relative z-10">Quiz</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between h-16 md:h-20">
              {/* Left cluster */}
              <div className="flex items-center gap-3">
                {/* Mobile sidebar toggle */}
                <button
                  type="button"
                  aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                  onClick={() => setSidebarOpen(v => !v)}
                  className="lg:hidden mr-1 rounded-lg p-2 hover:bg-slate-100 text-slate-700"
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <Bot size={24} className="text-slate-800" />
                <span className="font-bold text-xl text-slate-900">Tayyari</span>
              </div>

              {/* Right cluster */}
              {user && (
                <div className="flex items-center gap-4">
                  <div
                    className="hidden sm:flex items-center gap-2 text-base text-slate-600 px-3.5 py-2 bg-white border border-slate-200/80 rounded-lg"
                    title={`Welcome, ${user.firstName ?? ''}`}
                  >
                    <UserIcon size={16} className="text-slate-500" />
                    <span className="font-medium text-slate-800">{user.firstName}</span>
                  </div>
                  <button className="text-slate-500 hover:text-slate-800 transition-colors" aria-label="Open settings">
                    <Settings size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Fixed slim sidebar near the left edge (desktop only), vertically centered */}
        <aside
          className="hidden lg:block fixed left-3 top-[64px] md:top-[80px] w-64 z-30"
          aria-label="Sidebar"
        >
          <div className="h-[calc(100vh-64px-12px)] md:h-[calc(100vh-80px-12px)] overflow-y-auto pr-2">
            <div className="min-h-full flex flex-col justify-center gap-4 py-6">
              {/* Chats list card */}
              <div className="rounded-2xl border border-violet-200/60 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="p-4 border-b border-violet-200/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-violet-900 font-semibold">
                      <Sparkles size={16} className="text-violet-600 animate-pulse" />
                      <span>Chats</span>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 text-sm text-violet-700 hover:text-violet-900 hover:bg-violet-50 px-2 py-1 rounded-lg transition-all duration-200"
                      onClick={createNewChat}
                      title="Start a new chat"
                    >
                      <PlusCircle size={16} className="animate-bounce" />
                      New
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {chats.map(c => (
                    <ChatListItem
                      key={c.id}
                      chat={c}
                      active={c.id === activeChatId}
                      onOpen={() => openChat(c.id)}
                      onDelete={() => deleteChat(c.id)}
                    />
                  ))}
                  {chats.length === 0 && (
                    <div className="text-xs text-slate-500 px-2 py-1.5">No chats yet.</div>
                  )}
                </div>
              </div>

              {/* Actions card */}
              <div className="rounded-2xl border border-violet-200/60 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="p-4 border-b border-violet-200/60">
                  <div className="flex items-center gap-2 text-violet-900 font-semibold">
                    <Sparkles size={16} className="text-violet-600 animate-pulse" />
                    <span>Actions</span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <SidebarButton
                    icon={<ExternalLink size={18} className="text-violet-700" />}
                    label="Leaderboard"
                    onClick={() => window.open('/leaderboard', '_blank', 'noopener,noreferrer')}
                  />
                  <SidebarButton
                    icon={<Trash2 size={18} className="text-red-600" />}
                    label="Clear current chat"
                    variant="danger"
                    onClick={clearActiveChat}
                  />
                </div>
                <div className="px-4 pb-4 pt-2 border-t border-violet-200/60">
                  <SidebarButton
                    icon={<LogOut size={18} className="text-violet-700" />}
                    label="Logout"
                    variant="link"
                    onClick={async () => {
                      try {
                        await signOut();
                      } catch {
                        notify('Logout failed', 'error');
                      }
                    }}
                  />
                </div>
              </div>

              {/* Helpful tips */}
              <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white/90 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="text-sm text-violet-800 font-semibold mb-2 flex items-center gap-2">
                  <span className="animate-pulse">💡</span>
                  Shortcuts
                </div>
                <ul className="text-sm text-violet-700 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></span>
                    Enter to send
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                    Shift+Enter for newline
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                    Cmd/Ctrl+K quick actions
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer (centered content) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="drawer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="lg:hidden fixed inset-0 z-40"
              aria-label="Mobile sidebar"
            >
              <div className="absolute inset-0 bg-violet-900/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <div className="absolute left-0 top-[64px] md:top-[80px] bottom-0 w-[18rem] bg-white/95 backdrop-blur-md border-r border-violet-200 shadow-2xl overflow-y-auto">
                <div className="min-h-full flex flex-col justify-center gap-4 p-4">
                  {/* Actions */}
                  <div className="rounded-2xl border border-violet-200/60 bg-white/90 backdrop-blur-sm shadow-lg">
                    <div className="p-4 border-b border-violet-200/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-violet-900">
                          <Sparkles size={16} className="text-violet-600 animate-pulse" />
                          <span>Actions</span>
                        </div>
                        <button
                          className="rounded-lg p-1.5 hover:bg-violet-100 text-violet-700 hover:text-violet-900 transition-all duration-300 hover:scale-110"
                          onClick={() => setSidebarOpen(false)}
                          aria-label="Close sidebar"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <SidebarButton
                        icon={<ExternalLink size={18} className="text-slate-700" />}
                        label="Leaderboard"
                        onClick={() => window.open('/leaderboard', '_blank', 'noopener,noreferrer')}
                      />
                      <SidebarButton
                        icon={<Trash2 size={18} className="text-red-600" />}
                        label="Clear current chat"
                        variant="danger"
                        onClick={() => {
                          clearActiveChat();
                          setSidebarOpen(false);
                        }}
                      />
                      <SidebarButton
                        icon={<LogOut size={18} className="text-slate-700" />}
                        label="Logout"
                        variant="link"
                        onClick={async () => {
                          try { await signOut(); } catch { notify('Logout failed', 'error'); }
                        }}
                      />
                    </div>
                  </div>

                  {/* Chats list (mobile) */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <Sparkles size={16} className="text-violet-600" />
                        <span>Chats</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {chats.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                          <button
                            className={`flex-1 text-left text-sm px-2 py-1.5 rounded ${
                              c.id === activeChatId ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
                            }`}
                            onClick={() => {
                              openChat(c.id);
                              setSidebarOpen(false);
                            }}
                          >
                            <div className="truncate">{c.title || 'New chat'}</div>
                            <div className="text-[11px] text-slate-500">{formatRelTime(c.updatedAt)}</div>
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-50"
                            onClick={() => deleteChat(c.id)}
                            aria-label="Delete chat"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                      {chats.length === 0 && (
                        <div className="text-xs text-slate-500 px-2 py-1.5">No chats yet.</div>
                      )}
                    </div>

                    <div className="p-3 border-t border-slate-200">
                      <button
                        onClick={() => {
                          createNewChat();
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                      >
                        <PlusCircle size={16} />
                        New chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area (centered container) */}
        <main>
          <div className="px-6 pt-8 pb-44 md:pb-48 min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)]">
            {visibleMessages.length === 0 ? (
              <EmptyState />
            ) : (
              <div role="log" aria-live="polite" aria-relevant="additions" className="max-w-4xl mx-auto">
                {visibleMessages.map(message => (
                  <ChatMessage key={String(message.id)} message={message} />
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 md:gap-5 my-6 md:my-8"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg animate-pulse">
                      <Bot size={20} className="text-white" />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-violet-600">
                      <Loader2 size={20} className="animate-spin text-violet-500" aria-hidden />
                      <span className="text-base">Generating response...</span>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Composer bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-violet-50/90 via-violet-50/95 to-violet-50/0 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto px-6 pb-6 pt-8">
              <div className="relative">
                <AnimatePresence initial={false}>
                  {showQuickActions && mode === 'learn' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 w-full grid grid-cols-2 md:grid-cols-4 gap-3 mb-3"
                    >
                      <button
                        type="button"
                        onClick={() => setInputValue('Explain... ')}
                        className="quick-action-btn"
                      >
                        <Brain size={16} />
                        Explain
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputValue('Write code for... ')}
                        className="quick-action-btn"
                      >
                        <Code size={16} />
                        Write Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputValue('Draft a... ')}
                        className="quick-action-btn"
                      >
                        <PenLine size={16} />
                        Draft Content
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearActiveChat();
                        }}
                        className="quick-action-btn !text-red-500 hover:!bg-red-50 hover:!border-red-200"
                      >
                        <Trash2 size={16} />
                        Clear Chat
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowQuickActions(v => !v)}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 ${mode === 'learn' ? 'bg-violet-100 hover:bg-violet-200 shadow-md' : 'bg-violet-100 hover:bg-violet-200 shadow-md'}`}
                    aria-label={showQuickActions ? 'Close quick actions' : 'Open quick actions'}
                  >
                    <Plus
                      size={18}
                      className={`transition-transform duration-300 ${showQuickActions ? 'rotate-45' : ''} text-violet-700`}
                    />
                  </button>

                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === 'quiz' ? 'Ask a topic to quiz on…' : 'Ask anything...'}
                    className={`w-full pl-14 pr-14 py-3.5 border-2 rounded-xl shadow-lg resize-none focus:outline-none focus:ring-2 transition-all duration-300 placeholder-violet-400 text-base backdrop-blur-sm hover:shadow-xl ${
                      mode === 'quiz'
                        ? 'bg-white/90 border-violet-300 focus:ring-violet-500 focus:border-violet-500 hover:border-violet-400'
                        : 'bg-white/90 border-violet-300 focus:ring-violet-500 focus:border-violet-500 hover:border-violet-400'
                    }`}
                    rows={1}
                    maxLength={8000}
                    disabled={isSending}
                    aria-label="Message input"
                  />

                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!inputValue.trim() || isSending}
                    className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 text-white shadow-lg hover:shadow-xl hover:scale-110 ${
                      isSending
                        ? 'bg-violet-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'
                    }`}
                    aria-label="Send message"
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} className="animate-pulse" />}
                  </button>
                </div>

                <p className="mt-2 text-xs text-violet-600">
                  Press Enter to send • Shift+Enter for a new line • Cmd/Ctrl+K for quick actions
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 0.9rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
          backdrop-filter: blur(8px);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: #7c3aed;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
          position: relative;
          overflow: hidden;
        }
        .quick-action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
          transition: left 0.5s ease;
        }
        .quick-action-btn:hover::before {
          left: 100%;
        }
        .quick-action-btn:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(245, 243, 255, 1));
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
          color: #6d28d9;
        }
      `}</style>
    </ToastProvider>
  );
}