/**
 * Example: Streaming OpenAI responses with stream-llm
 *
 * This example demonstrates how to stream responses from OpenAI's GPT models
 * to clients in real-time using Server-Sent Events.
 */

import express from "express";
import OpenAI from "openai";
import {createSession} from "../src/index";

const app = express();
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/chat
 *
 * Stream a chat completion response from OpenAI
 *
 * Body: { message: string }
 */
app.post("/api/chat", async (req, res) => {
	const {message} = req.body;

	if (!message) {
		return res.status(400).json({error: "Message is required"});
	}

	try {
		const session = await createSession(req, res);

		// Send initial status
		session.push({status: "connecting"}, "status");

		// Create streaming completion
		const stream = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [{role: "user", content: message}],
			stream: true,
		});

		let fullResponse = "";

		// Stream each chunk to the client
		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || "";

			if (content) {
				fullResponse += content;

				session.push(
					{
						chunk: content,
						fullText: fullResponse,
					},
					"llm-chunk"
				);
			}
		}

		// Send completion signal
		session.push(
			{
				done: true,
				fullText: fullResponse,
			},
			"llm-done"
		);
	} catch (error) {
		console.error("Error streaming OpenAI response:", error);
		res.status(500).json({error: "Failed to stream response"});
	}
});

/**
 * Serve a simple HTML client for testing
 */
app.get("/", (_req, res) => {
	res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>OpenAI Streaming Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        #output {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            min-height: 200px;
            background: #f9f9f9;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        #input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 10px;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        #status {
            margin: 10px 0;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>🤖 OpenAI Streaming Demo</h1>
    <p>Ask a question and watch the AI response stream in real-time!</p>
    
    <textarea id="input" rows="3" placeholder="Type your message here..."></textarea>
    <button id="sendBtn" onclick="sendMessage()">Send Message</button>
    
    <div id="status"></div>
    <div id="output"></div>

    <script>
        let eventSource = null;

        async function sendMessage() {
            const input = document.getElementById('input');
            const output = document.getElementById('output');
            const status = document.getElementById('status');
            const sendBtn = document.getElementById('sendBtn');
            const message = input.value.trim();

            if (!message) {
                alert('Please enter a message');
                return;
            }

            // Disable input
            sendBtn.disabled = true;
            output.textContent = '';
            status.textContent = 'Connecting to AI...';

            try {
                // Send POST request to start streaming
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message }),
                });

                if (!response.ok) {
                    throw new Error('Failed to start stream');
                }

                // Close existing connection if any
                if (eventSource) {
                    eventSource.close();
                }

                // Note: In a real implementation, you'd need to handle SSE differently
                // This is a simplified example
                status.textContent = 'Receiving response...';

            } catch (error) {
                console.error('Error:', error);
                status.textContent = 'Error: ' + error.message;
                sendBtn.disabled = false;
            }
        }

        // Handle Enter key in textarea
        document.getElementById('input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
	console.log(`📝 Open the URL in your browser to test the streaming`);
});
