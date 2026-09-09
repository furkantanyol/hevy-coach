# @furkantanyol/hevy-client

Typed client for the [Hevy](https://hevyapp.com) public API. `fetch` only, zero dependencies, ESM + CJS. Runs in Node 20+ and React Native.

Types are generated from Hevy's live OpenAPI document and corrected where the live API differs from it (every correction is documented in the repo under `docs/api/`).

```bash
npm i @furkantanyol/hevy-client
```

## Usage

```ts
import { createHevyClient, HevyApiError } from "@furkantanyol/hevy-client";

const hevy = createHevyClient({ apiKey: "..." });

await hevy.user.info();                       // { id, name, url }
await hevy.workouts.list({ page: 1, pageSize: 10 });
await hevy.workouts.listAll();                // walks every page
await hevy.workouts.get(id);
await hevy.workouts.count();
await hevy.workouts.create(workout);
await hevy.workouts.update(id, workout);

await hevy.routines.list() / listAll() / get(id) / create(routine) / update(id, routine);
await hevy.routineFolders.list() / listAll() / get(id) / create(title);
await hevy.exerciseTemplates.list() / listAll() / get(id) / create(exercise);
await hevy.exerciseHistory.get(templateId, { startDate, endDate });   // flat, one row per set
await hevy.bodyMeasurements.list() / listAll() / get(date) / create(m) / update(date, m);
await hevy.bodyMeasurements.upsert({ date: "2026-09-09", weight_kg: 80 }); // POST, PUT on 409
```

### Delta sync

```ts
const { upserts, deletes, cursor } = await hevy.workouts.changes(previousCursor);
// upserts: Workout[] (newest first, deduplicated), deletes: { id, deleted_at }[]
// store `cursor` and pass it back next time; omit it for a full sync
```

### Errors and retries

- `HevyApiError` for any non-2xx: `status`, `code` (e.g. `"routine-limit-exceeded"`), `message`, raw `body`, `isNotFound`, `isConflict`.
- `HevyNetworkError` when `fetch` itself fails after retries.
- Retries: 429, 5xx and network errors, exponential backoff with jitter, `Retry-After` honoured. POST is retried only on 429.

```ts
try {
  await hevy.routines.create(routine);
} catch (error) {
  if (error instanceof HevyApiError && error.code === "routine-limit-exceeded") { /* ... */ }
}
```

### Options

```ts
createHevyClient({
  apiKey,            // required
  baseUrl,           // default https://api.hevyapp.com/v1
  fetch,             // inject for tests or polyfills
  retries,           // default 3
  cacheTtlMs,        // in-memory GET cache; off by default; cleared on any write
});
```

### Limits worth knowing

- `pageSize` max 10 (100 for exercise templates). `MAX_PAGE_SIZE` and `MAX_TEMPLATE_PAGE_SIZE` are exported.
- Free Hevy accounts are limited to 4 routines (409 `routine-limit-exceeded`).
- `hevy.webhook.get() / set({ url, authToken }) / delete()` targets an endpoint Hevy has not documented. Verified 2026-09-09; may change.

## License

MIT
