# Examples

This directory contains working examples demonstrating various features of stream-llm.

## 📁 Examples

### 1. `simple-demo.ts`

Basic SSE concepts including:
- Countdown streaming
- Iterating over data
- Real-time ticker with channels
- Batch events

**Run it:**
```bash
pnpm install
pnpm build
cd examples
npx tsx simple-demo.ts
```

Open `http://localhost:3000` in your browser.

### 2. `openai-streaming.ts`

Stream responses from OpenAI's GPT models in real-time.

**Setup:**
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY="your-key-here"
   ```

**Run it:**
```bash
cd examples
npx tsx openai-streaming.ts
```

Open `http://localhost:3000` and ask questions!

## 🔧 Prerequisites

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build
```

## 💡 Key Concepts Demonstrated

### Sessions
Individual SSE connections to clients. Use for one-to-one streaming.

### Channels
Broadcast to multiple sessions simultaneously. Perfect for:
- Chat rooms
- Live tickers
- Real-time notifications

### Batching
Group multiple events together for efficient transmission.

### Iterables
Stream arrays or async generators as SSE events.

## 🌐 Client-Side

All examples include built-in HTML clients. The browser's native `EventSource` API is used:

```javascript
const eventSource = new EventSource('/endpoint');

eventSource.addEventListener('event-name', (e) => {
  const data = JSON.parse(e.data);
  console.log(data);
});

eventSource.addEventListener('error', () => {
  eventSource.close();
});
```

## 🚀 Production Tips

1. **Error Handling**: Always handle errors and close connections properly
2. **Keep-Alive**: The library sends automatic keep-alive pings (configurable)
3. **Reconnection**: Clients automatically reconnect with exponential backoff
4. **Event IDs**: Use for deduplication and resuming from last received event
5. **Filtering**: Use channel filters to target specific sessions

## 📚 Learn More

See the main [README.md](../README.md) for full API documentation and more examples.
