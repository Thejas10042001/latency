
import React, { useState, useRef, useEffect, FC } from 'react';
import { ICONS } from '../constants';
import { streamSalesGPT, generatePineappleImage, streamDeepStudy } from '../services/geminiService';
import { GPTMessage, GPTToolMode, UploadedFile } from '../types';

interface SalesGPTProps {
  files: UploadedFile[];
}

export const SalesGPT: FC<SalesGPTProps> = ({ files }) => {
  const [messages, setMessages] = useState<GPTMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<GPTToolMode>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const readyFiles = files.filter(f => f.status === 'ready');

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const currentHistory = [...messages];
    const userMessage: GPTMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      mode: mode,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: GPTMessage = {
      id: assistantId,
      role: 'assistant',
      content: mode === 'pineapple' ? "Generating your pineapple masterpiece..." : "",
      mode: mode,
      isStreaming: mode !== 'pineapple'
    };

    setMessages(prev => [...prev, assistantMessage]);

    const context = readyFiles.map(f => `FILE [${f.name}]:\n${f.content}`).join('\n\n');

    try {
      if (mode === 'pineapple') {
        const imageUrl = await generatePineappleImage(input);
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: imageUrl ? "Here is your generated image:" : "Failed to generate image.", imageUrl: imageUrl || undefined, isStreaming: false } : m
        ));
      } else if (mode === 'deep-study') {
        const stream = streamDeepStudy(input, currentHistory, context);
        let fullText = "";
        for await (const chunk of stream) {
          fullText += chunk;
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: fullText } : m
          ));
        }
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));
      } else {
        const stream = streamSalesGPT(input, currentHistory, context);
        let fullText = "";
        for await (const chunk of stream) {
          fullText += chunk;
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: fullText } : m
          ));
        }
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: "Neural link severed. Please try again.", isStreaming: false } : m
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl h-[800px] flex flex-col overflow-hidden relative">
      {/* GPT Header */}
      <div className="p-8 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg animate-pulse">
              <ICONS.Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sales GPT <span className="text-indigo-600 text-xs font-bold uppercase ml-2 tracking-widest">v3 Flash</span></h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Unified Intelligence Core</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={clearChat} className="px-4 py-2 bg-white text-slate-400 hover:text-rose-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
               Clear Memory
             </button>
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                Online
             </div>
          </div>
        </div>

        {/* Grounding HUD */}
        <div className="flex items-center gap-4 py-2 px-4 bg-white/50 border border-slate-100 rounded-2xl">
           <div className="flex items-center gap-2 text-indigo-600">
              <ICONS.Shield className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">Context Grounding</span>
           </div>
           <div className="h-4 w-px bg-slate-200"></div>
           <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {readyFiles.length > 0 ? readyFiles.map((f, i) => (
                <div key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 whitespace-nowrap">
                   {f.name}
                </div>
              )) : (
                <span className="text-[8px] font-bold text-slate-300 uppercase italic">No documents currently uploaded to memory.</span>
              )}
           </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-10 bg-indigo-50 rounded-[3rem] text-indigo-200">
               <ICONS.Brain className="w-20 h-20" />
            </div>
            <div className="max-w-md">
              <h4 className="text-2xl font-black text-slate-800">Grounding Ready</h4>
              <p className="text-slate-500 mt-2 font-medium">I have access to your uploaded documents. Ask me to extract insights, draft pitches, or summarize complex technical requirements.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
               <StarterCard label="Strategic Wedge" onClick={() => setInput("Based on the docs, what is our best competitive wedge?")} />
               <StarterCard label="Technical Audit" onClick={() => setInput("Identify all technical requirements mentioned in these files.")} />
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-[2rem] rounded-tr-none' : 'bg-white border border-slate-100 shadow-xl rounded-[2rem] rounded-tl-none text-slate-800'} p-6 relative group`}>
              <div className="flex items-center gap-2 mb-3">
                 <span className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {msg.role === 'user' ? 'Architect' : 'Sales GPT Core'}
                 </span>
                 {msg.mode !== 'standard' && (
                   <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                     {msg.mode}
                   </span>
                 )}
              </div>
              <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap markdown-content">
                {msg.content}
              </div>
              {msg.imageUrl && (
                <div className="mt-6 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-2xl">
                  <img src={msg.imageUrl} alt="Generated asset" className="w-full h-auto object-cover" />
                </div>
              )}
              {msg.isStreaming && (
                <div className="mt-4 flex gap-1">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-10 bg-slate-50/50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Tool HUD */}
          <div className="flex gap-4">
             <ToolToggle 
               active={mode === 'standard'} 
               onClick={() => setMode('standard')} 
               icon={<ICONS.Chat className="w-4 h-4" />} 
               label="Fast Pulse" 
             />
             <ToolToggle 
               active={mode === 'pineapple'} 
               onClick={() => setMode('pineapple')} 
               icon={<ICONS.Pineapple className="w-4 h-4" />} 
               label="Pineapple (Image)" 
               color="emerald"
             />
             <ToolToggle 
               active={mode === 'deep-study'} 
               onClick={() => setMode('deep-study')} 
               icon={<ICONS.Research className="w-4 h-4" />} 
               label="Deep Study (Reasoning)" 
               color="amber"
             />
          </div>

          <div className="relative group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={mode === 'pineapple' ? "Describe the image you want to generate..." : mode === 'deep-study' ? "Ask for a comprehensive research breakdown..." : "Inquire for fast sales intelligence..."}
              className="w-full bg-white border-2 border-slate-200 rounded-[2.5rem] px-10 py-6 text-lg focus:border-indigo-500 outline-none transition-all pr-32 font-medium shadow-2xl"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`absolute right-4 top-4 bottom-4 px-10 rounded-[2rem] ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'} font-black uppercase tracking-widest text-[11px] shadow-xl flex items-center gap-2 transition-all active:scale-95`}
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <ICONS.Play className="w-4 h-4" />
              )}
              {isProcessing ? 'Thinking' : 'Execute'}
            </button>
          </div>
          
          <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
             Conversational History Active • {readyFiles.length} Grounded Source{readyFiles.length !== 1 ? 's' : ''} Linked
          </p>
        </div>
      </div>
      <style>{`
        .markdown-content strong { font-weight: 800; color: #1e1b4b; }
        .markdown-content code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        .markdown-content ul { list-style-type: disc; margin-left: 20px; margin-top: 10px; }
      `}</style>
    </div>
  );
};

const ToolToggle = ({ active, onClick, icon, label, color = 'indigo' }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color?: string }) => {
  const activeClasses = {
    indigo: 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-100',
    emerald: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-100',
    amber: 'bg-amber-600 border-amber-600 text-white shadow-amber-100',
  }[color];

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-[9px] shadow-xl ${active ? activeClasses : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
    >
      {icon}
      {label}
    </button>
  );
};

const StarterCard = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm text-left hover:border-indigo-400 hover:shadow-lg transition-all active:scale-95 group"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-black text-slate-800 tracking-tight">{label}</span>
      <ICONS.Sparkles className="w-3 h-3 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
    </div>
  </button>
);
