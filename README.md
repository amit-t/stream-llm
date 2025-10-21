# stream-llm

> A modern, dependency-free TypeScript library for **Server-Sent Events (SSE)**, optimized for streaming LLM responses.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)

**Built for the AI era**, stream-llm makes it effortless to stream responses from OpenAI, Anthropic, or any LLM provider to your users in real-time.

## ✨ Highlights

- 🚀 **Zero Dependencies** - Lightweight and fast
- 🎯 **TypeScript-First** - Full type safety with native types
- 🔄 **Framework Agnostic** - Works with Express, Hono, Next.js, Bun, Deno, and more
- 🤖 **LLM-Optimized** - Perfect for streaming AI responses
- 📡 **SSE Compliant** - Follows the official Server-Sent Events specification
- 🔥 **Modern API** - Clean, intuitive developer experience
- 🎨 **Flexible** - Sessions, channels, batching, and streaming support

## 📦 Installation

```bash
pnpm add stream-llm
```

```bash
npm install stream-llm
```

```bash
bun add stream-llm
```

## 🚀 Quick Start

### Basic Usage (Express)

```typescript
import express from "express";
import { createSession } from "stream-llm";

const app = express();

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);
	
	// Push a simple message
	session.push("Hello, world!", "message");
	
	// Push structured data
	session.push({ text: "Hello!", timestamp: Date.now() }, "update");
});

app.listen(3000);
```

### Fetch API (Hono, Next.js, Bun, Deno)

```typescript
import { createResponse } from "stream-llm";

// Hono
app.get("/sse", (c) =>
	createResponse(c.req.raw, (session) => {
		session.push("Hello from Hono!", "message");
	})
);

// Next.js App Router
export async function GET(request: Request) {
	return createResponse(request, (session) => {
		session.push("Hello from Next.js!", "message");
	});
}

// Bun
Bun.serve({
	port: 3000,
	fetch(req) {
		if (new URL(req.url).pathname === "/sse") {
			return createResponse(req, (session) => {
				session.push("Hello from Bun!", "message");
			});
		}
		return new Response("Not found", { status: 404 });
	},
});
```

## 🤖 Streaming LLM Responses

### OpenAI Streaming

```typescript
import OpenAI from "openai";
import { createSession } from "stream-llm";

const openai = new OpenAI();

app.post("/chat", async (req, res) => {
	const session = await createSession(req, res);
	
	const stream = await openai.chat.completions.create({
		model: "gpt-4",
		messages: [{ role: "user", content: "Write a story" }],
		stream: true,
	});
	
	// Stream each chunk to the client
	for await (const chunk of stream) {
		const content = chunk.choices[0]?.delta?.content || "";
		if (content) {
			session.push(content, "llm-chunk");
		}
	}
	
	// Send completion signal
	session.push({ done: true }, "llm-done");
});
```

### Anthropic Streaming

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createSession } from "stream-llm";

const anthropic = new Anthropic();

app.post("/chat", async (req, res) => {
	const session = await createSession(req, res);
	
	const stream = await anthropic.messages.create({
		model: "claude-3-opus-20240229",
		max_tokens: 1024,
		messages: [{ role: "user", content: "Tell me a joke" }],
		stream: true,
	});
	
	for await (const event of stream) {
		if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
			session.push(event.delta.text, "llm-chunk");
		}
	}
	
	session.push({ done: true }, "llm-done");
});
```

### Using Node.js Streams

```typescript
import { Readable } from "stream";
import { createSession } from "stream-llm";

app.get("/stream", async (req, res) => {
	const session = await createSession(req, res);
	
	// Convert any stream to SSE events
	const stream = Readable.from(["Hello", " ", "World", "!"]);
	
	await session.stream(stream, {
		eventName: "data",
		transform: (chunk) => ({ text: chunk.toString() })
	});
});
```

## 📡 Client-Side Usage

```typescript
const eventSource = new EventSource("/sse");

// Listen for specific event types
eventSource.addEventListener("llm-chunk", (event) => {
	const chunk = JSON.parse(event.data);
	console.log("Received chunk:", chunk);
	
	// Update UI with streaming content
	document.getElementById("output").textContent += chunk;
});

eventSource.addEventListener("llm-done", (event) => {
	console.log("Stream complete!");
	eventSource.close();
});

// Handle errors
eventSource.onerror = (error) => {
	console.error("SSE error:", error);
	eventSource.close();
};
```

## 🎯 Advanced Features

### Channels (Broadcasting)

Send events to multiple clients simultaneously:

```typescript
import { createChannel, createSession } from "stream-llm";

const chatChannel = createChannel();

// Connect clients
app.get("/chat", async (req, res) => {
	const session = await createSession(req, res);
	chatChannel.register(session);
	
	// Notify others
	chatChannel.broadcast(
		{ user: req.query.user, action: "joined" },
		"user-event"
	);
});

// Broadcast to all connected clients
app.post("/send-message", (req, res) => {
	chatChannel.broadcast(
		{ user: req.body.user, message: req.body.message },
		"chat-message"
	);
	res.json({ success: true });
});
```

### Filtered Broadcasting

```typescript
// Broadcast only to specific sessions
chatChannel.broadcast(
	{ alert: "Admin announcement" },
	"admin-alert",
	{
		filter: (session) => session.state.isAdmin === true
	}
);
```

### Batching Events

Batch multiple events for efficient transmission:

```typescript
await session.batch(async (buffer) => {
	buffer.push("Event 1", "update");
	buffer.push("Event 2", "update");
	buffer.push("Event 3", "update");
	
	// Iterate over arrays
	await buffer.iterate([4, 5, 6], { eventName: "number" });
});
// All events sent together
```

### Iterating Over Data

```typescript
// Sync iterable
await session.iterate([1, 2, 3, 4, 5], {
	eventName: "number"
});

// Async generator
async function* generateData() {
	for (let i = 0; i < 10; i++) {
		await new Promise(resolve => setTimeout(resolve, 1000));
		yield { count: i, timestamp: Date.now() };
	}
}

await session.iterate(generateData(), {
	eventName: "tick"
});
```

### Custom State

Store session-specific data:

```typescript
interface UserState {
	userId: string;
	role: "admin" | "user";
}

app.get("/sse", async (req, res) => {
	const session = await createSession<UserState>(req, res, {
		state: {
			userId: req.query.userId as string,
			role: "user"
		}
	});
	
	// Access state later
	console.log(session.state.userId);
});
```

### Configuration Options

```typescript
const session = await createSession(req, res, {
	// Client reconnection time (default: 2000ms)
	retry: 3000,
	
	// Keep-alive interval (default: 10000ms)
	keepAlive: 5000,
	
	// Custom HTTP status code
	statusCode: 200,
	
	// Additional headers
	headers: {
		"X-Custom-Header": "value"
	},
	
	// Trust client's Last-Event-ID header
	trustClientEventId: true,
	
	// Custom serializer
	serializer: (data) => JSON.stringify(data),
	
	// Custom sanitizer
	sanitizer: (str) => str.replace(/\n/g, " ")
});
```

## 🎨 Real-World Examples

### AI Code Completion Stream

```typescript
app.post("/complete", async (req, res) => {
	const session = await createSession(req, res);
	const { prompt } = req.body;
	
	const completion = await openai.chat.completions.create({
		model: "gpt-4",
		messages: [{ role: "user", content: prompt }],
		stream: true,
	});
	
	let fullResponse = "";
	
	for await (const chunk of completion) {
		const content = chunk.choices[0]?.delta?.content || "";
		if (content) {
			fullResponse += content;
			session.push({
				chunk: content,
				fullText: fullResponse,
				tokens: chunk.usage?.total_tokens
			}, "completion");
		}
	}
	
	session.push({ done: true, fullText: fullResponse }, "done");
});
```

### Real-Time Notifications

```typescript
const notificationChannel = createChannel<{}, { userId: string }>();

// Subscribe to notifications
app.get("/notifications/:userId", async (req, res) => {
	const session = await createSession<{ userId: string }>(req, res, {
		state: { userId: req.params.userId }
	});
	
	notificationChannel.register(session);
});

// Send notification to specific user
function notifyUser(userId: string, message: string) {
	notificationChannel.broadcast(
		{ message, timestamp: Date.now() },
		"notification",
		{
			filter: (session) => session.state.userId === userId
		}
	);
}
```

### Progress Tracking

```typescript
app.post("/process", async (req, res) => {
	const session = await createSession(req, res);
	
	async function processWithProgress() {
		const steps = ["Initializing", "Processing", "Finalizing"];
		
		for (let i = 0; i < steps.length; i++) {
			session.push({
				step: steps[i],
				progress: ((i + 1) / steps.length) * 100,
				timestamp: Date.now()
			}, "progress");
			
			// Simulate work
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
		
		session.push({ done: true }, "complete");
	}
	
	processWithProgress();
});
```

## 🔧 API Reference

### `createSession(req, res, options?)`

Create a new SSE session.

**Parameters:**
- `req` - HTTP request (Node.js IncomingMessage or Fetch Request)
- `res` - HTTP response (Node.js ServerResponse or Fetch Response)
- `options` - Optional configuration

**Returns:** `Promise<Session>`

### `createResponse(request, callback)`

Create a Fetch Response with SSE session (for Fetch API environments).

**Parameters:**
- `request` - Fetch API Request object
- `callback` - Function called with connected session

**Returns:** `Response`

### `createChannel(options?)`

Create a new broadcast channel.

**Returns:** `Channel`

### Session Methods

- `session.push(data, eventName?, eventId?)` - Push an event
- `session.stream(stream, options?)` - Stream from Node.js Readable
- `session.iterate(iterable, options?)` - Iterate over sync/async iterable
- `session.batch(callback)` - Batch multiple events
- `session.getRequest()` - Get underlying Request object
- `session.getResponse()` - Get underlying Response object

### Channel Methods

- `channel.register(session)` - Register a session
- `channel.deregister(session)` - Deregister a session
- `channel.broadcast(data, eventName?, options?)` - Broadcast to all sessions
- `channel.activeSessions` - Get array of active sessions
- `channel.sessionCount` - Get count of registered sessions

## 🧪 Testing

```typescript
// Example test with supertest
import request from "supertest";

it("should stream SSE events", async () => {
	const response = await request(app)
		.get("/sse")
		.set("Accept", "text/event-stream");
	
	expect(response.status).toBe(200);
	expect(response.headers["content-type"]).toBe("text/event-stream");
});
```

## 📚 Why Server-Sent Events?

SSE is perfect for:
- ✅ **Streaming AI/LLM responses**
- ✅ Real-time updates from server to client
- ✅ Live notifications and feeds
- ✅ Progress tracking for long operations
- ✅ Live dashboards and metrics

**Advantages over WebSockets:**
- Simpler protocol (just HTTP)
- Automatic reconnection built-in
- Event IDs for reliability
- Better for server-to-client communication
- Works with existing HTTP infrastructure
- Lower resource usage

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Your Name]

## 🔗 Related

- [SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [OpenAI Streaming](https://platform.openai.com/docs/api-reference/streaming)
- [Anthropic Streaming](https://docs.anthropic.com/claude/reference/messages-streaming)

---

**Made with ❤️ for the TypeScript community**
