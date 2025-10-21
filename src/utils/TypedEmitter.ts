/**
 * Base interface for event maps
 */
export interface EventMap {
	[event: string]: (...args: never[]) => void;
}

/**
 * A type-safe event emitter implementation
 * Provides strongly-typed event handling without external dependencies
 */
export class TypedEmitter<Events extends EventMap> {
	private listeners = new Map<
		keyof Events,
		Set<(...args: Parameters<Events[keyof Events]>) => void>
	>();

	/**
	 * Register an event listener
	 *
	 * @param event - Event name
	 * @param listener - Event handler function
	 * @returns This emitter for chaining
	 */
	on<E extends keyof Events>(
		event: E,
		listener: Events[E]
	): this {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(listener as never);
		return this;
	}

	/**
	 * Register a one-time event listener that auto-removes after first call
	 *
	 * @param event - Event name
	 * @param listener - Event handler function
	 * @returns This emitter for chaining
	 */
	once<E extends keyof Events>(
		event: E,
		listener: Events[E]
	): this {
		const onceWrapper = ((...args: Parameters<Events[E]>) => {
			this.off(event, onceWrapper as Events[E]);
			listener(...args);
		}) as Events[E];

		return this.on(event, onceWrapper);
	}

	/**
	 * Remove an event listener
	 *
	 * @param event - Event name
	 * @param listener - Event handler function to remove
	 * @returns This emitter for chaining
	 */
	off<E extends keyof Events>(
		event: E,
		listener: Events[E]
	): this {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(listener as never);
			if (eventListeners.size === 0) {
				this.listeners.delete(event);
			}
		}
		return this;
	}

	/**
	 * Emit an event to all registered listeners
	 *
	 * @param event - Event name
	 * @param args - Arguments to pass to listeners
	 * @returns This emitter for chaining
	 */
	protected emit<E extends keyof Events>(
		event: E,
		...args: Parameters<Events[E]>
	): this {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			for (const listener of eventListeners) {
				// biome-ignore lint/suspicious/noExplicitAny: Type-safe spread requires any cast
				(listener as any)(...args);
			}
		}
		return this;
	}

	/**
	 * Remove all listeners for a specific event or all events
	 *
	 * @param event - Optional event name. If not provided, removes all listeners
	 * @returns This emitter for chaining
	 */
	removeAllListeners<E extends keyof Events>(event?: E): this {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
		return this;
	}

	/**
	 * Get the count of listeners for a specific event
	 *
	 * @param event - Event name
	 * @returns Number of listeners registered for the event
	 */
	listenerCount<E extends keyof Events>(event: E): number {
		return this.listeners.get(event)?.size ?? 0;
	}
}
