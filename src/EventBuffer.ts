import type {SanitizerFunction} from "./utils/sanitize";
import {sanitize as defaultSanitizer} from "./utils/sanitize";
import type {SerializerFunction} from "./utils/serialize";
import {serialize as defaultSerializer} from "./utils/serialize";

/**
 * Options for configuring an EventBuffer
 */
export interface EventBufferOptions {
	/**
	 * Function to serialize data before sending
	 * Default: JSON.stringify for objects, pass-through for strings
	 */
	serializer?: SerializerFunction;

	/**
	 * Function to sanitize data before sending
	 * Default: Replace newlines with spaces to maintain SSE format
	 */
	sanitizer?: SanitizerFunction;
}

/**
 * EventBuffer accumulates SSE events before they are sent to the client.
 * This allows for efficient batching of multiple events into a single write operation.
 *
 * SSE Event Format:
 * - Each event can have: data, event (type), id, retry, and comment fields
 * - Fields are separated by newlines
 * - Events are separated by double newlines
 * - Format: `field: value\n\n`
 */
export class EventBuffer {
	private buffer = "";
	private serialize: SerializerFunction;
	private sanitize: SanitizerFunction;

	constructor(options: EventBufferOptions = {}) {
		this.serialize = options.serializer ?? defaultSerializer;
		this.sanitize = options.sanitizer ?? defaultSanitizer;
	}

	/**
	 * Add an event to the buffer
	 *
	 * @param data - Event data to send
	 * @param eventName - Event type name (default: "message")
	 * @param eventId - Unique event identifier
	 * @returns This buffer for chaining
	 */
	push(data: unknown, eventName = "message", eventId = ""): this {
		// Serialize and sanitize the data
		const serialized = this.serialize(data);
		const sanitized = this.sanitize(serialized);

		// Add event ID if provided
		if (eventId) {
			this.buffer += `id: ${eventId}\n`;
		}

		// Add event name if not the default "message"
		if (eventName && eventName !== "message") {
			this.buffer += `event: ${eventName}\n`;
		}

		// Add the data field
		// For multi-line data, split and prefix each line with "data: "
		const lines = sanitized.split("\n");
		for (const line of lines) {
			this.buffer += `data: ${line}\n`;
		}

		// Add the trailing newline to complete the event
		this.buffer += "\n";

		return this;
	}

	/**
	 * Add a comment to the buffer
	 * Comments are used for keep-alive pings and are ignored by clients
	 *
	 * @param text - Comment text (optional)
	 * @returns This buffer for chaining
	 */
	comment(text = ""): this {
		this.buffer += `: ${text}\n\n`;
		return this;
	}

	/**
	 * Set the client reconnection time in milliseconds
	 *
	 * @param time - Reconnection time in milliseconds
	 * @returns This buffer for chaining
	 */
	retry(time: number): this {
		this.buffer += `retry: ${time}\n\n`;
		return this;
	}

	/**
	 * Mark the current buffer state for dispatching
	 * This is a semantic method for clarity in batch operations
	 *
	 * @returns This buffer for chaining
	 */
	dispatch(): this {
		// This is a no-op method that serves as a semantic marker
		// The actual dispatch happens when read() is called
		return this;
	}

	/**
	 * Read and return the current buffer contents
	 *
	 * @returns The accumulated buffer string
	 */
	read(): string {
		return this.buffer;
	}

	/**
	 * Clear the buffer contents
	 *
	 * @returns void
	 */
	clear(): void {
		this.buffer = "";
	}

	/**
	 * Iterate over an iterable or async iterable and push each value as an event
	 *
	 * @param iterable - Iterable or async iterable to consume
	 * @param options - Options for event naming
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
}
