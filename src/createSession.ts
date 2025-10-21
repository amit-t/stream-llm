import {Session, type DefaultSessionState} from "./Session";

/**
 * Factory function to create a new Session
 *
 * This is a convenience wrapper around the Session constructor that provides
 * better ergonomics and type inference.
 *
 * **Example (Node.js/Express):**
 * ```typescript
 * app.get("/sse", async (req, res) => {
 *   const session = await createSession(req, res);
 *   session.push("Hello!", "message");
 * });
 * ```
 *
 * **Example (Fetch API):**
 * ```typescript
 * const session = await createSession(request);
 * return session.getResponse();
 * ```
 *
 * @param args - Constructor arguments for Session
 * @returns Promise that resolves with the connected Session
 */
export async function createSession<State = DefaultSessionState>(
	...args: ConstructorParameters<typeof Session<State>>
): Promise<Session<State>> {
	const session = new Session<State>(...args);

	// Wait for the session to connect before resolving
	if (!session.isConnected) {
		await new Promise<void>((resolve) => {
			session.once("connected", () => resolve());
		});
	}

	return session;
}
