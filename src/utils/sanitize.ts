/**
 * Function type for sanitizing data before sending over SSE
 */
export type SanitizerFunction = (data: string) => string;

/**
 * Sanitizes a string to be SSE-compliant by replacing problematic characters
 * - Replaces \r\n and \r with \n (normalize line endings)
 * - Replaces \n with space to prevent breaking SSE format
 *
 * @param data - String to sanitize
 * @returns Sanitized string
 */
export const sanitize: SanitizerFunction = (data: string): string => {
	return data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, " ");
};
