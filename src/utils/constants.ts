/**
 * Default HTTP status code for SSE responses
 */
export const DEFAULT_RESPONSE_CODE = 200;

/**
 * Default HTTP method for SSE requests
 */
export const DEFAULT_REQUEST_METHOD = "GET";

/**
 * Default host for SSE requests
 */
export const DEFAULT_REQUEST_HOST = "localhost";

/**
 * Default headers required for SSE responses
 */
export const DEFAULT_RESPONSE_HEADERS = new Headers({
	"Content-Type": "text/event-stream",
	"Cache-Control": "no-cache, no-transform",
	Connection: "keep-alive",
	"X-Accel-Buffering": "no",
});
