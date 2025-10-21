/**
 * Custom error class for SSE-related errors
 */
export class SseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SseError";
		Object.setPrototypeOf(this, SseError.prototype);
	}
}
