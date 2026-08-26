# Course builder contract

## Step 1: anchor

- `GET /api/v1/courses/anchors` lists active or upcoming anchor happenings.
- `POST /api/v1/courses` creates an owned `DRAFT` with the anchor as its first node.
- Course ownership belongs to the actor's active couple when one exists; otherwise it belongs to the actor.

## Step 2: route

- `GET /api/v1/courses/{slug}?locale=ko|en` returns an editable draft only to its owner.
- `PATCH /api/v1/courses/{slug}?locale=ko|en` replaces the draft route atomically.
- The body is `{ dayCount, dayStartMinutes, dayEndMinutes, targetStopCount, nodes: [{ placeId, dayIndex, durationMinutes, tip? }] }`.
- A route spans 1–3 days. Each daily window is at least three hours, each selected day contains at most eight stops, and the complete route contains 1–24 unique active places.
- `targetStopCount` is between `max(2, dayCount)` and `dayCount * 8`. Tips are limited to 50 characters and each stay is 15–480 minutes.
- The original anchor must remain the first node on day one. Its distance is `null`.
- The service orders nodes by day and submitted order, recalculates straight-line distance within each day, and derives walking minutes at 80 meters per minute. Travel does not carry across day boundaries.
- A save is rejected if any day runs beyond `dayEndMinutes` or if the draft was published concurrently.
- Both endpoints require a user actor. A non-owner, a missing draft, and a non-draft course are intentionally exposed as access denied.

The client edits local state, uses the API for mutations, and accepts the returned server calculation as the saved source of truth.

## Step 3: publish

- `POST /api/v1/courses/{slug}/publish?locale=ko|en` accepts `{ title, description? }` from the owning user.
- A draft must contain 2–24 nodes, every selected day must contain at least one node, every place must still be active, and the title must contain 3–60 characters.
- The service derives total duration from each node's saved stay plus walking time, then atomically changes `DRAFT` to `PUBLISHED` and sets `publishedAt`.
- Repeating the publish operation cannot overwrite an already-published course.

## Public detail

- `/{locale}/courses/{slug}` reads only non-deleted `PUBLISHED` courses through the course service.
- The server-rendered page groups up to 24 stops by day and includes localized places, arrival and stay times, tips, walking time, event period or ended status, Open Graph metadata, and schema.org JSON-LD.
- Stop map links open Kakao Map's documented `link/map` URL for `ko` and a Google Maps `api=1` search URL for `en`; both use the stored place coordinates and require no client API key.
- Public detail uses a five-minute revalidation window. Draft and private courses return the not-found surface.

## Scraps and My Place

- `GET /api/v1/courses/{slug}/scrap` returns the signed-in user's saved state and the source-derived count.
- `POST` and `DELETE` on the same route add or remove a scrap idempotently. Both operations recompute `Course.scrapCount` from `Scrap` rows in the same transaction.
- New scrap creation is limited to 30 per user per minute. Changed state records `course.scrapped` or `course.unscrapped` as an analytics event.
- The public detail remains cacheable; its client action hydrates the current user's saved state and live count separately.
- `/{locale}/my` is dynamic and private. It lists current personal or active-couple-owned courses, saved published courses, and source-backed created/saved/received counts.
