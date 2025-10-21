import type {Http2ServerRequest, Http2ServerResponse} from "node:http2";
import {applyHeaders} from "../utils/applyHeaders";
import {
	DEFAULT_REQUEST_HOST,
	DEFAULT_REQUEST_METHOD,
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../utils/constants";
import type {Connection, ConnectionOptions} from "./Connection";

/**
 * Connection adapter for Node.js HTTP/2 Compatibility API
 * Works with Node.js HTTP/2 servers using the compatibility mode
 */
export class NodeHttp2CompatConnection implements Connection {
	private controller: AbortController;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		private req: Http2ServerRequest,
		private res: Http2ServerResponse,
		options: ConnectionOptions = {}
	) {
		// Build the URL from the request
		this.url = new URL(
			`http://${req.headers.host ?? DEFAULT_REQUEST_HOST}${req.url}`
		);

		// Create AbortController for connection lifecycle management
		this.controller = new AbortController();

		// Listen for connection close events
		req.once("close", this.onClose);
		res.once("close", this.onClose);

		// Create a Fetch API Request object from Node HTTP/2 request
		this.request = new Request(this.url, {
			method: req.method ?? DEFAULT_REQUEST_METHOD,
			signal: this.controller.signal,
		});

		// Filter out HTTP/2 pseudo-headers (starting with ':')
		const allowedHeaders = {...req.headers};
		for (const header of Object.keys(allowedHeaders)) {
			if (header.startsWith(":")) {
				delete allowedHeaders[header];
			}
		}

		// Copy filtered headers to Fetch Request
		applyHeaders(allowedHeaders, this.request.headers);

		// Create a Fetch API Response object
		this.response = new Response(null, {
			status: options.statusCode ?? res.statusCode ?? DEFAULT_RESPONSE_CODE,
			headers: new Headers(DEFAULT_RESPONSE_HEADERS),
		});

		// Copy existing response headers if any
		if (res) {
			applyHeaders(
				res.getHeaders() as Record<string, string | string[] | undefined>,
				this.response.headers
			);
		}
	}

	/**
	 * Handle connection close event
	 */
	private onClose = (): void => {
		this.controller.abort();
	};

	/**
	 * Send the response head with status code and headers
	 */
	sendHead = (): void => {
		const headers: Record<string, string> = {};
		this.response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		this.res.writeHead(this.response.status, headers);
	};

	/**
	 * Write a chunk of data to the response stream
	 *
	 * @param chunk - String data to send
	 */
	sendChunk = (chunk: string): void => {
		this.res.write(chunk);
	};

	/**
	 * Clean up event listeners
	 */
	cleanup = (): void => {
		this.req.removeListener("close", this.onClose);
		this.res.removeListener("close", this.onClose);
	};
}
