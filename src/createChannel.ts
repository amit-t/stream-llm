import {Channel, type DefaultChannelState} from "./Channel";
import type {DefaultSessionState} from "./Session";

/**
 * Factory function to create a new Channel
 *
 * This is a convenience wrapper around the Channel constructor.
 *
 * **Example:**
 * ```typescript
 * const chatRoom = createChannel();
 *
 * app.get("/chat", async (req, res) => {
 *   const session = await createSession(req, res);
 *   chatRoom.register(session);
 * });
 *
 * // Broadcast to all connected sessions
 * chatRoom.broadcast({message: "Server is shutting down"}, "announcement");
 * ```
 *
 * **Example (With state):**
 * ```typescript
 * const channel = createChannel<{roomId: string}>({
 *   state: {roomId: "room-123"}
 * });
 * ```
 *
 * @param args - Constructor arguments for Channel
 * @returns New Channel instance
 */
export function createChannel<
	State = DefaultChannelState,
	SessionState = DefaultSessionState,
>(
	...args: ConstructorParameters<typeof Channel<State, SessionState>>
): Channel<State, SessionState> {
	return new Channel<State, SessionState>(...args);
}
