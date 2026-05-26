export async function hashWithSalt(value: string, salt: string, iteration: number = 10000, keyLength: number = 256): Promise<string> {
	const encoder = new TextEncoder();
	const valueBuffer = encoder.encode(value);
	const saltBuffer = encoder.encode(salt);
	const keyMaterial = await crypto.subtle.importKey('raw', valueBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: saltBuffer,
			iterations: iteration,
			hash: 'SHA-256',
		},
		keyMaterial,
		keyLength,
	);
	const hashArray = Array.from(new Uint8Array(derivedBits));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function ramdonValue() {
	return (function () {
		const a = new Uint32Array(1);
		return crypto.getRandomValues(a);
	})()[0].toString(16);
}
