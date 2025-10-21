import {
	IncomingMessage as Http1ServerRequest,
	ServerResponse as Http1ServerResponse,
} from "node:http";
import {Http2ServerRequest, Http2ServerResponse} from "node:http2";
import {setImmediate} from "node:timers";
import {Readable} from "node:stream";
import {EventBuffer, type EventBufferOptions} from "./EventBuffer";
import type {Connection} from "./adapters/Connection";
import {FetchConnection} from "./adapters/FetchConnection";
import {NodeHttp1Connection} from "./adapters/NodeHttp1Connection";
import {NodeHttp2CompatConnection} from "./adapters/NodeHttp2CompatConnection";
import {SseError} from "./utils/SseError";
import {type EventMap, TypedEmitter} from "./utils/TypedEmitter";
import {applyHeaders} from "./utils/applyHeaders";
import {
	type SanitizerFunction,
	sanitize as defaultSanitizer,
} from "./utils/sanitize";
import {
	type SerializerFunction,
	serialize as defaultSerializer,
} from "./utils/serialize";

/**
 * Default session state type
 */
export interface DefaultSessionState {
	[key: string]: unknown;
}

/**
 * Options for configuring a Session
 */
export interface SessionOptions<State = DefaultSessionState>
	extends Pick<EventBufferOptions, "serializer" | "sanitizer"> {
	/**
	 * Whether to trust the last event ID given by the client
	 * in the `Last-Event-ID` request header.
	 *
	 * When false, lastId starts as an empty string.
	 * Default: true
	 */
	trustClientEventId?: boolean;

	/**
	 * Time in milliseconds for the client to wait before reconnecting
	 * if the connection is closed.
	 *
	 * Set to null to disable sending an explicit reconnection time.
	 * Default: 2000ms
	 */
	retry?: number | null;

	/**
	 * Time in milliseconds for sending keep-alive comments
	 * to prevent connection timeouts.
	 *
	 * Set to null to disable keep-alive.
	 * Default: 10000ms (10 seconds)
	 */
	keepAlive?: number | null;

	/**
	 * HTTP status code to send to the client
	 * Default: 200
	 */
	statusCode?: number;

	/**
	 * Additional HTTP headers to include in the response
	 */
	headers?: Record<string, string | string[] | undefined>;

	/**
	 * Custom state object for storing session-specific data
	 */
	state?: State;
}

/**
 * Events emitted by a Session
 */
export interface SessionEvents extends EventMap {
	/**
	 * Emitted when the session has connected and is ready to send events
	 */
	connected: () => void;

	/**
	 * Emitted when the session has been disconnected
	 */
	disconnected: () => void;

	/**
	 * Emitted when an event is pushed to the client
	 */
	push: (data: unknown, eventName: string, eventId: string) => void;
}

/**
 * A Session represents an open SSE connection between server and client.
 *
 * **Core Concepts:**
 * - Push events to a single connected client
 * - Stream data from iterables or Node.js streams
 * - Batch multiple events for efficient transmission
 * - Automatically handle keep-alive and reconnection
 *
 * **Example (Express):**
 * ```typescript
 * app.get("/sse", async (req, res) => {
 *   const session = await createSession(req, res);
 *   session.push("Hello!", "message");
 * });
 * ```
 *
 * **Example (Fetch API/Hono):**
 * ```typescript
 * app.get("/sse", (c) =>
 *   createResponse(c.req.raw, (session) => {
 *     session.push("Hello!", "message");
 *   })
 * );
 * ```
 *
 * @template State - Type of custom state object
 */
export class Session<State = DefaultSessionState> extends TypedEmitter<SessionEvents> {
	/**
	 * The last event ID sent to the client
	 * @readonly
	 */
	lastId = "";

	/**
	 * Whether the session is currently connected
	 * @readonly
	 */
	isConnected = false;

	/**
	 * Custom state for this session
	 * Use this to store user-specific or session-specific data
	 */
	state: State;

	private buffer: EventBuffer;
	private connection: Connection;
	private sanitize: SanitizerFunction;
	private serialize: SerializerFunction;
	private initialRetry: number | null;
	private keepAliveInterval: number | null;
	private keepAliveTimer?: ReturnType<typeof setInterval>;

	constructor(
		req: Http1ServerRequest,
		res: Http1ServerResponse,
		options?: SessionOptions<State>
	);
	constructor(
		req: Http2ServerRequest,
		res: Http2ServerResponse,
		options?: SessionOptions<State>
	);
	constructor(req: Request, res?: Response, options?: SessionOptions<State>);
	constructor(req: Request, options?: SessionOptions<State>);
	constructor(
		req: Http1ServerRequest | Http2ServerRequest | Request,
		res?:
			| Http1ServerResponse
			| Http2ServerResponse
			| Response
			| SessionOptions<State>,
		options?: SessionOptions<State>
	) {
		super();

		let givenOptions = options ?? {};

		// Handle different constructor signatures
		if (req instanceof Request) {
			let givenRes: Response | null = null;

			if (res) {
				if (res instanceof Response) {
					givenRes = res;
				} else {
					if (options) {
						throw new SseError(
							"When providing a Fetch Request object but no Response object, " +
								"you may pass options as the second OR third argument " +
								"to the session constructor, but not to both."
						);
					}
					givenOptions = res;
				}
			}

			this.connection = new FetchConnection(req, givenRes, givenOptions);
		} else if (req instanceof Http1ServerRequest) {
			if (res instanceof Http1ServerResponse) {
				this.connection = new NodeHttp1Connection(req, res, givenOptions);
			} else {
				throw new SseError(
					"When providing a Node IncomingMessage object, " +
						"a corresponding ServerResponse object must also be provided."
				);
			}
		} else if (req instanceof Http2ServerRequest) {
			if (res instanceof Http2ServerResponse) {
				this.connection = new NodeHttp2CompatConnection(req, res, givenOptions);
			} else {
				throw new SseError(
					"When providing a Node HTTP2ServerRequest object, " +
						"a corresponding HTTP2ServerResponse object must also be provided."
				);
			}
		} else {
			throw new SseError(
				"Malformed request or response objects given to session constructor. " +
					"Must be one of IncomingMessage/ServerResponse from the Node HTTP/1 API, " +
					"HTTP2ServerRequest/HTTP2ServerResponse from the Node HTTP/2 Compatibility API, " +
					"or Request/Response from the Fetch API."
			);
		}

		// Apply custom headers if provided
		if (givenOptions.headers) {
			applyHeaders(givenOptions.headers, this.connection.response.headers);
		}

		// Initialize lastId from client's Last-Event-ID header if trusted
		if (givenOptions.trustClientEventId !== false) {
			this.lastId =
				this.connection.request.headers.get("last-event-id") ??
				this.connection.url.searchParams.get("lastEventId") ??
				this.connection.url.searchParams.get("evs_last_event_id") ??
				"";
		}

		this.state = givenOptions.state ?? ({} as State);

		this.initialRetry =
			givenOptions.retry === null ? null : (givenOptions.retry ?? 2000);

		this.keepAliveInterval =
			givenOptions.keepAlive === null
				? null
				: (givenOptions.keepAlive ?? 10000);

		this.serialize = givenOptions.serializer ?? defaultSerializer;
		this.sanitize = givenOptions.sanitizer ?? defaultSanitizer;

		this.buffer = new EventBuffer({
			serializer: this.serialize,
			sanitizer: this.sanitize,
		});

		// Listen for connection abort/close
		this.connection.request.signal.addEventListener(
			"abort",
			this.onDisconnected
		);

		// Initialize connection on next tick
		setImmediate(this.initialize);
	}

	/**
	 * Initialize the connection and send initial setup
	 */
	private initialize = (): void => {
		this.connection.sendHead();

		// Handle polyfill padding requirements
		if (this.connection.url.searchParams.has("padding")) {
			this.buffer.comment(" ".repeat(2049)).dispatch();
		}

		if (this.connection.url.searchParams.has("evs_preamble")) {
			this.buffer.comment(" ".repeat(2056)).dispatch();
		}

		// Send initial retry time if configured
		if (this.initialRetry !== null) {
			this.buffer.retry(this.initialRetry).dispatch();
		}

		this.flush();

		// Start keep-alive timer if configured
		if (this.keepAliveInterval !== null) {
			this.keepAliveTimer = setInterval(this.keepAlive, this.keepAliveInterval);
		}

		this.isConnected = true;
		this.emit("connected");
	};

	/**
	 * Handle disconnection cleanup
	 */
	private onDisconnected = (): void => {
		this.connection.request.signal.removeEventListener(
			"abort",
			this.onDisconnected
		);

		this.connection.cleanup();

		if (this.keepAliveTimer) {
			clearInterval(this.keepAliveTimer);
		}

		this.isConnected = false;
		this.emit("disconnected");
	};

	/**
	 * Send keep-alive comment to maintain connection
	 */
	private keepAlive = (): void => {
		this.buffer.comment().dispatch();
		this.flush();
	};

	/**
	 * Flush the buffer to the client
	 */
	private flush = (): void => {
		const contents = this.buffer.read();
		this.buffer.clear();
		this.connection.sendChunk(contents);
	};

	/**
	 * Get the underlying Fetch API Request object
	 *
	 * @returns The Request object
	 */
	getRequest = (): Request => this.connection.request;

	/**
	 * Get the underlying Fetch API Response object
	 *
	 * @returns The Response object
	 */
	getResponse = (): Response => this.connection.response;

	/**
	 * Push an event to the client
	 *
	 * **Example:**
	 * ```typescript
	 * // Simple message
	 * session.push("Hello world!");
	 *
	 * // Custom event type
	 * session.push({text: "Hello"}, "chat-message");
	 *
	 * // With custom event ID
	 * session.push(data, "update", "update-123");
	 * ```
	 *
	 * @param data - Data to send (will be JSON serialized if not a string)
	 * @param eventName - Event type name (default: "message")
	 * @param eventId - Unique event ID (default: auto-generated UUID)
	 * @returns This session for chaining
	 * @throws {SseError} If session is not connected
	 */
	push = (
		data: unknown,
		eventName = "message",
		eventId: string = crypto.randomUUID()
	): this => {
		if (!this.isConnected) {
			throw new SseError(
				"Cannot push data to a non-active session. " +
					"Ensure the session is connected before attempting to push events. " +
					"If using the Fetch API, the response stream " +
					"must begin being consumed before the session is considered connected."
			);
		}

		this.buffer.push(data, eventName, eventId);
		this.flush();

		this.lastId = eventId;
		this.emit("push", data, eventName, eventId);

		return this;
	};

	/**
	 * Stream data from a Node.js Readable stream as SSE events
	 *
	 * **Example (Streaming LLM response):**
	 * ```typescript
	 * const stream = await openai.chat.completions.create({
	 *   model: "gpt-4",
	 *   messages: [{role: "user", content: "Hello"}],
	 *   stream: true,
	 * });
	 *
	 * await session.stream(stream, {
	 *   eventName: "llm-chunk",
	 *   transform: (chunk) => chunk.choices[0]?.delta?.content || ""
	 * });
	 * ```
	 *
	 * @param stream - Readable stream to consume
	 * @param options - Streaming options
	 * @returns Promise that resolves when stream ends or rejects on error
	 */
	async stream(
		stream: Readable,
		options: {
			eventName?: string;
			eventIdPrefix?: string;
			transform?: (chunk: unknown) => unknown;
		} = {}
	): Promise<boolean> {
		const {eventName = "stream", eventIdPrefix = "", transform} = options;
		let index = 0;

		return new Promise((resolve, reject) => {
			stream.on("data", (chunk: unknown) => {
				try {
					const data = transform ? transform(chunk) : chunk;
					const eventId = eventIdPrefix
						? `${eventIdPrefix}-${index}`
						: crypto.randomUUID();

					this.push(data, eventName, eventId);
					index++;
				} catch (error) {
					reject(error);
				}
			});

			stream.on("end", () => resolve(true));
			stream.on("error", (error) => reject(error));
		});
	}

	/**
	 * Iterate over sync or async iterable and send each value as an event
	 *
	 * **Example (Streaming array):**
	 * ```typescript
	 * await session.iterate([1, 2, 3, 4, 5], {
	 *   eventName: "number"
	 * });
	 * ```
	 *
	 * **Example (Async generator):**
	 * ```typescript
	 * async function* generateUpdates() {
	 *   for (let i = 0; i < 10; i++) {
	 *     await sleep(1000);
	 *     yield {count: i, timestamp: Date.now()};
	 *   }
	 * }
	 *
	 * await session.iterate(generateUpdates());
	 * ```
	 *
	 * @param iterable - Sync or async iterable to consume
	 * @param options - Iteration options
	 * @returns Promise that resolves when iteration completes
	 */
	async iterate(
		iterable: Iterable<unknown> | AsyncIterable<unknown>,
		options: {eventName?: string; eventIdPrefix?: string} = {}
	): Promise<void> {
		const {eventName = "message", eventIdPrefix = ""} = options;
		let index = 0;

		if (Symbol.asyncIterator in iterable) {
			for await (const value of iterable) {
				const eventId = eventIdPrefix
					? `${eventIdPrefix}-${index}`
					: crypto.randomUUID();
				this.push(value, eventName, eventId);
				index++;
			}
		} else {
			for (const value of iterable as Iterable<unknown>) {
				const eventId = eventIdPrefix
					? `${eventIdPrefix}-${index}`
					: crypto.randomUUID();
				this.push(value, eventName, eventId);
				index++;
			}
		}
	}

	/**
	 * Execute a batch of events efficiently
	 * Accumulates events in memory before flushing all at once
	 *
	 * **Example:**
	 * ```typescript
	 * await session.batch(async (buffer) => {
	 *   buffer.push("Event 1");
	 *   buffer.push("Event 2");
	 *   buffer.push("Event 3");
	 *   await buffer.iterate([4, 5, 6]);
	 * });
	 * ```
	 *
	 * @param callback - Function that receives the buffer and adds events
	 * @returns Promise that resolves when batch is complete
	 */
	async batch(
		callback: (buffer: EventBuffer) => void | Promise<void>
	): Promise<void> {
		await callback(this.buffer);
		this.flush();
	}
}
