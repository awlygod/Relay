require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });


async function triageFailure(task, errorMessage) {
  const prompt = `You are a triage system for a task execution engine.
A task has failed. Decide the best next action.

Task type: ${task.type}
Task payload: ${JSON.stringify(task.payload)}
Error message: ${errorMessage}
Current attempt: ${task.attempt_count} of ${task.max_attempts}

Respond ONLY with valid JSON, no markdown, no backticks, in this exact format:
{"decision": "retry" | "skip" | "escalate", "reasoning": "<one sentence why>"}

Guidance:
- "retry" for transient errors (timeouts, 5xx, network issues, rate limits)
- "skip" for errors that will never succeed (invalid payload, 404, bad input)
- "escalate" for errors that seem serious or unclear (auth failures, unexpected errors, security-related)`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!['retry', 'skip', 'escalate'].includes(parsed.decision)) {
      throw new Error(`Invalid decision value: ${parsed.decision}`);
    }
    return parsed;
  } catch (err) {
    console.error('[triage] Gemini call failed, defaulting to retry:', err.message);
    
    return { decision: 'retry', reasoning: 'Triage unavailable, defaulting to retry.' };
  }
}

module.exports = { triageFailure };