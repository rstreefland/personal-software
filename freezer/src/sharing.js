import { validateSnapshot } from './store.js';
const MAX_BYTES = 4_000_000;

export async function encode(snapshot) {
  const json = JSON.stringify(validateSnapshot(snapshot));
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > MAX_BYTES) throw new Error('This freezer is too large for a link. Export a backup instead.');
  const compressed = typeof CompressionStream !== 'undefined';
  const stream = new Blob([bytes]).stream();
  const result = new Uint8Array(await new Response(compressed ? stream.pipeThrough(new CompressionStream('gzip')) : stream).arrayBuffer());
  let binary = '';
  for (const byte of result) binary += String.fromCharCode(byte);
  return `${compressed ? 'z' : 'j'}.${btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`;
}

export async function decode(payload) {
  if (payload.length > MAX_BYTES * 1.5 || !/^[zj]\.[\w-]+$/.test(payload)) throw new Error('This freezer link is incomplete or invalid.');
  const binary = atob(payload.slice(2).replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  let stream = new Blob([bytes]).stream();
  if (payload.startsWith('z.')) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open compressed links. Use a JSON backup instead.');
    stream = stream.pipeThrough(new DecompressionStream('gzip'));
  }
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_BYTES) {
      await reader.cancel();
      throw new Error('This freezer link is too large.');
    }
    chunks.push(value);
  }
  return validateSnapshot(JSON.parse(await new Blob(chunks).text()));
}

export async function readImport(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) return validateSnapshot(JSON.parse(trimmed));
  let payload = trimmed;
  if (!/^[zj]\./.test(payload)) {
    const url = new URL(trimmed);
    payload = new URLSearchParams(url.hash.slice(1)).get('freezer');
  }
  if (!payload) throw new Error('There is no freezer update in that link.');
  return decode(payload);
}
