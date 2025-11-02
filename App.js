// src/App.js

import React, { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline'; // Using the standard import for a simple example
import './App.css'; // You'll need to create this for styling

// --- Custom Component for Chat Bubbles ---
const ChatBubble = ({ role, text, citation, source, reasoning, diagnosis }) => (
    <div className={`chat-bubble ${role}`}>
        <div className="message-content">
            {text && <p className="text">{text}</p>}
            
            {/* Display Transparency/Reasoning for AI responses */}
            {role === 'ai' && (
                <div className="ai-details">
                    {reasoning && (
                        <p className="reasoning">
                            **Reasoning Update:** {reasoning}
                        </p>
                    )}
                    {citation && (
                        <blockquote className="citation">
                            "{citation}" <cite>— {source}</cite>
                        </blockquote>
                    )}
                    {diagnosis && (
                        <div className="diagnosis-box">
                            ### ⚕️ Probable Diagnosis:
                            <p className="diagnosis-name">
                                **{diagnosis.name}**
                            </p>
                            <p className="confidence">
                                Confidence: **{diagnosis.confidence}%**
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
);


// --- Main Application Component ---
function App() {
    const [history, setHistory] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial load: Start the diagnostic interview
    useEffect(() => {
        if (history.length === 0) {
            handleSendMessage('Begin the diagnostic interview. Ask for the primary symptoms.', 'system');
        }
    }, []);

    // Scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    // Function to call the backend API
    const runDiagnosticStep = async (newHistory) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3001/diagnose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: newHistory }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const dxoResponse = await response.json();
            
            // Construct the structured AI message
            const aiMessage = {
                role: 'ai',
                text: dxoResponse.nextQuestion || `**DIAGNOSIS:** ${dxoResponse.diagnosis.name}`,
                reasoning: dxoResponse.reasoningUpdate,
                citation: dxoResponse.citationText,
                source: dxoResponse.citationSource,
                diagnosis: dxoResponse.status === 'DIAGNOSIS_READY' ? dxoResponse.diagnosis : null,
            };

            setHistory(currentHistory => [...currentHistory, aiMessage]);

        } catch (error) {
            console.error("Error fetching diagnosis:", error);
            const errorMessage = {
                role: 'ai',
                text: "Sorry, the diagnostic engine failed. Please check the backend server.",
                reasoning: "System error.",
                citation: "Error",
                source: "System"
            };
            setHistory(currentHistory => [...currentHistory, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handler for sending messages
    const handleSendMessage = (text, role = 'user') => {
        if (!text.trim() && role === 'user') return;

        const newMessage = { role, text };
        
        // Use a functional update to ensure we use the latest state
        setHistory(currentHistory => {
            const newHistory = [...currentHistory, newMessage];
            if (role !== 'system') { // Don't call API on the initial 'system' message
                runDiagnosticStep(newHistory);
            }
            return newHistory;
        });

        setUserInput(''); // Clear input box after sending
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    return (
        <div className="app-container">
            {/* Spline Component as a background or side element */}
            <div className="spline-visual">
                <Spline scene="https://prod.spline.design/0clKQMTgPlXnJTPv/scene.splinecode" />
            </div>

            <div className="chat-interface">
                <header className="chat-header">
                    <h1>MiniDxO 🧠</h1>
                    <p>The Transparent AI Diagnostician</p>
                </header>

                <div className="chat-window">
                    {history.map((msg, index) => (
                        <ChatBubble 
                            key={index} 
                            role={msg.role} 
                            text={msg.text}
                            reasoning={msg.reasoning}
                            citation={msg.citation}
                            source={msg.source}
                            diagnosis={msg.diagnosis}
                        />
                    ))}
                    <div ref={messagesEndRef} /> {/* Scroll target */}
                    {isLoading && <ChatBubble role="ai" text="MiniDxO is thinking..." />}
                </div>

                <form onSubmit={handleSubmit} className="input-form">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={isLoading ? "Please wait..." : "Describe your symptoms or answer the question..."}
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading}>Send</button>
                </form>
            </div>
        </div>
    );
}

export default App;