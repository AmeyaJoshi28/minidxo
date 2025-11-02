// beliefEngine.js.This file contains the core AI logic, system prompt, and the structured output schema for Claude.

import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config'; // For loading ANTHROPIC_API_KEY from .env file

// IMPORTANT: The key is loaded securely from the .env file.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- Core Schema (The AI's Output Contract) ---
const DXO_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        status: { type: "string", description: "Must be 'CONTINUING' or 'DIAGNOSIS_READY'." },
        reasoningUpdate: { type: "string", description: "Explanation of how the last user input affected the diagnostic process (i.e., ruling things in or out)." },
        nextQuestion: { type: "string", description: "The next targeted question for the user, or null if status is DIAGNOSIS_READY." },
        citationText: { type: "string", description: "A short, credible snippet of medical information (cite the source in citationSource)." },
        citationSource: { type: "string", description: "The source of the citation (e.g., Mayo Clinic, NIH). Must be non-null if citationText is provided." },
        diagnosis: {
            type: "object",
            properties: {
                name: { type: "string" },
                confidence: { type: "number", description: "Confidence score between 0 and 100." }
            }
        }
    },
    required: ["status", "reasoningUpdate", "nextQuestion", "citationText", "citationSource", "diagnosis"]
};

// --- Core System Instruction (The Diagnostic Protocol) ---
const DXO_SYSTEM_PROMPT = `You are the MiniDxO (AI Diagnostic Orchestrator). Your purpose is to simulate a transparent, step-by-step diagnostic process based on user-provided symptoms. You must strictly follow the output schema provided in the request.

Protocol:
1. Multi-Step Reasoning: Determine the next most critical question to narrow the possible diagnoses (Differential Diagnosis).
2. Transparency: Explain in 'reasoningUpdate' how the last user response informed your current belief.
3. Medical Text Referencing: Generate a 'citationText' and 'citationSource' based on relevant medical knowledge to support your current reasoning or the next question. Do NOT include search tools; generate the reference based on your internal knowledge, framed as a credible source (e.g., 'According to the CDC...').
4. Diagnosis: Only set 'status' to 'DIAGNOSIS_READY' when you have sufficient information to provide a probable diagnosis and confidence score.
5. Initial State: The first turn should ask for the user's main symptoms.`;


/**
 * Orchestrates the diagnostic step using the Claude API.
 * @param {Array<Object>} history - The conversation history.
 */
export async function runDiagnosticStep(history) {
    // History needs to be mapped to Claude's message format: [{ role: "user" | "assistant", content: "..." }]
    const messages = history.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user', // Map our internal roles to Claude's
        content: msg.text // Assuming 'text' holds the actual content
    }));
    
    // Add an initial prompt if the history is empty to kick off the conversation.
    if (messages.length === 0) {
        messages.push({ role: 'user', content: 'Begin the diagnostic interview. Ask for the primary symptoms.' });
    }
    
    try {
        const response = await anthropic.messages.create({
            // *** UPDATED MODEL FOR COST EFFICIENCY (Sonnet is cheaper than Opus) ***
            model: 'claude-3-sonnet-20240229', 
            max_tokens: 2048,
            system: DXO_SYSTEM_PROMPT,
            messages: messages,
            // Force JSON output
            response_format: { type: "json_object" },
            // Provide the schema to guide Claude's output
            temperature: 0.1 // Keep it low for deterministic, logical output
        });

        // Claude returns the content as an array of content blocks.
        const jsonText = response.content[0].text;
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error calling Anthropic API:", error);
        throw new Error("Failed to communicate with the Belief Engine. Check API key and network.");
    }
}
