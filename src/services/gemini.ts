import { DecisionInput } from "../types";

export async function generateAnalysis(input: DecisionInput) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch decision analysis");
  }

  return response.json();
}
