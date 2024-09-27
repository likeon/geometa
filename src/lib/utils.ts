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

const countryMap = new Map<string, string>([
	['NewZealand', 'New Zealand'],
	['AmericanSamoa', 'American Samoa'],
	['UnitedStates', 'United States'],
	['DominicanRepublic', 'Dominican Republic'],
	['USVirginIslands', 'US Virgin Islands'],
	['IsleOfMan', 'Isle Of Man'],
	['UnitedKingdom', 'United Kingdom'],
	['ChristmasIsland', 'Christmas Island'],
	['SriLanka', 'Sri Lanka'],
	['SouthKorea', 'South Korea'],
	['SouthAfrica', 'South Africa'],
	['PuertoRico', 'Puerto Rico']
]);

export function getCountryFromTagName(tagName: string) {
	const countryRaw = tagName.split('-')[0];
	return countryMap.get(countryRaw) || countryRaw;
}

export function cutToTwoDecimals(num: number): string {
	const fixed = num.toFixed(2);
	// Remove trailing zeros after the decimal point
	return fixed.replace(/\.?0+$/, '');
}
