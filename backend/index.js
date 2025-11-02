// index.js. The entry point for the server, setting up the API endpoint.

import express from 'express';
import cors from 'cors';
import { runDiagnosticStep } from './beliefEngine.js';

const app = express();
const port = 3001; // Use a high port to avoid conflicts

// Middleware
app.use(cors()); // Allow frontend to call this endpoint
app.use(express.json()); // To parse JSON bodies

// --- Diagnostic Endpoint ---
app.post('/diagnose', async (req, res) => {
    // The request body should contain the chat history: { history: [{ role: 'user'|'ai', text: '...' }] }
    const { history } = req.body;
    
    if (!history) {
        return res.status(400).json({ error: "Missing 'history' in request body." });
    }

    console.log(`Received diagnostic request with ${history.length} messages.`);
    
    try {
        const dxoResponse = await runDiagnosticStep(history);
        
        // Respond with the structured JSON from the belief engine
        res.json(dxoResponse);
        
    } catch (error) {
        console.error("Endpoint Error:", error.message);
        res.status(500).json({ 
            error: "Diagnostic Engine Failure", 
            detail: error.message 
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`MiniDxO Backend running at http://localhost:${port}`);
    // NOTE: You must set up a .env file with ANTHROPIC_API_KEY='your-key-here' 
    // and run 'npm install' then 'node index.js' to start the server.
});
