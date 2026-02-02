
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, MeetingContext, ThinkingLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const THINKING_LEVEL_MAP: Record<ThinkingLevel, number> = {
  'Minimal': 0,
  'Low': 4000,
  'Medium': 16000,
  'High': 32768
};

export async function performVisionOcr(base64Data: string, mimeType: string): Promise<string> {
  const modelName = 'gemini-3-pro-preview'; 
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { 
            text: `Act as a high-precision Cognitive OCR engine. 
            TRANSCRIPTION TASK: Extract ALL text from this image exactly as written. Maintain layout. Output ONLY text.` 
          },
        ],
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Vision OCR failed:", error);
    return "";
  }
}

export interface CognitiveSearchResult {
  answer: string;
  nuancedAnalysis: string; // New: Exhaustive detailed breakdown
  briefExplanation: string;
  articularSoundbite: string; 
  psychologicalProjection: {
    buyerFear: string;
    buyerIncentive: string;
    strategicLever: string;
  };
  secondOrderEffects: {
    impact: string;
    reasoning: string;
  }[]; // New: Nuanced business ripples
  tacticalRoadmap: {
    step: string;
    action: string;
    expectedOutcome: string;
  }[]; // New: Specific execution steps
  citations: { snippet: string; source: string; significance: string }[];
  reasoningChain: {
    painPoint: string;
    capability: string;
    strategicValue: string;
  };
}

/**
 * Ultra-High Density Cognitive Search using Gemini 3 Pro.
 * Optimized for maximum strategic depth and psychological granularity.
 */
export async function* performCognitiveSearchStream(
  question: string, 
  filesContent: string, 
  context: MeetingContext
): AsyncGenerator<string> {
  // Use Pro for intelligence inquiry to ensure maximum detail and reasoning quality
  const modelName = 'gemini-3-pro-preview';
  const styleDirectives = context.answerStyles.map(style => `- Create a section exactly titled "### ${style}"`).join('\n');

  const prompt = `MEETING INTELLIGENCE CONTEXT:
  - Seller: ${context.sellerNames} from ${context.sellerCompany}
  - Prospect: ${context.clientNames} from ${context.clientCompany} (Persona: ${context.persona})
  - Key Focus: ${context.meetingFocus}
  - Target Products: ${context.targetProducts}
  - Opportunity Snapshot: ${context.executiveSnapshot}
  - Semantic Anchors: ${context.strategicKeywords.join(', ')}

  INQUIRY: "${question}"

  TASK: 
  Synthesize an ultra-high-density, EXHAUSTIVE strategic response. Do not just summarize; perform "Deep-Tier Cognitive Synthesis"—connect disparate data points across all source files to map the "Invisible Architecture" of this deal.
  
  STRATEGIC REQUIREMENTS FOR EXTREME DETAIL:
  1. EVIDENCE-DENSE GROUNDING: Every claim must be tied to specific linguistic or data-driven evidence in the SOURCE DOCUMENTS. Use direct quotes where possible.
  2. PERSONA PSYCHOLOGY: Drill deep into the ${context.persona} mindset. What is the specific sub-text of their likely concerns based on the document tone?
  3. SECOND-ORDER THINKING: Identify the consequences of your suggested tactics. If we propose X, what happens to the client's stakeholder Y?
  4. ROADMAP: Provide a step-by-step tactical engagement sequence.

  OUTPUT STRUCTURE:
  ${styleDirectives}

  SOURCE DOCUMENTS:
  ${filesContent}

  JSON OUTPUT SCHEMA (MANDATORY):
  {
    "articularSoundbite": "A high-impact, verbatim-style hook (1 sentence).",
    "briefExplanation": "2-3 sentence executive context.",
    "answer": "The core strategic answer using the requested markdown headers.",
    "nuancedAnalysis": "A very long, exhaustive breakdown of the strategy, examining nuances, potential pitfalls, and hidden document clues (at least 4-5 paragraphs).",
    "psychologicalProjection": {
       "buyerFear": "Deep-tier fear analysis.",
       "buyerIncentive": "Professional win analysis.",
       "strategicLever": "The exact phrase to move the needle."
    },
    "secondOrderEffects": [
       {"impact": "Organizational shift", "reasoning": "Why this happens based on document clues"}
    ],
    "tacticalRoadmap": [
       {"step": "Step name", "action": "Specific words to say", "expectedOutcome": "Psychological result"}
    ],
    "citations": [{"snippet": "exact text", "source": "filename", "significance": "Why this piece of data matters for this specific answer"}],
    "reasoningChain": {
       "painPoint": "The core identified friction.",
       "capability": "Our specific solution component.",
       "strategicValue": "The net-new business outcome."
    }
  }`;

  const systemInstruction = `You are the "Cognitive AI Sales Strategy Architect". 
  You excel at identifying "Hidden Truths" in enterprise documents.
  
  PRINCIPLES OF DEPTH:
  - NEVER BE VAGUE: Use specific data from the documents.
  - BE EXHAUSTIVE: If a document mentions a metric, analyze its trend and implication for the person's ego or career.
  - THINK STEP-BY-STEP: Use your internal thinking budget to simulate the client's internal meeting where they would discuss this.
  
  Current Buyer Persona: ${context.persona}.
  Primary Goal: Provide "Unfair Intelligence" that makes the salesperson seem like they have been working at the client company for 10 years.`;

  try {
    const result = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        // Enable high-fidelity thinking for deep inquiry
        thinkingConfig: { thinkingBudget: THINKING_LEVEL_MAP[context.thinkingLevel] } 
      }
    });

    for await (const chunk of result) {
      yield chunk.text || "";
    }
  } catch (error) {
    console.error("Streaming search failed:", error);
    throw new Error("Search failed.");
  }
}

// Backward compatibility for non-streaming calls if needed
export async function performCognitiveSearch(
  question: string, 
  filesContent: string, 
  context: MeetingContext
): Promise<CognitiveSearchResult> {
  const stream = performCognitiveSearchStream(question, filesContent, context);
  let fullText = "";
  for await (const chunk of stream) {
    fullText += chunk;
  }
  return JSON.parse(fullText || "{}");
}

export async function generateDynamicSuggestions(filesContent: string, context: MeetingContext): Promise<string[]> {
  const modelName = 'gemini-3-flash-preview';
  const prompt = `Based on the provided document content and the ${context.persona} profile, suggest 3 highly strategic "wedge" questions that would uncover hidden budget or technical debt. Return as a JSON array of strings.`;
  const response = await ai.models.generateContent({ 
    model: modelName, 
    contents: prompt, 
    config: { 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 }
    } 
  });
  return JSON.parse(response.text || "[]");
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export async function generateExplanation(question: string, context: AnalysisResult): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Explain the strategy behind: "${question}" based on the buyer snapshot: ${JSON.stringify(context.snapshot)}. Focus on how it mitigates the buyer's fear and aligns with their priority of ${context.snapshot.priorities[0]?.text}.`,
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });
  return response.text || "";
}

export async function generatePitchAudio(text: string, voiceName: string = 'Kore'): Promise<Uint8Array | null> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio ? decode(base64Audio) : null;
}

export async function analyzeSalesContext(filesContent: string, context: MeetingContext): Promise<AnalysisResult> {
  const modelName = 'gemini-3-pro-preview';
  const citationSchema = {
    type: Type.OBJECT,
    properties: { snippet: { type: Type.STRING }, sourceFile: { type: Type.STRING } },
    required: ["snippet", "sourceFile"],
  };

  const competitorSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      overview: { type: Type.STRING },
      threatProfile: { type: Type.STRING, description: "Direct, Indirect, or Niche" },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      ourWedge: { type: Type.STRING },
      citation: citationSchema
    },
    required: ["name", "overview", "threatProfile", "strengths", "weaknesses", "ourWedge", "citation"]
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      snapshot: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          roleCitation: citationSchema,
          priorities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, citation: citationSchema }, required: ["text", "citation"] } },
          likelyObjections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, citation: citationSchema }, required: ["text", "citation"] } },
          decisionStyle: { type: Type.STRING },
          decisionStyleCitation: citationSchema,
          riskTolerance: { type: Type.STRING },
          riskToleranceCitation: citationSchema,
          tone: { type: Type.STRING },
          metrics: {
            type: Type.OBJECT,
            properties: {
              riskToleranceValue: { type: Type.NUMBER },
              strategicPriorityFocus: { type: Type.NUMBER },
              analyticalDepth: { type: Type.NUMBER },
              directness: { type: Type.NUMBER },
              innovationAppetite: { type: Type.NUMBER }
            },
            required: ["riskToleranceValue", "strategicPriorityFocus", "analyticalDepth", "directness", "innovationAppetite"]
          },
          personaIdentity: { type: Type.STRING },
          decisionLogic: { type: Type.STRING }
        },
        required: ["role", "roleCitation", "priorities", "likelyObjections", "decisionStyle", "decisionStyleCitation", "riskTolerance", "riskToleranceCitation", "tone", "metrics", "personaIdentity", "decisionLogic"],
      },
      documentInsights: {
        type: Type.OBJECT,
        properties: {
          entities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, context: { type: Type.STRING }, citation: citationSchema }, required: ["name", "type", "context", "citation"] } },
          structure: { type: Type.OBJECT, properties: { sections: { type: Type.ARRAY, items: { type: Type.STRING } }, keyHeadings: { type: Type.ARRAY, items: { type: Type.STRING } }, detectedTablesSummary: { type: Type.STRING } }, required: ["sections", "keyHeadings", "detectedTablesSummary"] },
          summaries: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fileName: { type: Type.STRING }, summary: { type: Type.STRING }, strategicImpact: { type: Type.STRING }, criticalInsights: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["fileName", "summary", "strategicImpact", "criticalInsights"] } },
          materialSynthesis: { type: Type.STRING }
        },
        required: ["entities", "structure", "summaries", "materialSynthesis"]
      },
      groundMatrix: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "e.g. Operational, Financial, Strategic" },
            observation: { type: Type.STRING },
            significance: { type: Type.STRING },
            evidence: citationSchema
          },
          required: ["category", "observation", "significance", "evidence"]
        }
      },
      competitiveHub: {
        type: Type.OBJECT,
        properties: {
          cognigy: competitorSchema,
          amelia: competitorSchema,
          others: { type: Type.ARRAY, items: competitorSchema }
        },
        required: ["cognigy", "amelia", "others"]
      },
      openingLines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, label: { type: Type.STRING }, citation: citationSchema }, required: ["text", "label", "citation"] } },
      predictedQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { customerAsks: { type: Type.STRING }, salespersonShouldRespond: { type: Type.STRING }, reasoning: { type: Type.STRING }, category: { type: Type.STRING }, citation: citationSchema }, required: ["customerAsks", "salespersonShouldRespond", "reasoning", "category", "citation"] } },
      strategicQuestionsToAsk: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, whyItMatters: { type: Type.STRING }, citation: citationSchema }, required: ["question", "whyItMatters", "citation"] } },
      objectionHandling: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { objection: { type: Type.STRING }, realMeaning: { type: Type.STRING }, strategy: { type: Type.STRING }, exactWording: { type: Type.STRING }, citation: citationSchema }, required: ["objection", "realMeaning", "strategy", "exactWording", "citation"] } },
      toneGuidance: { type: Type.OBJECT, properties: { wordsToUse: { type: Type.ARRAY, items: { type: Type.STRING } }, wordsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } }, sentenceLength: { type: Type.STRING }, technicalDepth: { type: Type.STRING } }, required: ["wordsToUse", "wordsToAvoid", "sentenceLength", "technicalDepth"] },
      finalCoaching: { type: Type.OBJECT, properties: { dos: { type: Type.ARRAY, items: { type: Type.STRING } }, donts: { type: Type.ARRAY, items: { type: Type.STRING } }, finalAdvice: { type: Type.STRING } }, required: ["dos", "donts", "finalAdvice"] },
      reportSections: {
        type: Type.OBJECT,
        properties: {
          introBackground: { type: Type.STRING },
          technicalDiscussion: { type: Type.STRING },
          productIntegration: { type: Type.STRING }
        },
        required: ["introBackground", "technicalDiscussion", "productIntegration"]
      }
    },
    required: ["snapshot", "documentInsights", "groundMatrix", "competitiveHub", "openingLines", "predictedQuestions", "strategicQuestionsToAsk", "objectionHandling", "toneGuidance", "finalCoaching", "reportSections"]
  };

  const prompt = `Synthesize high-fidelity cognitive sales intelligence for ${context.clientCompany}. 
  
  COMPETITIVE INTELLIGENCE HUB TASK:
  Analyze threat profiles for Cognigy and Amelia based on document clues. Identify the exact "Psychological Wedge" to use against each.
  
  COGNITIVE GROUND MATRIX TASK:
  Extract exactly 5 foundational truths directly from the documents that prove we are the right choice for ${context.targetProducts}.
  
  PSYCHOLOGY TASK:
  Provide 0-100 values for: Risk Tolerance, Strategic Priority Focus, Analytical Depth, Directness, Innovation Appetite.
  
  --- SOURCE --- 
  ${filesContent}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: `You are the Lead Cognitive Sales Strategist. Provide grounded intelligence in JSON. Focus on identifying unspoken objections and mapping them to source evidence.`,
        responseMimeType: "application/json",
        responseSchema,
        temperature: context.temperature,
        thinkingConfig: { thinkingBudget: THINKING_LEVEL_MAP[context.thinkingLevel] }
      },
    });
    return JSON.parse(response.text || "{}") as AnalysisResult;
  } catch (error: any) { throw new Error(`Analysis Failed: ${error.message}`); }
}
