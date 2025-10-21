import {Session, type DefaultSessionState, type SessionOptions} from "./Session";
import {SseError} from "./utils/SseError";

/**
 * Create a Response object with an SSE session for Fetch API environments
 *
 * This is the recommended way to use SSE with Fetch API-based frameworks
 * like Hono, Next.js, or any modern edge runtime.
 *
 * The callback function is called once the session is connected and ready to push events.
 *
 * **Example (Hono):**
 * ```typescript
 * app.get("/sse", (c) =>
 *   createResponse(c.req.raw, (session) => {
 *     session.push("Hello from Hono!", "message");
 *   })
 * );
 * ```
 *
 * **Example (Next.js App Router):**
 * ```typescript
 * export async function GET(request: Request) {
 *   return createResponse(request, (session) => {
 *     session.push("Hello from Next.js!", "message");
 *   });
 * }
 * ```
 *
 * **Example (With options):**
 * ```typescript
 * return createResponse(
 *   request,
 *   {keepAlive: 5000, retry: 3000},
 *   (session) => {
 *     session.push("Configured session", "message");
 *   }
 * );
 * ```
 *
 * @param request - Fetch API Request object
 * @param response - Optional Fetch API Response object
 * @param options - Optional session options
 * @param callback - Function called with the connected session
 * @returns Response object with SSE stream
 */
export function createResponse<State = DefaultSessionState>(
	request: Request,
	response: Response,
	options: SessionOptions<State>,
	callback: (session: Session<State>) => void | Promise<void>
): Response;
export function createResponse<State = DefaultSessionState>(
	request: Request,
	response: Response,
	callback: (session: Session<State>) => void | Promise<void>
): Response;
export function createResponse<State = DefaultSessionState>(
	request: Request,
	options: SessionOptions<State>,
	callback: (session: Session<State>) => void | Promise<void>
): Response;
export function createResponse<State = DefaultSessionState>(
	request: Request,
	callback: (session: Session<State>) => void | Promise<void>
): Response;
export function createResponse<State = DefaultSessionState>(
	request: Request,
	responseOrOptionsOrCallback?:
		| Response
		| SessionOptions<State>
		| ((session: Session<State>) => void | Promise<void>),
	optionsOrCallback?:
		| SessionOptions<State>
		| ((session: Session<State>) => void | Promise<void>),
	callback?: (session: Session<State>) => void | Promise<void>
): Response {
	let givenResponse: Response | null = null;
	let givenOptions: SessionOptions<State> | undefined;
	let givenCallback:
		| ((session: Session<State>) => void | Promise<void>)
		| undefined;

	// Parse the different overload signatures
	if (typeof responseOrOptionsOrCallback === "function") {
		// createResponse(request, callback)
		givenCallback = responseOrOptionsOrCallback;
	} else if (responseOrOptionsOrCallback instanceof Response) {
		// createResponse(request, response, ...)
		givenResponse = responseOrOptionsOrCallback;

		if (typeof optionsOrCallback === "function") {
			// createResponse(request, response, callback)
			givenCallback = optionsOrCallback;
		} else {
			// createResponse(request, response, options, callback)
			givenOptions = optionsOrCallback;
			givenCallback = callback;
		}
	} else {
		// createResponse(request, options, callback)
		givenOptions = responseOrOptionsOrCallback;
		givenCallback = optionsOrCallback as
			| ((session: Session<State>) => void | Promise<void>)
			| undefined;
	}

	if (!givenCallback) {
		throw new SseError(
			"A callback function must be provided to createResponse."
		);
	}

	// Create the session
	const session = new Session<State>(request, givenResponse ?? undefined, givenOptions);

	// Call the callback once the session is connected
	session.once("connected", () => {
		Promise.resolve(givenCallback(session)).catch((error) => {
			console.error("Error in createResponse callback:", error);
		});
	});

	// Return the Response object
	return session.getResponse();
}
