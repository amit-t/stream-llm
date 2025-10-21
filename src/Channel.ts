import type {DefaultSessionState, Session} from "./Session";
import {SseError} from "./utils/SseError";
import {type EventMap, TypedEmitter} from "./utils/TypedEmitter";

/**
 * Default channel state type
 */
export interface DefaultChannelState {
	[key: string]: unknown;
}

/**
 * Options for configuring a Channel
 */
export interface ChannelOptions<State = DefaultChannelState> {
	/**
	 * Custom state for this channel
	 * Use this to store channel-specific data
	 */
	state?: State;
}

/**
 * Options for broadcasting events
 */
export interface BroadcastOptions<SessionState = DefaultSessionState> {
	/**
	 * Unique ID for the event being broadcast
	 * If not provided, a UUID will be generated
	 */
	eventId?: string;

	/**
	 * Filter function to select which sessions receive the event
	 * Return true to send, false to skip
	 *
	 * @param session - Session to check
	 * @returns Whether this session should receive the event
	 */
	filter?: (session: Session<SessionState>) => boolean;
}

/**
 * Events emitted by a Channel
 */
export interface ChannelEvents<SessionState = DefaultSessionState>
	extends EventMap {
	/**
	 * Emitted when a session is registered with the channel
	 */
	"session-registered": (session: Session<SessionState>) => void;

	/**
	 * Emitted when a session is deregistered from the channel
	 */
	"session-deregistered": (session: Session<SessionState>) => void;

	/**
	 * Emitted when a registered session disconnects
	 */
	"session-disconnected": (session: Session<SessionState>) => void;

	/**
	 * Emitted when an event is broadcast to the channel
	 */
	broadcast: (data: unknown, eventName: string, eventId: string) => void;
}

/**
 * A Channel broadcasts events to multiple sessions simultaneously.
 *
 * **Core Concepts:**
 * - Register multiple sessions to receive broadcasts
 * - Send the same event to all registered sessions efficiently
 * - Filter which sessions receive specific broadcasts
 * - Automatically handle session disconnections
 *
 * **Example (Chat room):**
 * ```typescript
 * const chatRoom = createChannel();
 *
 * app.get("/chat/:room", async (req, res) => {
 *   const session = await createSession(req, res);
 *   chatRoom.register(session);
 *
 *   // When someone sends a message
 *   chatRoom.broadcast({user: "Alice", message: "Hello!"}, "chat-message");
 * });
 * ```
 *
 * **Example (Filtered broadcast):**
 * ```typescript
 * const notifications = createChannel<{userId: string}>();
 *
 * // Broadcast only to specific user
 * notifications.broadcast(
 *   {text: "You have a new message"},
 *   "notification",
 *   {
 *     filter: (session) => session.state.userId === "user-123"
 *   }
 * );
 * ```
 *
 * @template State - Type of custom channel state
 * @template SessionState - Type of session state for registered sessions
 */
export class Channel<
	State = DefaultChannelState,
	SessionState = DefaultSessionState,
> extends TypedEmitter<ChannelEvents<SessionState>> {
	/**
	 * Custom state for this channel
	 * Use this to store channel-specific data
	 */
	state: State;

	private sessions = new Set<Session<SessionState>>();

	constructor(options: ChannelOptions<State> = {}) {
		super();
		this.state = options.state ?? ({} as State);
	}

	/**
	 * Get a read-only array of all active sessions
	 *
	 * @returns Array of registered sessions
	 */
	get activeSessions(): ReadonlyArray<Session<SessionState>> {
		return Array.from(this.sessions);
	}

	/**
	 * Get the number of sessions registered with this channel
	 *
	 * @returns Session count
	 */
	get sessionCount(): number {
		return this.sessions.size;
	}

	/**
	 * Register a session to receive broadcasts from this channel
	 *
	 * **Example:**
	 * ```typescript
	 * const channel = createChannel();
	 * const session = await createSession(req, res);
	 *
	 * channel.register(session);
	 * channel.broadcast("Welcome!", "greeting");
	 * ```
	 *
	 * @param session - Session to register
	 * @returns This channel for chaining
	 * @throws {SseError} If session is not connected
	 */
	register(session: Session<SessionState>): this {
		if (this.sessions.has(session)) {
			return this;
		}

		if (!session.isConnected) {
			throw new SseError("Cannot register a non-active session.");
		}

		// Auto-deregister when session disconnects
		session.once("disconnected", () => {
			this.emit("session-disconnected", session);
			this.deregister(session);
		});

		this.sessions.add(session);
		this.emit("session-registered", session);

		return this;
	}

	/**
	 * Deregister a session so it no longer receives broadcasts
	 *
	 * @param session - Session to deregister
	 * @returns This channel for chaining
	 */
	deregister(session: Session<SessionState>): this {
		if (!this.sessions.has(session)) {
			return this;
		}

		this.sessions.delete(session);
		this.emit("session-deregistered", session);

		return this;
	}

	/**
	 * Broadcast an event to all registered sessions (or filtered subset)
	 *
	 * **Example (Simple broadcast):**
	 * ```typescript
	 * channel.broadcast({price: 100.50}, "price-update");
	 * ```
	 *
	 * **Example (Filtered broadcast):**
	 * ```typescript
	 * channel.broadcast(
	 *   {alert: "Server maintenance in 5 minutes"},
	 *   "alert",
	 *   {
	 *     filter: (session) => session.state.isAdmin === true
	 *   }
	 * );
	 * ```
	 *
	 * @param data - Data to broadcast
	 * @param eventName - Event type name (default: "message")
	 * @param options - Broadcast options (eventId, filter)
	 * @returns This channel for chaining
	 */
	broadcast = (
		data: unknown,
		eventName = "message",
		options: BroadcastOptions<SessionState> = {}
	): this => {
		const eventId = options.eventId ?? crypto.randomUUID();

		const sessions = options.filter
			? this.activeSessions.filter(options.filter)
			: this.sessions;

		for (const session of sessions) {
			session.push(data, eventName, eventId);
		}

		this.emit("broadcast", data, eventName, eventId);

		return this;
	};
}
