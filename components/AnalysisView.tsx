
import React, { useState, useRef, useMemo } from 'react';
import { AnalysisResult, Citation, UploadedFile, BuyerSnapshot, MeetingContext, CompetitorInsight, MatrixItem } from '../types';
import { ICONS } from '../constants';
import { generatePitchAudio, decodeAudioData } from '../services/geminiService';

interface AnalysisViewProps {
  result: AnalysisResult;
  files: UploadedFile[];
  context: MeetingContext;
}

const VOICES = [
  { name: 'Kore', label: 'Pro Male' },
  { name: 'Puck', label: 'High Energy' },
  { name: 'Charon', label: 'Deep Authority' },
  { name: 'Zephyr', label: 'Calm Strategist' },
];

const CognitiveRadarChart = ({ data, size = 320 }: { data: { label: string, value: number }[], size?: number }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 45) * Math.cos(angle),
      labelY: center + (radius + 45) * Math.sin(angle),
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative flex items-center justify-center p-8">
      <svg width={size + 160} height={size + 100} className="overflow-visible drop-shadow-xl">
        <defs>
          <radialGradient id="radarGrad">
            <stop offset="0%" stopColor="rgba(79, 70, 229, 0.4)" />
            <stop offset="100%" stopColor="rgba(79, 70, 229, 0.05)" />
          </radialGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8, 1].map((r, idx) => (
          <circle key={idx} cx={center} cy={center} r={radius * r} fill={idx === 4 ? "url(#radarGrad)" : "none"} stroke="rgba(79, 70, 229, 0.1)" strokeWidth="1" />
        ))}
        {data.map((_, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="rgba(79, 70, 229, 0.15)" strokeWidth="1" />
        ))}
        <polygon points={polygonPath} fill="rgba(79, 70, 229, 0.3)" stroke="rgba(79, 70, 229, 0.8)" strokeWidth="3" />
        {data.map((d, i) => (
          <text key={i} x={points[i].labelX} y={points[i].labelY} textAnchor="middle" className="text-[9px] font-black uppercase fill-slate-500 tracking-widest">{d.label}</text>
        ))}
      </svg>
    </div>
  );
};

const SWOTItem = ({ label, items, color, symbol }: { label: string, items: string[], color: string, symbol: string }) => (
  <div className={`p-5 rounded-3xl bg-${color}-50/30 border border-${color}-100/50 flex flex-col h-full`}>
    <div className="flex items-center gap-2 mb-3">
       <div className={`w-6 h-6 rounded-lg bg-${color}-500 text-white flex items-center justify-center font-black text-[10px]`}>{symbol}</div>
       <h5 className={`text-[10px] font-black uppercase tracking-widest text-${color}-600`}>{label}</h5>
    </div>
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-2 text-[10px] text-slate-600 leading-relaxed font-medium">
          <span className={`text-${color}-500 mt-1 shrink-0`}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const CompetitorCard = ({ comp, name }: { comp: CompetitorInsight, name: string }) => (
  <div className="p-10 rounded-[4rem] bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-[0_40px_80px_-15px_rgba(79,70,229,0.12)] transition-all duration-700 group flex flex-col h-full relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
       <ICONS.Trophy className="w-48 h-48" />
    </div>
    
    <div className="flex items-center justify-between mb-8 relative z-10">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-slate-200">{name[0]}</div>
        <div>
           <h4 className="text-2xl font-black text-slate-900 tracking-tight">{name}</h4>
           <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${comp.threatProfile === 'Direct' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{comp.threatProfile} Threat Profile</span>
           </div>
        </div>
      </div>
      <div className="text-right">
         <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-1">Our Displacement Wedge</p>
         <p className="text-sm font-bold text-slate-900 border-b-2 border-indigo-100 pb-1">{comp.ourWedge}</p>
      </div>
    </div>

    <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed italic border-l-4 border-slate-100 pl-4">“{comp.overview}”</p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
      <SWOTItem label="Strengths" items={comp.strengths || []} color="emerald" symbol="S" />
      <SWOTItem label="Weaknesses" items={comp.weaknesses || []} color="rose" symbol="W" />
      <SWOTItem label="Opportunities" items={comp.opportunities || []} color="indigo" symbol="O" />
      <SWOTItem label="Threats" items={comp.threats || []} color="amber" symbol="T" />
    </div>

    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
       <div className="flex items-center gap-2">
          <ICONS.Document className="w-3 h-3 text-slate-300" />
          <span className="text-[8px] font-bold text-slate-400 truncate max-w-[150px]">{comp.citation.sourceFile}</span>
       </div>
       <button className="text-[9px] font-black uppercase text-indigo-600 tracking-widest hover:text-indigo-800 transition-colors">View Citation Details</button>
    </div>
  </div>
);

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result, files, context }) => {
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const radarData = useMemo(() => [
    { label: "Risk Tolerance", value: result.snapshot.metrics.riskToleranceValue },
    { label: "Strategic Focus", value: result.snapshot.metrics.strategicPriorityFocus },
    { label: "Analytical Depth", value: result.snapshot.metrics.analyticalDepth },
    { label: "Directness", value: result.snapshot.metrics.directness },
    { label: "Innovation", value: result.snapshot.metrics.innovationAppetite },
  ], [result.snapshot]);

  // Consolidate all evidence for the Evidence Index
  const evidenceIndex = useMemo(() => {
    const list: { source: string; snippet: string; category: string }[] = [];
    
    // Snapshot Citations
    if (result.snapshot.roleCitation) list.push({ source: result.snapshot.roleCitation.sourceFile, snippet: result.snapshot.roleCitation.snippet, category: 'Persona' });
    result.snapshot.priorities.forEach(p => list.push({ source: p.citation.sourceFile, snippet: p.citation.snippet, category: 'Priority' }));
    
    // Ground Matrix Citations
    result.groundMatrix?.forEach(m => list.push({ source: m.evidence.sourceFile, snippet: m.evidence.snippet, category: 'Ground Fact' }));
    
    // Objection Handling Citations
    result.objectionHandling.forEach(o => list.push({ source: o.citation.sourceFile, snippet: o.citation.snippet, category: 'Objection Defense' }));
    
    // Document Entities
    result.documentInsights.entities.forEach(e => list.push({ source: e.citation.sourceFile, snippet: e.citation.snippet, category: 'Entity Discovery' }));

    return list;
  }, [result]);

  const playAudioForText = async (text: string, id: string) => {
    if (playingAudioId === id) { audioSourceRef.current?.stop(); setPlayingAudioId(null); return; }
    setIsGeneratingAudio(true);
    setPlayingAudioId(id);
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const bytes = await generatePitchAudio(text, selectedVoice);
      if (!bytes) throw new Error();
      const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setPlayingAudioId(null);
      audioSourceRef.current?.stop();
      audioSourceRef.current = source;
      source.start();
    } catch (e) { setPlayingAudioId(null); } finally { setIsGeneratingAudio(false); }
  };

  const generateReportPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      let y = 20;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();

      const addHeader = (text: string, color = [79, 70, 229]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, margin, y);
        y += 10;
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.line(margin, y - 5, pageWidth - margin, y - 5);
        y += 5;
      };

      const addBody = (text: string, size = 10) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.setTextColor(60, 60, 60);
        const split = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(split, margin, y);
        y += split.length * (size / 2) + 5;
        if (y > 270) { doc.addPage(); y = 20; }
      };

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(24);
      doc.setTextColor(255);
      doc.text("COGNITIVE SALES STRATEGY", margin, 25);
      doc.setFontSize(10);
      doc.text(`SYNTHESIZED FOR: ${context.clientCompany.toUpperCase()}`, margin, 35);
      y = 55;

      // Meeting Summary
      addHeader("MEETING SUMMARY");
      addBody(`Client: ${context.clientCompany} (${context.clientNames})`);
      addBody(`Seller: ${context.sellerCompany} (${context.sellerNames})`);
      addBody(`Focus: ${context.meetingFocus}`);
      y += 10;

      // Ground Matrix
      addHeader("COGNITIVE GROUND MATRIX");
      result.groundMatrix.forEach(m => {
        doc.setFont("helvetica", "bold");
        doc.text(`[${m.category}] ${m.observation}`, margin, y);
        y += 5;
        addBody(`Significance: ${m.significance}`, 9);
      });

      // Psychology Section
      doc.addPage(); y = 20;
      addHeader("BUYER PSYCHOLOGY & METRICS");
      addBody(`Identity: ${result.snapshot.personaIdentity}`);
      addBody(`Decision Logic: ${result.snapshot.decisionLogic}`);
      y += 80; // Placeholder for chart

      // Competitive Hub
      addHeader("COMPETITIVE INTELLIGENCE HUB");
      const addComp = (c: CompetitorInsight, name: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${name} - ${c.threatProfile} Threat`, margin, y);
        y += 6;
        addBody(`Wedge: ${c.ourWedge}`);
      };
      addComp(result.competitiveHub.cognigy, "COGNIGY");
      addComp(result.competitiveHub.amelia, "AMELIA");

      // Evidence Index
      doc.addPage(); y = 20;
      addHeader("ANALYSIS EVIDENCE INDEX");
      evidenceIndex.slice(0, 15).forEach(ev => {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text(`Source: ${ev.source} (${ev.category})`, margin, y);
        y += 4;
        addBody(`"${ev.snippet}"`, 7);
      });

      doc.save(`Strategy-${context.clientCompany}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-end">
        <button onClick={generateReportPDF} disabled={isExporting} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700">
          {isExporting ? 'Generating Report...' : 'Download Strategy Report'}
        </button>
      </div>

      {/* Ground Matrix Hero Section */}
      <section className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5"><ICONS.Shield className="w-64 h-64 text-indigo-900" /></div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-2">Source Grounding</h3>
          <h2 className="text-4xl font-black text-slate-900 mb-10">Cognitive Ground Matrix</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {result.groundMatrix.map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex flex-col hover:bg-white hover:border-indigo-300 hover:shadow-xl transition-all group">
                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mb-3 px-2 py-1 bg-white border border-indigo-50 rounded-full inline-block w-fit">
                  {item.category}
                </span>
                <p className="text-md font-bold text-slate-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                  {item.observation}
                </p>
                <div className="mt-auto space-y-3">
                   <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">
                     “{item.significance}”
                   </p>
                   <div className="pt-4 border-t border-slate-200">
                      <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1">
                        <ICONS.Document className="w-2 h-2" /> Evidence Source
                      </p>
                      <p className="text-[8px] font-bold text-slate-600 truncate">{item.evidence.sourceFile}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Psychology Matrix */}
      <section className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="w-full lg:w-1/2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-2">Neural Matrix</h3>
            <h2 className="text-4xl font-black text-slate-900 mb-6">Buyer Psychology Identity</h2>
            <div className="space-y-6 text-slate-600 italic border-l-4 border-indigo-100 pl-6">
              <p><strong>Persona:</strong> {result.snapshot.personaIdentity}</p>
              <p><strong>Logic:</strong> {result.snapshot.decisionLogic}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
              {radarData.map((d, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                    <span>{d.label}</span>
                    <span>{d.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex justify-center">
            <CognitiveRadarChart data={radarData} />
          </div>
        </div>
      </section>

      {/* Competitive Intelligence Hub with Comparative SWOT */}
      <section className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-indigo-600 to-emerald-500"></div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <div className="flex items-center gap-4 mb-3">
               <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200"><ICONS.Trophy /></div>
               <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-500">Market Intelligence Hub</h3>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Comparative SWOT Analysis</h2>
            <p className="text-slate-500 mt-2 font-medium max-w-2xl">Deep-dive into inferred and explicit competitive dynamics. This matrix identifies specific vulnerabilities and threat vectors grounded in your documentary data.</p>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm">
             <span className="text-[10px] font-black uppercase tracking-widest">Wedge Logic: Enabled</span>
             <ICONS.Shield className="w-3 h-3" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          <CompetitorCard comp={result.competitiveHub.cognigy} name="Cognigy" />
          <CompetitorCard comp={result.competitiveHub.amelia} name="Amelia" />
          {result.competitiveHub.others.map((c, i) => <CompetitorCard key={i} comp={c} name={c.name} />)}
        </div>

        {/* Tactical Synthesis Footer */}
        <div className="mt-16 p-10 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/4 -translate-y-1/4 rotate-12 transition-transform group-hover:rotate-0 duration-700"><ICONS.Brain className="w-80 h-80" /></div>
           <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Competitive Synthesis Summary</h4>
                 <p className="text-2xl font-black leading-tight tracking-tight">
                    "Exploit Cognigy's {(result.competitiveHub.cognigy.weaknesses[0] || "logic gaps").toLowerCase()} while countering Amelia's {(result.competitiveHub.amelia.strengths[0] || "market presence").toLowerCase()} by anchoring on our {(result.snapshot.priorities[0]?.text || "core value").toLowerCase()} advantage."
                 </p>
              </div>
              <div className="w-full lg:w-fit grid grid-cols-2 gap-4">
                 <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Primary Win Vector</p>
                    <p className="text-xs font-bold text-white/90">Strategic {result.snapshot.personaIdentity.split(' ')[0]} Alignment</p>
                 </div>
                 <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                    <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">Critical Block Vector</p>
                    <p className="text-xs font-bold text-white/90">Competitor Technical Lock-in</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Battle Drills */}
      <section className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-200">
        <h2 className="text-3xl font-black text-slate-900 mb-10">Objection Defense Drills</h2>
        <div className="space-y-6">
          {result.objectionHandling.map((o, i) => (
            <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-rose-500 mb-1">Objection</p>
                <p className="text-xl font-black text-slate-900 mb-4">{o.objection}</p>
                <p className="text-sm text-slate-500 font-medium italic">“{o.realMeaning}”</p>
              </div>
              <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-indigo-50">
                <p className="text-[10px] font-black uppercase text-indigo-500 mb-1">Defense Script</p>
                <p className="text-md font-bold text-slate-800 leading-tight">“{o.exactWording}”</p>
                <button onClick={() => playAudioForText(o.exactWording, `obj-${i}`)} className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800">
                  <ICONS.Speaker className="w-4 h-4" /> Synthesize Audio
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence Index Table */}
      <section className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 opacity-5"><ICONS.Document className="w-96 h-96" /></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Master Traceability Index</h3>
              <h2 className="text-3xl font-black">Analysis Evidence Index</h2>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-2xl border border-white/10">
               <span className="text-indigo-300 font-black text-xl">{evidenceIndex.length}</span>
               <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Verified Document Links</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {evidenceIndex.map((ev, i) => (
              <div key={i} className="group bg-white/5 border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 hover:border-indigo-500/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[7px] font-black uppercase tracking-widest px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                    {ev.category}
                  </span>
                  <ICONS.Shield className="w-3 h-3 text-indigo-400 opacity-50" />
                </div>
                <p className="text-[11px] font-serif italic text-white/80 leading-relaxed mb-6 group-hover:text-white transition-colors">
                  “{ev.snippet.length > 150 ? ev.snippet.substring(0, 150) + '...' : ev.snippet}”
                </p>
                <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                   <div className="w-6 h-6 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                     <ICONS.Document className="w-3 h-3" />
                   </div>
                   <div className="overflow-hidden">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Found In</p>
                      <p className="text-[9px] font-bold text-white/60 truncate">{ev.source}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
