/**
 * Room Code Generator
 * 
 * Generates unique 6-character alphanumeric room codes for matches
 */

/**
 * Generate a random 6-character room code
 * Format: XXXYYY (3 letters + 3 numbers for better readability)
 */
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O to avoid confusion with 1, 0
  const numbers = '23456789'; // Removed 0, 1 to avoid confusion with O, I
  
  let code = '';
  
  // Generate 3 letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // Generate 3 numbers
  for (let i = 0; i < 3; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return code;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(code: string): boolean {
  // Should be exactly 6 characters: 3 letters + 3 numbers
  return /^[A-Z]{3}[2-9]{3}$/.test(code);
}

/**
 * Format room code for display (with a hyphen for readability)
 * Example: ABC123 -> ABC-123
 */
export function formatRoomCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

