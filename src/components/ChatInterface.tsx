import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Copy, Check, Paperclip, FileText, Plus, Trash2, ShieldCheck, Volume2, Mail, Smartphone } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Language, PatientDemographics, Attachment } from '../types';
import { initLocalModel, getLocalChatResponse } from '../services/webLlmService';
import { VoiceHandler } from './VoiceHandler';
import { PatientProfile } from './PatientProfile';
import { useTTS } from '../services/ttsService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-md transition-colors"
      title="Copy response"
    >\n      {copied ? <Check size={14} /> : <Copy size={14} />}\n    </button>
  );
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [demographics, setDemographics] = useState<PatientDemographics>({});
  const [showProfile, setShowProfile] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local AI State
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState('');

  const tts = useTTS(language);

  const languages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिन्दी)' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (ತೆಲುಗು)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
    { code: 'or', name: 'Oriya (ଓଡ଼ିଆ)' },
    { code: 'bn', name: 'Bangla (বাংলা)' },
    { code: 'mr', name: 'Marathi (ಮರಾଠಿ)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeModel = async () => {
    if (isModelReady) return true;
    setModelLoading(true);
    try {
      await initLocalModel((progress) => {
        setModelProgress(progress.text);
      });
      setIsModelReady(true);
      return true;
    } catch (error) {\n      console.error(\"Failed to load local model:\", error);
      alert(\"Local AI requires a modern browser with WebGPU or Wasm support. Please use Chrome, Edge or Safari.\");
      return false;
    } finally {
      setModelLoading(false);
      setModelProgress('');
    }
  };\n\n  const handleSend = async (text: string, overrideAttachments?: Attachment[]) => {
    const currentAttachments = overrideAttachments || attachments;
    if ((!text.trim() && currentAttachments.length === 0) || isLoading) return;

    if (!isModelReady) {
      const ready = await initializeModel();
      if (!ready) return;
    }

    const userMessage: Message = { 
      role: 'user', 
      text,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await getLocalChatResponse([...messages, userMessage], language, demographics);
      const botMessage: Message = { role: 'model', text: response || 'Sorry, I could not process that locally.' };
      setMessages(prev => [...prev, botMessage]);
      tts.speak(botMessage.text);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Local processing error. Please refresh and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (messages.length === 0) return;
    const transcript = messages.map(m => `${m.role === 'user' ? 'Patient' : 'AI Assistant'}: ${m.text}`).join('\\n\\n');
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IR_Guide_Local_Transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className=\"flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-2xl overflow-hidden\">\n      <header className=\"bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10\">\n        <div className=\"flex items-center gap-3\">\n          <div className=\"bg-sky-50 text-sky-600 p-2 rounded-xl\">\n            <Bot size={24} />\n          </div>\n          <div>\n            <h1 className=\"font-semibold text-lg leading-tight text-slate-800\">IR Guide (Self-Contained)</h1>\n            <p className=\"text-xs text-slate-500\">100% Local AI • No Cloud API</p>\n          </div>\n        </div>\n        \n        <div className=\"flex items-center gap-4\">\n          <div className={cn(\n            \"flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border\",\n            isModelReady ? \"bg-emerald-50 text-emerald-700 border-emerald-200\" : \"bg-slate-50 text-slate-600\"\n          )}>\n            <Smartphone size={14} />\n            <span className=\"hidden sm:inline\">{isModelReady ? 'Local AI Ready' : 'Initializing...'}</span>\n          </div>\n          \n          {messages.length > 0 && (\n            <button onClick={downloadTranscript} className=\"text-xs text-slate-500 hover:text-sky-600 transition-colors flex items-center gap-1\">\n              <FileText size={14} />\n              <span className=\"hidden sm:inline\">Transcript</span>\n            </button>\n          )}\n          <select\n            value={language}\n            onChange={(e) => setLanguage(e.target.value as Language)}\n            className=\"bg-slate-100 text-slate-700 text-sm border-none rounded px-2 py-1\"\n          >\n            {languages.map(lang => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}\n          </select>\n        </div>\n      </header>\n\n      <div ref={scrollRef} className=\"flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50\">\n        {messages.length === 0 && (\n          <div className=\"flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-500\">\n            <Bot size={48} className=\"text-slate-300\" />\n            <div>\n              <p className=\"text-lg font-medium\">Self-Contained IR Guide</p>\n              <p className=\"text-sm\">This application runs entirely on your device. No data is sent to the cloud.</p>\n              {!isModelReady && !modelLoading && (\n                <button \n                  onClick={initializeModel}\n                  className=\"mt-4 bg-sky-600 text-white px-6 py-2 rounded-xl hover:bg-sky-700 transition-colors shadow-md\"\n                >\n                  Initialize Local AI\n                </button>\n              )}\n            </div>\n          </div>\n        )}\n\n        <AnimatePresence>\n          {messages.map((msg, i) => (\n            <div key={i} className={cn(\"flex gap-3 max-w-[85%]\", msg.role === 'user' ? \"ml-auto flex-row-reverse\" : \"mr-auto\")}>\n              <div className={cn(\"w-8 h-8 rounded-full flex items-center justify-center shrink-0\", msg.role === 'user' ? \"bg-sky-100 text-sky-600\" : \"bg-slate-200 text-slate-600\")}>\n                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}\n              </div>\n              <div className={cn(\"p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group\", msg.role === 'user' ? \"bg-sky-600 text-white rounded-tr-none\" : \"bg-white text-slate-800 border border-slate-100 rounded-tl-none\")}>\n                <Markdown className=\"prose prose-sm\">{msg.text}</Markdown>\n                {msg.role === 'model' && <div className=\"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity\"><CopyButton text={msg.text} /></div>}\n              </div>\n            </div>\n          ))}\n        </AnimatePresence>\n\n        {modelLoading && (\n          <div className=\"flex flex-col items-center justify-center p-8 space-y-3\">\n            <Loader2 className=\"animate-spin text-sky-500\" size={32} />\n            <p className=\"text-sm text-slate-500 font-mono\">{modelProgress}</p>\n          </div>\n        )}\n      </div>\n\n      <div className=\"p-4 bg-white border-t border-slate-100\">\n        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className=\"flex gap-2\">\n          <input\n            type=\"text\"\n            value={input}\n            onChange={(e) => setInput(e.target.value)}\n            placeholder={isModelReady ? \"Ask about IR procedures...\" : \"Initialize AI to start chatting\"}\n            disabled={!isModelReady || isLoading}\n            className=\"flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500\"\n          />\n          <button\n            type=\"submit\"\n            disabled={!input.trim() || isLoading || !isModelReady}\n            className=\"bg-sky-600 text-white p-3 rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors\"\n          >\n            <Send size={20} />\n          </button>\n        </form>\n      </div>\n    </div>\n  );\n};\n