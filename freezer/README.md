# Freezer

An offline-first, static freezer inventory. Served directly by GitHub Pages at
`/freezer/`; no build, account, external scripts, API keys or backend required.
Written as small browser JavaScript modules, matching the repository's other apps.

## Use

Add foods as separate batches, with portions, frozen date, category, drawer and
notes. Use the minus button as you eat portions; plus corrects or replenishes the
same batch. Add a new batch for newly frozen food so its date stays accurate.
Finished batches can be shown with **Include finished food**. Oldest-first is an
inventory aid, not a food safety or expiry recommendation.

On iPhone, open the deployed page in Safari and choose Share → Add to Home Screen.
Open once online so the service worker can cache the app for offline use.

## Sharing between two people

This version deliberately has **manual exchange, not automatic synchronisation**:

1. One person enters the freezer inventory.
2. Open **Sharing & backup → Share updates**, and send the link through Messages.
3. The other person opens it and taps **Merge updates**.
4. Both can make offline changes. Share again after updates and share back to bring
   both copies up to date. Repeat imports are safe.

A link contains a snapshot of the full change history in its URL fragment. The
fragment is not sent to the hosting server. Anyone with the link can read it; it is
not encrypted. Share only with your household. No messages are sent by the app
without the user choosing a destination in their device's share sheet.

On iPhone, a link may open in Safari rather than the installed Home Screen app.
Use **Open an update in this app** to paste the link into the copy you normally
use. Safari and the Home Screen app should not be assumed to share local storage.

**Export backup** saves a JSON file that can be kept in Files or sent to the other
person and imported. This also works when a message link gets too large. Saving
backups to iCloud Drive does not provide automatic syncing. Keep backups: clearing
site data, deleting the web app, or browser storage eviction can lose local data.

### Merge behaviour

Each change has a UUID and a logical clock. Snapshots merge by change ID, so
re-importing one does not duplicate portions. Independent portion adjustments add
together; deleting an item creates a permanent tombstone so stale copies cannot
restore it. Food details use a deterministic last-logical-edit-wins register for
the whole details record; simultaneous edits to different fields can overwrite
one another. The merge confirmation explains that limitation.

If both people consume the last recorded portion while offline, the internal
quantity may go negative. The app flags this for manual correction instead of
silently discarding one person's change. Edit the count after merging.

Changes are never pruned automatically because old copies may still exist. A
snapshot is limited to 20,000 changes and imports to 4 MB. Links are compressed
where supported and limited to 24,000 characters; use backups for larger histories.

Storage writes use Web Locks when available to coordinate tabs. Device-to-device
sync still requires sharing; BroadcastChannel/storage events only update local
tabs. Private browsing or denied/full storage may prevent saving, which is surfaced
as an error rather than claiming success.

## Development

From the repository root, serve the static files:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/freezer/`. Localhost is a secure context for service
workers and sharing APIs; remote devices need HTTPS. To test merging, use separate
browser profiles or devices and exchange links through the paste field.

```sh
npm test --prefix freezer
```

Tests cover independent consumption, merge convergence/idempotence, tombstones,
negative-count reconciliation, invalid inputs, decompression limits and share link
round trips. No npm dependencies are needed. Requires Node 20+ for tests.

Bump the cache version in `sw.js` whenever changing cached files. New workers wait
until previous app windows close before activation. The worker only removes its
own `freezer-` caches and never touches bins or other apps.

## Future automatic sync

`src/store.js` is transport-independent: a hosted service could exchange the same
immutable changes. CloudKit JS is also possible, but requires an Apple Developer
Program membership, container, web token and sharing setup. None is configured or
claimed to work in this version.
