
import { useState, useEffect, useMemo, FC, FormEvent } from 'react';
import { ICONS } from '../constants';
import { performCognitiveSearchStream, generateDynamicSuggestions, CognitiveSearchResult } from '../services/geminiService';
import { UploadedFile, MeetingContext } from '../types';

const FormattedText: FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-8 text-slate-700 leading-relaxed text-lg font-serif">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-4" />;

        if (trimmed.startsWith('### ')) {
          const title = trimmed.replace('### ', '');
          return (
            <div key={idx} className="pt-12 pb-6 border-b-2 border-slate-100 mb-6 animate-in fade-in slide-in-from-left-4 first:pt-0">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-8 bg-indigo-600 rounded-full shadow-sm"></div>
                <h4 className="text-[15px] font-black uppercase tracking-[0.45em] text-slate-900 drop-shadow-sm">{title}</h4>
              </div>
            </div>
          );
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        return (
          <div key={idx} className={isBullet ? "flex gap-5 pl-8 border-l-4 border-indigo-50 py-3 bg-slate-50/40 rounded-r-2xl" : "py-2"}>
            {isBullet && <div className="mt-3.5 w-2 h-2 rounded-full bg-indigo-400 shadow-sm shrink-0"></div>}
            <div className="flex-1">
              {trimmed.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const inner = part.slice(2, -2);
                  return <strong key={i} className="font-extrabold text-slate-900 bg-indigo-100/50 px-2.5 py-1 rounded-md">{inner}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <em key={i} className="italic text-indigo-800 font-semibold">{part.slice(1, -1)}</em>;
                }
                return part;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface CognitiveSearchProps {
  files: UploadedFile[];
  context: MeetingContext;
}

export const CognitiveSearch: FC<CognitiveSearchProps> = ({ files, context }) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CognitiveSearchResult | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const readyFiles = useMemo(() => files.filter(f => f.status === 'ready'), [files]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (readyFiles.length > 0) {
        try {
          const combinedContent = readyFiles.map(f => f.content).join('\n');
          const res = await generateDynamicSuggestions(combinedContent, context);
          setSuggestions(res);
        } catch (e) { console.error(e); }
      }
    };
    fetchSuggestions();
  }, [readyFiles, context]);

  /**
   * Optimized Partial JSON text extractor.
   * Handles multi-line streaming and escaped characters.
   */
  const extractFieldFromPartialJson = (json: string, field: string): string => {
    try {
      // Find the start of the field
      const fieldMarker = `"${field}": "`;
      const startIdx = json.indexOf(fieldMarker);
      if (startIdx === -1) return "";
      
      const contentStart = startIdx + fieldMarker.length;
      let content = "";
      
      // Look for the ending double quote, considering escaped ones
      for (let i = contentStart; i < json.length; i++) {
        if (json[i] === '"' && (i === 0 || json[i-1] !== '\\')) {
          break;
        }
        content += json[i];
      }
      
      return content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } catch (e) {
      return "";
    }
  };

  const handleSearch = async (e?: FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);
    setResult(null);
    setStreamingText("");

    try {
      const combinedContent = readyFiles.map(f => `FILE: ${f.name}\n${f.content}`).join('\n\n');
      const stream = performCognitiveSearchStream(activeQuery, combinedContent, context);
      
      let fullBuffer = "";
      for await (const chunk of stream) {
        fullBuffer += chunk;
        
        const partialAnswer = extractFieldFromPartialJson(fullBuffer, "answer");
        const partialSoundbite = extractFieldFromPartialJson(fullBuffer, "articularSoundbite");
        const partialBrief = extractFieldFromPartialJson(fullBuffer, "briefExplanation");
        
        if (partialAnswer || partialSoundbite || partialBrief) {
          setStreamingText(partialAnswer);
          setResult(prev => ({
            ...(prev || {}),
            answer: partialAnswer,
            articularSoundbite: partialSoundbite || (prev?.articularSoundbite || ""),
            briefExplanation: partialBrief || (prev?.briefExplanation || ""),
            psychologicalProjection: prev?.psychologicalProjection || { 
              buyerFear: extractFieldFromPartialJson(fullBuffer, "buyerFear") || "...", 
              buyerIncentive: extractFieldFromPartialJson(fullBuffer, "buyerIncentive") || "...", 
              strategicLever: extractFieldFromPartialJson(fullBuffer, "strategicLever") || "..." 
            },
            citations: prev?.citations || [],
            reasoningChain: prev?.reasoningChain || { painPoint: "...", capability: "...", strategicValue: "..." }
          } as CognitiveSearchResult));
        }
      }
      
      try {
        const finalResult = JSON.parse(fullBuffer);
        setResult(finalResult);
        setStreamingText(finalResult.answer);
      } catch (e) {
        console.warn("Soft parse failed, fallback to stream state.");
      }
      
    } catch (err: any) {
      setError(err.message || "Cognitive Engine encountered a reasoning stall.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-5 mb-10">
          <div className="p-4.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><ICONS.Search className="w-6 h-6" /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Inquiry</h2>
            <p className="text-sm text-slate-500 font-medium">Querying documentary memory for <strong className="text-indigo-600">{context.clientCompany || 'Prospect'}</strong></p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about ${context.persona} drivers, technical gaps, or ROI targets...`}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-10 py-8 text-xl focus:border-indigo-500 focus:bg-white outline-none transition-all pr-44 font-medium shadow-inner"
          />
          <button 
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-4 top-4 bottom-4 px-12 rounded-[2rem] bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center gap-3"
          >
            {isSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Thinking
              </>
            ) : 'Analyze'}
          </button>
        </form>
      </div>

      {(result || isSearching) && (
        <div className="space-y-12 animate-in slide-in-from-top-6 duration-700">
          
          <div className="bg-indigo-950 rounded-[4rem] p-14 shadow-2xl relative overflow-hidden group border border-indigo-900">
             <div className="absolute -top-10 -right-10 p-12 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-1000"><ICONS.Brain className="w-72 h-72 text-white" /></div>
             <div className="relative z-10 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className={`w-3 h-7 bg-indigo-500 rounded-full ${isSearching ? 'animate-pulse' : ''}`}></div>
                     <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.45em]">Articular Hook: Verbatim Command</h4>
                  </div>
                  <p className="text-4xl md:text-6xl font-black text-white leading-[1.05] italic tracking-tight drop-shadow-lg">
                     {result?.articularSoundbite ? `“${result.articularSoundbite}”` : isSearching ? "Synthesizing Core Strategy..." : ""}
                  </p>
                </div>
                
                <div className="pt-10 border-t border-white/10">
                  <h5 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.35em] mb-5">Neural Executive Briefing</h5>
                  <p className="text-indigo-100/90 text-xl font-medium leading-relaxed max-w-5xl italic border-l-4 border-indigo-500/30 pl-8">
                     {result?.briefExplanation || (isSearching ? "Calculating non-obvious strategic links..." : "")}
                  </p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProjectionCard label="Primary Driver" content={result?.psychologicalProjection?.buyerIncentive || "..."} color="emerald" icon={<ICONS.Growth />} isSearching={isSearching} />
            <ProjectionCard label="Critical Resistance" content={result?.psychologicalProjection?.buyerFear || "..."} color="rose" icon={<ICONS.Security />} isSearching={isSearching} />
            <ProjectionCard label="Strategic Wedge" content={result?.psychologicalProjection?.strategicLever || "..."} color="indigo" icon={<ICONS.Trophy />} isSearching={isSearching} />
          </div>

          <div className="bg-white rounded-[4.5rem] p-16 md:p-24 shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-20 border-b border-slate-100 pb-16">
               <div className="flex items-center gap-6">
                  <div className="p-5 bg-slate-900 text-white rounded-3xl shadow-2xl shadow-slate-200 rotate-3 transition-transform hover:rotate-0"><ICONS.Brain className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-[16px] font-black uppercase tracking-[0.45em] text-slate-900">Neural Intelligence Core</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                       Optimized for: {context.persona} Psychology
                    </p>
                  </div>
               </div>
               
               <div className="flex flex-wrap gap-2.5 justify-end max-w-lg">
                  {context.answerStyles.map((style, i) => (
                    <span key={i} className="px-5 py-2.5 bg-indigo-50/50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100/60 shadow-sm transition-colors hover:bg-indigo-600 hover:text-white">
                      {style}
                    </span>
                  ))}
               </div>
            </div>
            
            <FormattedText text={streamingText || result?.answer || (isSearching ? "Synthesizing detailed strategic response..." : "")} />

            {result?.citations && result.citations.length > 0 && (
              <div className="mt-32 pt-20 border-t border-slate-100 space-y-16">
                 <div className="flex items-center justify-between">
                   <h5 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
                      <ICONS.Shield className="w-5 h-5 text-indigo-500" /> Grounded Evidence Core
                   </h5>
                   <div className="px-5 py-2 bg-slate-100 rounded-full text-[11px] font-black text-slate-500 tracking-widest uppercase">
                     {result.citations.length} Verified Nodes
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {result.citations.map((cit, i) => (
                     <div key={i} className="p-12 bg-slate-50/50 border border-slate-100 rounded-[3rem] group hover:bg-white hover:border-indigo-300 hover:shadow-2xl transition-all duration-500">
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                          <ICONS.Document className="w-4 h-4" /> {cit.source || 'Intel Repository'}
                        </p>
                        <p className="text-lg text-slate-600 leading-relaxed font-serif italic relative">
                           <span className="absolute -left-6 -top-4 text-6xl text-indigo-100 font-serif leading-none opacity-50">“</span>
                           {cit.snippet}
                        </p>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !isSearching && suggestions.length > 0 && (
        <div className="space-y-10 py-10">
          <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 text-center">Inferred Reasoning Suggestions</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {suggestions.map((text, i) => (
              <button key={i} onClick={() => {setQuery(text); handleSearch(undefined, text);}} className="p-12 bg-white border border-slate-100 rounded-[3rem] text-left hover:border-indigo-500 hover:shadow-2xl transition-all shadow-xl group border-b-8 border-b-indigo-50 hover:border-b-indigo-600 active:scale-95 duration-300">
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6 group-hover:translate-x-2 transition-transform">Inquiry Node 0{i + 1}</p>
                <p className="text-xl font-bold text-slate-800 leading-tight">“{text}”</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectionCard = ({ label, content, color, icon, isSearching }: { label: string; content: string; color: string; icon: React.ReactNode, isSearching?: boolean }) => (
  <div className={`p-14 rounded-[4rem] bg-white border border-slate-100 shadow-2xl border-t-8 border-t-${color}-500 hover:-translate-y-3 transition-all duration-700 group relative overflow-hidden`}>
    {isSearching && <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden"><div className={`h-full bg-${color}-500 animate-[progress_1.5s_infinite] w-full origin-left`}></div></div>}
    <div className="flex items-center gap-6 mb-10">
       <div className={`p-6 bg-${color}-50 text-${color}-600 rounded-3xl group-hover:scale-110 transition-transform shadow-sm`}>{icon}</div>
       <h4 className={`text-[13px] font-black uppercase tracking-[0.25em] text-${color}-600`}>{label}</h4>
    </div>
    <p className="text-2xl font-bold text-slate-800 leading-relaxed italic tracking-tight relative z-10">
      {content === "..." ? (
        <span className="flex gap-1.5">
          <span className="w-2 h-2 bg-slate-200 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-slate-200 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-2 h-2 bg-slate-200 rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </span>
      ) : `“${content}”`}
    </p>
  </div>
);
