export function cuid(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz012345";
  let id = "c";
  for (let i = 0; i < 23; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    id += alphabet[idx];
  }
  return id;
}

export function iso(d: Date | string | number): string {
  return new Date(d).toISOString();
}


