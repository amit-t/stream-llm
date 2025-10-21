import type {SessionOptions} from "../Session";

/**
 * Represents the full request and response of an underlying network connection,
 * abstracting away the differences between the Node HTTP API and the Fetch API.
 *
 * This interface allows the Session class to work uniformly across different
 * runtime environments (Node.js, Bun, Deno, browsers, etc.)
 */
export interface Connection {
	/**
	 * The URL of the request
	 */
	url: URL;

	/**
	 * The request object (Fetch API Request)
	 */
	request: Request;

	/**
	 * The response object (Fetch API Response)
	 */
	response: Response;

	/**
	 * Send the response head with status code and headers
	 * For Fetch API, this is a no-op as headers are sent when the Response is created
	 */
	sendHead: () => void;

	/**
	 * Write a chunk of data to the connection, encoding to UTF-8 if needed
	 *
	 * @param chunk - Data chunk to send
	 */
	sendChunk: (chunk: string) => void;

	/**
	 * Perform any necessary cleanup after the connection is closed
	 */
	cleanup(): void;
}

/**
 * Options for creating a Connection
 */
export interface ConnectionOptions
	extends Partial<Pick<SessionOptions, "statusCode">> {}
