/**
 * Function type for serializing data before sending over SSE
 */
export type SerializerFunction = (data: unknown) => string;

/**
 * Default serializer that converts data to JSON string
 * Returns the data as-is if it's already a string
 *
 * @param data - Data to serialize
 * @returns Serialized string
 */
export const serialize: SerializerFunction = (data: unknown): string => {
	if (typeof data === "string") {
		return data;
	}

	return JSON.stringify(data);
};
