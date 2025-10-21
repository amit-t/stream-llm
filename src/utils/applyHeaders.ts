/**
 * Apply headers from one source to another Headers object
 * Handles both string and string[] header values
 *
 * @param from - Source headers object
 * @param to - Target Headers object to apply headers to
 */
export function applyHeaders(
	from: Record<string, string | string[] | undefined>,
	to: Headers
): void {
	for (const [key, value] of Object.entries(from)) {
		if (value === undefined) {
			continue;
		}

		// Delete existing header first to ensure replacement not appending
		to.delete(key);

		if (Array.isArray(value)) {
			for (const v of value) {
				to.append(key, v);
			}
		} else {
			to.set(key, value);
		}
	}
}
