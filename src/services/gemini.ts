import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisType, DecisionInput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateAnalysis(input: DecisionInput) {
  const model = "gemini-3-flash-preview";
  
  let prompt = "";
  let responseSchema: any = {};

  if (input.type === AnalysisType.PROS_CONS) {
    prompt = `Analyze the decision: "${input.topic}". Context: ${input.context || 'None'}. Provide a detailed list of pros and cons, and a final verdict.`;
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
        cons: { type: Type.ARRAY, items: { type: Type.STRING } },
        verdict: { type: Type.STRING }
      },
      required: ["pros", "cons", "verdict"]
    };
  } else if (input.type === AnalysisType.COMPARISON) {
    prompt = `Compare these options: ${input.options?.join(", ") || 'General options'} for the decision: "${input.topic}". Context: ${input.context || 'None'}. Provide a comparison table structure with headers and rows, and a final verdict.`;
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
        rows: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              // Dynamic properties based on headers
            },
            additionalProperties: { type: Type.STRING }
          } 
        },
        verdict: { type: Type.STRING }
      },
      required: ["headers", "rows", "verdict"]
    };
  } else if (input.type === AnalysisType.SWOT) {
    prompt = `Perform a SWOT analysis for the decision: "${input.topic}". Context: ${input.context || 'None'}. Provide strengths, weaknesses, opportunities, threats, and a final verdict.`;
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
        threats: { type: Type.ARRAY, items: { type: Type.STRING } },
        verdict: { type: Type.STRING }
      },
      required: ["strengths", "weaknesses", "opportunities", "threats", "verdict"]
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return JSON.parse(response.text);
}
