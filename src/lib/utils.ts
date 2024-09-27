export function generateRandomString(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
		''
	);
}

export async function extractJsonData(file: File): Promise<any> {
	try {
		// Read the file content as text
		const text = await file.text();

		// Parse the text as JSON
		const jsonData = JSON.parse(text);

		// Return or process the JSON data
		return jsonData;
	} catch (error) {
		// Handle errors (e.g., invalid JSON)
		console.error('Error parsing JSON:', error);
		throw error;
	}
}
