import {applyHeaders} from "../utils/applyHeaders";
import {
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../utils/constants";
import type {Connection, ConnectionOptions} from "./Connection";

/**
 * Connection adapter for the Fetch API
 * Works with modern runtimes (Bun, Deno, modern Node.js, browsers)
 */
export class FetchConnection implements Connection {
	private static encoder = new TextEncoder();
	private writer: WritableStreamDefaultWriter<Uint8Array>;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		request: Request,
		response: Response | null,
		options: ConnectionOptions = {}
	) {
		this.url = new URL(request.url);
		this.request = request;

		// Create a TransformStream for writing SSE data
		const {readable, writable} = new TransformStream<Uint8Array>();
		this.writer = writable.getWriter();

		// Create the response with appropriate headers
		this.response = new Response(readable, {
			status: options.statusCode ?? response?.status ?? DEFAULT_RESPONSE_CODE,
			headers: new Headers(DEFAULT_RESPONSE_HEADERS),
		});

		// Apply any headers from the provided response
		if (response) {
			const headers: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				headers[key] = value;
			});
			applyHeaders(headers, this.response.headers);
		}
	}

	/**
	 * No-op for Fetch API as headers are sent when Response is created
	 */
	sendHead = (): void => {
		// noop - headers are already set in constructor
	};

	/**
	 * Encode and write a chunk of data to the stream
	 *
	 * @param chunk - String data to send
	 */
	sendChunk = (chunk: string): void => {
		const encoded = FetchConnection.encoder.encode(chunk);
		this.writer.write(encoded);
	};

	/**
	 * Close the writer stream
	 */
	cleanup = (): void => {
		this.writer.close();
	};
}
