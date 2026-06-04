import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  // Initialize Gemini client with standard User-Agent header for telemetry
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Server-side analyze endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { topic, context, type, options } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const model = "gemini-3.5-flash";
      let prompt = "";
      let responseSchema: any = {};

      const commonProperties = {
        confidenceScore: { 
          type: Type.INTEGER, 
          description: "Overall confidence score (0 to 100) in this analysis and verdict, indicating the model's certainty given the provided context." 
        },
        successProbabilities: {
          type: Type.ARRAY,
          description: "An assessment of each proposed option/path's probability of success (0 to 100) along with a brief explanation.",
          items: {
            type: Type.OBJECT,
            properties: {
              option: { type: Type.STRING, description: "Name of the option or decision pathway (e.g. the specific alternative, or 'Proceed' vs 'Abort')" },
              probability: { type: Type.INTEGER, description: "Estimated probability of success as a percentage from 0 to 100" },
              rationale: { type: Type.STRING, description: "Short, 1-sentence rationale justifying this specific success probability assessment" }
            },
            required: ["option", "probability", "rationale"]
          }
        }
      };

      if (type === "PROS_CONS") {
        prompt = `Analyze the decision: "${topic}". Context: ${context || 'None'}. Provide a detailed, realistic, and highly thoughtful list of pros and cons, and a final verdict.
Please also calculate a confidence score for your recommendation and estimate the probability of success for each course of action (e.g., executing the decision/buying/moving forward vs. staying with the status quo or looking for alternatives).`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            verdict: { type: Type.STRING },
            ...commonProperties
          },
          required: ["pros", "cons", "verdict", "confidenceScore", "successProbabilities"]
        };
      } else if (type === "COMPARISON") {
        const optionList = options && Array.isArray(options) && options.length > 0 
          ? options.filter((o: string) => o.trim())
          : ["Option A", "Option B"];

        prompt = `Compare these options: ${optionList.join(", ")} for the decision: "${topic}". Context: ${context || 'None'}. Provide a comparison table structure with column headers (where the first header is "Aspect" or "Feature", and the subsequent headers correspond to the compared options), rows with comparison values for each option, and a final verdict.
Please also calculate a confidence score for your analysis and estimate the probability of success (0-100) for each of the compared options individually: ${optionList.join(', ')}.`;

        // Construct dynamic schema properties for rows to avoid empty Type.OBJECT error
        const rowProperties: Record<string, any> = {
          feature: { type: Type.STRING, description: "Aspect or feature being compared" }
        };

        const requiredFields = ["feature"];
        for (const opt of optionList) {
          rowProperties[opt] = { type: Type.STRING, description: `Comparison detail for ${opt}` };
          requiredFields.push(opt);
        }

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            rows: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: rowProperties,
                required: requiredFields
              } 
            },
            verdict: { type: Type.STRING },
            ...commonProperties
          },
          required: ["headers", "rows", "verdict", "confidenceScore", "successProbabilities"]
        };
      } else if (type === "SWOT") {
        prompt = `Perform a comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis for the decision: "${topic}". Context: ${context || 'None'}. Provide SWOT elements, and a final verdict.
Please also calculate a confidence score for your analysis and estimate the probability of success for each plausible path forward (e.g., taking the action/project vs. declining/avoiding).`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            threats: { type: Type.ARRAY, items: { type: Type.STRING } },
            verdict: { type: Type.STRING },
            ...commonProperties
          },
          required: ["strengths", "weaknesses", "opportunities", "threats", "verdict", "confidenceScore", "successProbabilities"]
        };
      } else {
        return res.status(400).json({ error: "Invalid analysis type" });
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema
        }
      });

      const resultText = response.text || "{}";
      const data = JSON.parse(resultText);
      res.json(data);
    } catch (error: any) {
      console.error("Gemini API error during analysis:", error);
      res.status(500).json({ error: error.message || "An error occurred during Gemini analysis" });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listener on Port 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`The Tiebreaker back-end server is running on port ${PORT}`);
  });
}

startServer();
