// Immutable changes let two offline copies merge without replacing one another.
export const CATEGORIES = ['Meals', 'Meat & fish', 'Fruit & veg', 'Bread & pastry', 'Other'];
const MAX_CHANGES = 20000;
const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s).toISOString().slice(0, 10) === s;
const text = (s, max) => typeof s === 'string' && s.length <= max;
const onlyKeys = (value, allowed) => Object.keys(value).every((key) => allowed.includes(key));

export function validateSnapshot(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.changes) || value.changes.length > MAX_CHANGES) throw new Error('This is not a supported freezer backup.');
  const ids = new Set();
  for (const c of value.changes) {
    if (!c || !text(c.id, 100) || !c.id || ids.has(c.id) || !text(c.itemId, 100) || !c.itemId || !Number.isSafeInteger(c.clock) || c.clock < 1) throw new Error('Invalid freezer change.');
    ids.add(c.id);
    const allowed = ['id', 'itemId', 'clock', 'kind', ...(c.kind === 'save' ? ['fields'] : c.kind === 'adjust' ? ['delta'] : [])];
    if (!onlyKeys(c, allowed)) throw new Error('Unknown freezer change fields.');
    if (c.kind === 'save') {
      const f = c.fields;
      if (!f || !onlyKeys(f, ['name', 'category', 'location', 'notes', 'frozen']) || !text(f.name, 80) || !f.name.trim() || !CATEGORIES.includes(f.category) || !text(f.location, 50) || !text(f.notes, 300) || !validDate(f.frozen)) throw new Error('Invalid food details.');
    } else if (c.kind === 'adjust') {
      if (!Number.isSafeInteger(c.delta) || !c.delta || Math.abs(c.delta) > 999) throw new Error('Invalid portion count.');
    } else if (c.kind !== 'delete') throw new Error('Unknown freezer change.');
  }
  return value;
}

export function merge(local, incoming) {
  validateSnapshot(local);
  validateSnapshot(incoming);
  const changes = new Map(local.changes.map((c) => [c.id, c]));
  for (const c of incoming.changes) {
    if (changes.has(c.id) && JSON.stringify(changes.get(c.id)) !== JSON.stringify(c)) throw new Error('Conflicting backup: the same change has different contents.');
    changes.set(c.id, c);
  }
  return validateSnapshot({ version: 1, changes: [...changes.values()].sort(compare) });
}

const compare = (a, b) => a.clock - b.clock || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export function inventory(snapshot) {
  const items = new Map();
  const deleted = new Set();
  for (const c of [...snapshot.changes].sort(compare)) {
    const item = items.get(c.itemId) || { id: c.itemId, portions: 0 };
    if (c.kind === 'delete') deleted.add(c.itemId);
    if (c.kind === 'save') Object.assign(item, c.fields);
    if (c.kind === 'adjust') item.portions += c.delta;
    items.set(c.itemId, item);
  }
  return [...items.values()].filter((i) => i.name && !deleted.has(i.id));
}

export function append(snapshot, changes, uuid = () => crypto.randomUUID()) {
  let clock = Math.max(0, ...snapshot.changes.map((c) => c.clock));
  return merge(snapshot, { version: 1, changes: changes.map((c) => ({ ...c, id: uuid(), clock: ++clock })) });
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysFrozen(date, now = today()) {
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(date)) / 86400000));
}
