import { CATEGORIES, append, daysFrozen, inventory, merge, today, validateSnapshot } from './store.js';
import { encode, readImport } from './sharing.js';

const $ = (selector) => document.querySelector(selector);
const KEY = 'freezer.inventory.v1';
let state = { version: 1, changes: [] };
let storageFailed = false;
let category = 'All';
let editing = null;
let formSnapshot = null;
let toastTimer;
let preparedLink = '';
let linkVersion = '';
let saveChannel;
try { saveChannel = new BroadcastChannel('freezer'); } catch {}

function toast(message, undo) {
  clearTimeout(toastTimer);
  const node = $('#toast');
  node.replaceChildren(document.createTextNode(message));
  if (undo) {
    const button = document.createElement('button');
    button.textContent = 'Undo';
    button.onclick = () => { try { undo(); node.hidden = true; } catch (e) { toast(e.message); } };
    node.append(button);
  }
  node.hidden = false;
  toastTimer = setTimeout(() => { node.hidden = true; }, undo ? 10000 : 6000);
}

try {
  const saved = localStorage.getItem(KEY);
  if (saved) state = validateSnapshot(JSON.parse(saved));
} catch {
  storageFailed = true;
  toast('Your saved inventory could not be read. Editing is disabled to protect it. Export a backup to recover the saved data.');
}

// Serialize writers across tabs where Web Locks is available.
async function commit(makeNext) {
  const write = () => {
    if (storageFailed) throw new Error('Device storage is unavailable. Your existing data has been kept.');
    const latest = localStorage.getItem(KEY);
    const base = latest ? merge(state, validateSnapshot(JSON.parse(latest))) : state;
    const next = makeNext(base);
    localStorage.setItem(KEY, JSON.stringify(next)); // Only update the UI after storage succeeds.
    state = next;
    saveChannel?.postMessage('changed');
    render();
  };
  if (navigator.locks) await navigator.locks.request(KEY, write);
  else write();
}

function resync() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) state = merge(state, validateSnapshot(JSON.parse(saved)));
    render();
  } catch { toast('Could not read changes from another tab. Please export a backup.'); }
}
window.addEventListener('storage', (e) => { if (e.key === KEY) resync(); });
if (saveChannel) saveChannel.onmessage = resync;

const dateLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

for (const name of ['All', ...CATEGORIES]) {
  const button = make('button', '', name);
  button.setAttribute('aria-pressed', String(name === category));
  button.onclick = () => { category = name; render(); };
  $('#filters').append(button);
}
for (const name of CATEGORIES) {
  const option = make('option', '', name);
  $('#category-select').append(option);
}

function render() {
  const all = inventory(state);
  const stocked = all.filter((i) => i.portions > 0);
  $('#portion-count').textContent = stocked.reduce((sum, i) => sum + i.portions, 0);
  $('#item-count').textContent = stocked.length;
  $('#save-status').textContent = storageFailed ? 'Storage unavailable' : 'Saved on this device';
  $('#offline-status').textContent = navigator.onLine ? '' : 'Offline · changes stay on this phone';
  const oldest = [...stocked].sort((a, b) => a.frozen.localeCompare(b.frozen))[0];
  $('#use-next').hidden = !oldest;
  if (oldest) {
    $('#next-name').textContent = oldest.name;
    $('#next-detail').textContent = `Frozen ${dateLabel(oldest.frozen)}${oldest.location ? ` · ${oldest.location}` : ''}. Oldest in your freezer.`;
    $('#next-use').onclick = () => adjust(oldest.id, -1);
  }
  const query = $('#search').value.trim().toLowerCase();
  const visible = all.filter((i) => (i.portions !== 0 || $('#show-empty').checked) && (category === 'All' || i.category === category) && `${i.name} ${i.notes} ${i.location}`.toLowerCase().includes(query));
  const sort = $('#sort').value;
  visible.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'newest' ? b.frozen.localeCompare(a.frozen) : a.frozen.localeCompare(b.frozen));
  $('#visible-count').textContent = visible.length;
  $('#items').replaceChildren(...visible.map(card));
  $('#empty').hidden = all.length > 0;
  $('#no-results').hidden = !all.length || visible.length > 0;
  $('#no-results').textContent = stocked.length === 0 && !query && category === 'All' ? 'All used up. Add your next batch, or include finished food to see past items.' : 'No food matches. Try another search or category.';
  for (const button of $('#filters').children) button.setAttribute('aria-pressed', String(button.textContent === category));
  $('#locations').replaceChildren(...[...new Set(all.map((i) => i.location).filter(Boolean))].map((name) => { const option = make('option'); option.value = name; return option; }));
  preparedLink = '';
  linkVersion = '';
  updateShareStatus();
  if ($('#sharing-dialog').open) prepareLink();
}

function card(item) {
  const node = make('article', 'food-card');
  const top = make('div', 'card-top');
  const badge = make('span', 'category', item.category);
  badge.dataset.category = item.category;
  const edit = make('button', 'edit', '⋯');
  edit.setAttribute('aria-label', `Edit ${item.name}`);
  edit.onclick = () => openFood(item.id);
  top.append(badge, edit);
  node.append(top, make('h3', '', item.name));
  node.append(make('p', 'food-meta', `${item.location || 'No location'} · Frozen ${dateLabel(item.frozen)}`));
  node.append(make('p', 'food-meta', `${daysFrozen(item.frozen)} days tucked away`));
  if (item.notes) node.append(make('p', 'food-notes', item.notes));
  if (item.portions < 0) node.append(make('p', 'conflict', 'Both phones used more portions than recorded. Edit to check the count.'));
  const bottom = make('div', 'card-bottom');
  const label = make('span', 'portion-label');
  label.append(make('strong', '', Math.max(0, item.portions)), document.createTextNode(item.portions === 1 ? 'portion' : 'portions'));
  const stepper = make('div', 'stepper');
  const less = make('button', '', '−');
  less.disabled = item.portions <= 0;
  less.setAttribute('aria-label', `Use one portion of ${item.name}`);
  less.onclick = () => adjust(item.id, -1);
  const more = make('button', '', '+');
  more.setAttribute('aria-label', `Add one portion of ${item.name}`);
  more.onclick = () => adjust(item.id, 1);
  stepper.append(less, more);
  bottom.append(label, stepper);
  node.append(bottom);
  return node;
}

async function adjust(itemId, delta) {
  try {
    let name;
    await commit((base) => {
      const item = inventory(base).find((i) => i.id === itemId);
      if (!item || (delta < 0 && item.portions <= 0)) throw new Error('This food has already been used.');
      name = item.name;
      return append(base, [{ kind: 'adjust', itemId, delta }]);
    });
    toast(`${delta < 0 ? 'Used' : 'Added'} one portion of ${name}.`, () => adjust(itemId, -delta));
  } catch (error) { toast(`Could not save: ${error.message}`); }
}

function openFood(id = null) {
  editing = id;
  const form = $('#food-form');
  form.reset();
  const item = id ? inventory(state).find((i) => i.id === id) : null;
  formSnapshot = item ? { ...item } : null;
  $('#form-title').textContent = item ? 'Edit food' : 'Add food';
  $('#delete-button').hidden = !item;
  form.elements.frozen.value = today();
  form.elements.frozen.max = today();
  if (item) {
    for (const key of ['name', 'category', 'location', 'notes', 'frozen']) form.elements[key].value = item[key];
    form.elements.portions.value = Math.max(0, item.portions);
  }
  $('#food-dialog').showModal();
}
$('#add-button').onclick = () => openFood();
$('#empty-add').onclick = () => openFood();
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => document.getElementById(button.dataset.close).close();
$('#search').oninput = render;
$('#sort').onchange = render;
$('#show-empty').onchange = render;
window.addEventListener('online', render);
window.addEventListener('offline', render);

$('#food-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = Object.fromEntries(['name', 'category', 'location', 'notes', 'frozen'].map((key) => [key, form.elements[key].value.trim()]));
  if (!fields.name) { toast('Give this food a name.'); return; }
  const desiredPortions = Number(form.elements.portions.value);
  const itemId = editing || crypto.randomUUID();
  try {
    await commit((base) => {
      const current = inventory(base).find((i) => i.id === itemId);
      if (editing && !current) throw new Error('This food was deleted in another tab. Close and add it as a new batch.');
      if (editing && JSON.stringify(current) !== JSON.stringify(formSnapshot)) throw new Error('This food changed while you were editing. Close and reopen it to keep the latest changes.');
      const changes = [{ kind: 'save', itemId, fields }];
      const delta = desiredPortions - (current?.portions || 0);
      // Split large corrections so each individual adjustment remains bounded.
      let remaining = delta;
      while (remaining) {
        const step = Math.max(-999, Math.min(999, remaining));
        changes.push({ kind: 'adjust', itemId, delta: step });
        remaining -= step;
      }
      return append(base, changes);
    });
    $('#food-dialog').close();
    toast(`${fields.name} saved.`);
  } catch (error) { toast(`Could not save: ${error.message}`); }
};

$('#delete-button').onclick = async () => {
  const item = inventory(state).find((i) => i.id === editing);
  if (!item || !confirm(`Delete ${item.name}? Shared updates will also remove it from the other phone.`)) return;
  try {
    await commit((base) => append(base, [{ kind: 'delete', itemId: editing }]));
    $('#food-dialog').close();
    toast(`${item.name} deleted.`);
  } catch (error) { toast(`Could not delete: ${error.message}`); }
};

$('#sharing-content').innerHTML = `
  <p>Two phones, one freezer. Send an update after you make changes. Your partner opens it and taps <strong>Merge updates</strong>, then shares back to bring your phone up to date.</p>
  <p><strong>Sharing is manual.</strong> Each link is a snapshot, not a live connection. New changes stay on this phone until you share again.</p>
  <div class="sharing-actions"><button id="share-link" class="primary" disabled>Preparing link…</button><button id="copy-link" class="outline" disabled>Copy link</button></div>
  <p id="share-status"></p>
  <details><summary>Open an update in this app</summary><p>On iPhone, a Messages link may open in Safari instead of your Home Screen app. Copy the link and paste it here to update the copy you use.</p><label for="import-text">Paste an update link</label><textarea id="import-text" rows="3" placeholder="https://…/freezer/#freezer=…"></textarea><button id="paste-import" class="outline">Review update</button></details>
  <div class="sharing-actions"><button id="export" class="outline">Export backup</button><button id="import-button" class="outline">Import backup</button><input id="import-file" type="file" accept=".json,application/json" hidden></div>
  <p>Links and backups contain your inventory. Only send them to people you want to share it with. Export a backup occasionally: clearing website data removes the copy on that device.</p>
  <details><summary>Add to your iPhone Home Screen</summary><p>Open this page in Safari, tap Share, then Add to Home Screen. Open it once online to make it available offline.</p></details>`;

function updateShareStatus() {
  const node = $('#share-status');
  if (!node) return;
  node.textContent = `${state.changes.length} saved changes on this device. Reopening the same update won’t count anything twice.`;
}

async function prepareLink() {
  const snapshot = state;
  const version = JSON.stringify(snapshot);
  $('#share-link').disabled = true;
  $('#copy-link').disabled = true;
  $('#share-link').textContent = 'Preparing link…';
  try {
    const payload = await encode(snapshot);
    if (JSON.stringify(state) !== version) return;
    const url = new URL('./', location.href);
    url.search = '';
    url.hash = `freezer=${payload}`;
    // Messaging apps may truncate long links. Backups have no URL-length limit.
    if (url.href.length > 24000) throw new Error('Your history is too large for a reliable message link. Export a backup and send that file instead.');
    preparedLink = url.href;
    linkVersion = version;
    $('#share-link').textContent = navigator.share ? 'Share updates' : 'Copy update link';
    $('#share-link').disabled = false;
    $('#copy-link').disabled = false;
  } catch (error) {
    $('#share-link').textContent = 'Use a backup file';
    $('#share-status').textContent = error.message;
  }
}

$('#sharing-button').onclick = () => { $('#sharing-dialog').showModal(); prepareLink(); };
async function shareLink(copyOnly = false) {
  if (!preparedLink || linkVersion !== JSON.stringify(state)) { toast('Preparing your latest changes. Try again in a moment.'); prepareLink(); return; }
  try {
    if (navigator.share && !copyOnly) await navigator.share({ title: 'Our freezer · updates', url: preparedLink });
    else { await navigator.clipboard.writeText(preparedLink); toast('Update link copied. Send it to your partner.'); }
  } catch (error) {
    if (error.name !== 'AbortError') {
      $('#import-text').value = preparedLink;
      $('#import-text').closest('details').open = true;
      $('#import-text').focus();
      $('#import-text').select();
      toast('Sharing was unavailable. Copy the selected link.');
    }
  }
}
$('#share-link').onclick = () => shareLink();
$('#copy-link').onclick = () => shareLink(true);

$('#export').onclick = () => {
  let backup;
  try {
    backup = storageFailed ? localStorage.getItem(KEY) : JSON.stringify(state, null, 2);
    if (!backup) throw new Error('There is no readable saved data to export.');
  } catch (error) { toast(`Could not export: ${error.message}`); return; }
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = make('a');
  anchor.href = url;
  anchor.download = `freezer-${today()}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('Backup exported. You can send it through Messages or save it in Files.');
};
$('#import-button').onclick = () => $('#import-file').click();
$('#import-file').onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 4_000_000) throw new Error('This backup is too large.');
    await reviewImport(await file.text());
  } catch (error) { toast(`Could not import: ${error.message}`); }
  event.target.value = '';
};
$('#paste-import').onclick = () => reviewImport($('#import-text').value).catch((error) => toast(`Could not import: ${error.message}`));

const review = document.createElement('dialog');
review.id = 'review-dialog';
review.innerHTML = '<p class="eyebrow">AN UPDATE FOR YOUR FREEZER</p><h2>Bring your copies together.</h2><p id="review-summary"></p><p>Your existing changes are kept. Separate portion changes are added together. For conflicting food details, one edit wins consistently. Deleted food stays deleted.</p><div class="dialog-actions"><button id="cancel-merge" class="outline">Cancel</button><button id="confirm-merge" class="primary">Merge updates</button></div>';
document.body.append(review);
$('#cancel-merge').onclick = () => review.close();
async function reviewImport(input) {
  const incoming = await readImport(input);
  const merged = merge(state, incoming);
  const added = merged.changes.length - state.changes.length;
  if (!added) { toast('You already have all the changes in this update.'); return; }
  $('#review-summary').textContent = `Merge ${added} new ${added === 1 ? 'change' : 'changes'} from this update? The combined freezer will contain ${inventory(merged).filter((i) => i.portions > 0).length} stocked ${inventory(merged).filter((i) => i.portions > 0).length === 1 ? 'item' : 'items'}.`;
  $('#confirm-merge').onclick = async () => {
    try {
      await commit((base) => merge(base, incoming));
      review.close();
      $('#sharing-dialog').close();
      $('#import-text').value = '';
      toast('Updates merged. Share back to update your partner’s copy.');
    } catch (error) { toast(`Could not merge: ${error.message}`); }
  };
  review.showModal();
}

async function handleSharedLink() {
  if (!location.hash.startsWith('#freezer=')) return;
  const input = location.href;
  // Do not leave the inventory in browser history or links copied from the address bar.
  history.replaceState(null, '', location.pathname + location.search);
  try { await reviewImport(input); }
  catch (error) { toast(`Could not open update: ${error.message}`); }
}
window.addEventListener('hashchange', handleSharedLink);
render();
handleSharedLink();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => toast('Offline setup failed. Reopen the app online to try again.'));
