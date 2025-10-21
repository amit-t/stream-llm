/**
 * Example: Simple SSE streaming demo
 *
 * This example shows basic SSE functionality with countdown, tickers,
 * and iterables - perfect for understanding the core concepts.
 */

import express from "express";
import {createSession, createChannel} from "../src/index";

const app = express();

// Create a channel for broadcasting
const tickerChannel = createChannel();

/**
 * GET /countdown
 *
 * Stream a countdown from 10 to 0
 */
app.get("/countdown", async (req, res) => {
	const session = await createSession(req, res);

	// Stream countdown
	for (let i = 10; i >= 0; i--) {
		session.push({count: i, message: i === 0 ? "Liftoff! 🚀" : `${i}...`}, "countdown");

		// Wait 1 second between counts
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	// Send completion
	session.push({done: true}, "complete");
});

/**
 * GET /iterate
 *
 * Demonstrate iterating over data
 */
app.get("/iterate", async (req, res) => {
	const session = await createSession(req, res);

	// Iterate over an array
	const fruits = ["🍎 Apple", "🍌 Banana", "🍇 Grapes", "🍓 Strawberry"];
	await session.iterate(fruits, {eventName: "fruit"});

	// Iterate with an async generator
	async function* generateNumbers() {
		for (let i = 1; i <= 5; i++) {
			await new Promise((resolve) => setTimeout(resolve, 500));
			yield {number: i, squared: i * i};
		}
	}

	await session.iterate(generateNumbers(), {eventName: "number"});

	session.push({done: true}, "complete");
});

/**
 * GET /ticker
 *
 * Subscribe to a real-time ticker channel
 */
app.get("/ticker", async (req, res) => {
	const session = await createSession(req, res);

	// Register this session with the ticker channel
	tickerChannel.register(session);

	session.push({status: "subscribed"}, "status");
});

/**
 * GET /batch
 *
 * Demonstrate batching multiple events
 */
app.get("/batch", async (req, res) => {
	const session = await createSession(req, res);

	// Batch multiple events together
	await session.batch(async (buffer) => {
		buffer.push({type: "info", message: "Starting batch"}, "log");
		buffer.push({type: "data", value: 100}, "data");
		buffer.push({type: "data", value: 200}, "data");
		buffer.push({type: "data", value: 300}, "data");
		buffer.push({type: "info", message: "Batch complete"}, "log");
	});

	session.push({done: true}, "complete");
});

// Broadcast ticker updates every 2 seconds
setInterval(() => {
	const price = (Math.random() * 100 + 50).toFixed(2);
	const change = (Math.random() * 10 - 5).toFixed(2);

	tickerChannel.broadcast(
		{
			symbol: "DEMO",
			price: parseFloat(price),
			change: parseFloat(change),
			timestamp: Date.now(),
		},
		"ticker-update"
	);
}, 2000);

/**
 * Serve a simple HTML client for testing
 */
app.get("/", (_req, res) => {
	res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>SSE Streaming Demo</title>
    <style>
        body {
            font-family: monospace;
            max-width: 1200px;
            margin: 50px auto;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .demo {
            border: 1px solid #444;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #252526;
        }
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #1177bb;
        }
        .output {
            border: 1px solid #444;
            border-radius: 4px;
            padding: 15px;
            min-height: 100px;
            background: #1e1e1e;
            margin-top: 10px;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
        }
        h1 { color: #4ec9b0; }
        h2 { color: #569cd6; }
    </style>
</head>
<body>
    <h1>🌊 SSE Streaming Demos</h1>
    
    <div class="demo">
        <h2>⏱️ Countdown</h2>
        <button onclick="startCountdown()">Start Countdown</button>
        <div id="countdown-output" class="output">Click button to start...</div>
    </div>
    
    <div class="demo">
        <h2>🔄 Iterate Data</h2>
        <button onclick="startIterate()">Start Iteration</button>
        <div id="iterate-output" class="output">Click button to start...</div>
    </div>
    
    <div class="demo">
        <h2>📊 Live Ticker</h2>
        <button onclick="startTicker()">Subscribe to Ticker</button>
        <button onclick="stopTicker()">Stop Ticker</button>
        <div id="ticker-output" class="output">Click button to subscribe...</div>
    </div>
    
    <div class="demo">
        <h2>📦 Batch Events</h2>
        <button onclick="startBatch()">Send Batch</button>
        <div id="batch-output" class="output">Click button to start...</div>
    </div>

    <script>
        let tickerSource = null;

        function startCountdown() {
            const output = document.getElementById('countdown-output');
            output.textContent = 'Connecting...\\n';
            
            const eventSource = new EventSource('/countdown');
            
            eventSource.addEventListener('countdown', (e) => {
                const data = JSON.parse(e.data);
                output.textContent += data.message + '\\n';
            });
            
            eventSource.addEventListener('complete', () => {
                output.textContent += '\\n✅ Complete!';
                eventSource.close();
            });
        }

        function startIterate() {
            const output = document.getElementById('iterate-output');
            output.textContent = 'Connecting...\\n';
            
            const eventSource = new EventSource('/iterate');
            
            eventSource.addEventListener('fruit', (e) => {
                output.textContent += 'Fruit: ' + e.data + '\\n';
            });
            
            eventSource.addEventListener('number', (e) => {
                const data = JSON.parse(e.data);
                output.textContent += \`Number: \${data.number} → Squared: \${data.squared}\\n\`;
            });
            
            eventSource.addEventListener('complete', () => {
                output.textContent += '\\n✅ Complete!';
                eventSource.close();
            });
        }

        function startTicker() {
            const output = document.getElementById('ticker-output');
            output.textContent = 'Connecting to ticker...\\n';
            
            if (tickerSource) {
                tickerSource.close();
            }
            
            tickerSource = new EventSource('/ticker');
            
            tickerSource.addEventListener('status', (e) => {
                const data = JSON.parse(e.data);
                output.textContent += \`Status: \${data.status}\\n\\n\`;
            });
            
            tickerSource.addEventListener('ticker-update', (e) => {
                const data = JSON.parse(e.data);
                const changeSymbol = data.change >= 0 ? '📈' : '📉';
                output.textContent += \`\${changeSymbol} \${data.symbol}: $\${data.price} (\${data.change > 0 ? '+' : ''}\${data.change})\\n\`;
            });
        }

        function stopTicker() {
            if (tickerSource) {
                tickerSource.close();
                tickerSource = null;
                document.getElementById('ticker-output').textContent += '\\n⏸️ Stopped';
            }
        }

        function startBatch() {
            const output = document.getElementById('batch-output');
            output.textContent = 'Connecting...\\n';
            
            const eventSource = new EventSource('/batch');
            
            eventSource.addEventListener('log', (e) => {
                const data = JSON.parse(e.data);
                output.textContent += \`[LOG] \${data.message}\\n\`;
            });
            
            eventSource.addEventListener('data', (e) => {
                const data = JSON.parse(e.data);
                output.textContent += \`[DATA] Value: \${data.value}\\n\`;
            });
            
            eventSource.addEventListener('complete', () => {
                output.textContent += '\\n✅ Complete!';
                eventSource.close();
            });
        }
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
	console.log(`📝 Open the URL in your browser to test SSE streaming`);
});
