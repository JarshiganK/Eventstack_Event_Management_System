// Generate a unique ID that looks like "c" followed by random characters
export function cuid(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz012345";
  let id = "c";
  for (let i = 0; i < 23; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    id += alphabet[idx];
  }
  return id;
}

// Convert any date-like value to ISO string format (like "2024-01-15T10:30:00.000Z")
export function iso(d: Date | string | number): string {
  return new Date(d).toISOString();
}


