import {EventBuffer, type EventBufferOptions} from "./EventBuffer";

/**
 * Factory function to create a new EventBuffer
 *
 * EventBuffers are useful for batching events before sending them
 * or for building custom SSE streaming logic.
 *
 * **Example:**
 * ```typescript
 * const buffer = createEventBuffer();
 * buffer.push("Event 1");
 * buffer.push("Event 2");
 * buffer.push("Event 3");
 *
 * const events = buffer.read();
 * // Send events to client...
 * buffer.clear();
 * ```
 *
 * @param options - Optional buffer configuration
 * @returns New EventBuffer instance
 */
export function createEventBuffer(
	options?: EventBufferOptions
): EventBuffer {
	return new EventBuffer(options);
}
