/**
 * stream-llm - A modern TypeScript library for Server-Sent Events
 *
 * Optimized for streaming LLM responses, but flexible for any real-time use case.
 *
 * @packageDocumentation
 */

// Core classes
export {Session} from "./Session";
export type {
	SessionOptions,
	SessionEvents,
	DefaultSessionState,
} from "./Session";

export {Channel} from "./Channel";
export type {
	ChannelOptions,
	ChannelEvents,
	BroadcastOptions,
	DefaultChannelState,
} from "./Channel";

export {EventBuffer} from "./EventBuffer";
export type {EventBufferOptions} from "./EventBuffer";

// Factory functions (recommended API)
export {createSession} from "./createSession";
export {createChannel} from "./createChannel";
export {createResponse} from "./createResponse";
export {createEventBuffer} from "./createEventBuffer";

// Utilities
export {SseError} from "./utils/SseError";
export {TypedEmitter} from "./utils/TypedEmitter";
export type {EventMap} from "./utils/TypedEmitter";

export {serialize} from "./utils/serialize";
export type {SerializerFunction} from "./utils/serialize";

export {sanitize} from "./utils/sanitize";
export type {SanitizerFunction} from "./utils/sanitize";

export {applyHeaders} from "./utils/applyHeaders";

export {
	DEFAULT_RESPONSE_CODE,
	DEFAULT_REQUEST_METHOD,
	DEFAULT_REQUEST_HOST,
	DEFAULT_RESPONSE_HEADERS,
} from "./utils/constants";

// Connection adapters (advanced usage)
export type {Connection, ConnectionOptions} from "./adapters/Connection";
export {FetchConnection} from "./adapters/FetchConnection";
export {NodeHttp1Connection} from "./adapters/NodeHttp1Connection";
export {NodeHttp2CompatConnection} from "./adapters/NodeHttp2CompatConnection";
