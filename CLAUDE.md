# SpotiSearch

Personal project (author + one friend, max 2 users). Aggregates album release data from
several sources into Postgres, matches it against the artists a user follows on Spotify,
and shows what's new or upcoming in chronological order.

## Stack

- TypeScript on Node
- Postgres 17 (local, via `docker compose up -d`)
- `pg` (node-postgres) — **hand-written SQL, no ORM.** Deliberate: queries map directly to
  editable code and stay visible in `pg_stat_statements`. Mirrors the author's AutoTrain project.
- Zod planned at every external boundary (not yet installed)
- Cheerio planned for the AOTY scrape

Run the DB: `docker compose up -d`
Apply migrations: `psql "$DATABASE_URL" -f migrations/001_init.sql`
Connection string lives in `.env` as `DATABASE_URL` (gitignored).

## Architecture

Three independent pieces. **The worker does not call the API.**

```
[cron worker] --> external sources --> [Postgres]
                                            |
[frontend] --> [API router] ----------------+
```

- **Worker** (`src/entrypoints/ingest.ts`): fetches from external sources, writes to Postgres.
  Must run a full pass and **exit** — no long-lived server. This keeps every scheduling option
  open (node-cron, GitHub Actions, systemd timer, platform cron).
- **API** (`src/entrypoints/api.ts`): reads Postgres only. Never calls an external API.
- **Frontend**: calls the API only.

Schedule: daily ~00:15. "This week" is a frontend query filter, not a separate job.

## Data sources

**Identity source** — Spotify. Tells you *who the user cares about*, not what's releasing.
- `GET /v1/me/following?type=artist` — **cursor-paginated** (`after=`), not offset-paginated.
- `GET /v1/artists/{id}/albums?include_groups=album,single&market=GB`
  — set `market` or the same album returns several times under different regional IDs.
- `GET /v1/me` returns the Spotify user id.

**Release sources** — what is actually coming out:
| Source | Access | Notes |
|---|---|---|
| Wikipedia `List of <year> albums` | MediaWiki API, no key | Tables: date, artist, album, genre, label. Best structured upcoming source. Lags breaking announcements by days. |
| MusicBrainz | REST, no key, **1 req/sec** | `arid` (artist MBID) + `date`; Lucene ranges `date:[X TO Y]`. MBIDs are real UUIDs. |
| iTunes Search API | REST, no auth | May surface pre-orders — unverified, needs testing. |
| AlbumOfTheYear | **Scraped** | Best upcoming calendar. Fragile + ToS-grey: personal use, low volume, cache hard. Build last. |

## Hard constraints (already researched — do not re-litigate)

- **Spotify exposes no pre-release / upcoming album data.** Not via search, not via an artist's
  albums, not even by known album ID. There is no pre-save API for third-party developers.
  Forward-looking data must come from Wikipedia / MusicBrainz, or manual entry.
- Announcement lead times are often days, not months (Drake announced FOMO on 4 Sept for a
  15 Sept release, via Instagram). The **daily diff is the reliable core**; "upcoming" is a bonus layer.
- Spotify **Development Mode**: max 5 users, each manually allowlisted in the Developer Dashboard
  (User Management). Un-allowlisted users can log in but get 403 on every call. Owner needs Premium.
- Spotify **artist genre tags are frequently empty** — don't build features that depend on them.
- Feb 2026 API changes removed several endpoints (`/artists/{id}/top-tracks`, batch fetches,
  browse endpoints). Docs are ambiguous on whether `/me/following` and `/artists/{id}/albums`
  survived in dev mode — **verify before building on them.**

## Schema notes

Tables: `users`, `artists`, `user_artists`, `releases`, `seen`.

- Internal `id` is a `uuid` PK everywhere; external identifiers (`spotify_id`, `musicbrainz_id`)
  are separate nullable columns. `artists.spotify_id` **must stay nullable** — catching artists
  who aren't on Spotify is a core goal.
- `seen` is the memory that makes "new" detectable: `pulled set − seen = new`. It is per-user,
  and **nothing is ever deleted from it** — deleting would re-announce old releases forever.
- `release_date` is `date` (a calendar day); `first_seen_at` is `timestamptz` (an instant).
  `release_date_precision` records year/month/day because Spotify returns bare years for old albums.
- Releases are **shared** across users; follow lists and `seen` are **per user**.

### Known gaps (next work)

1. `releases` has **no dedupe key** — every worker run would insert duplicate rows and there's
   nothing to target with `ON CONFLICT`. Needs a unique constraint on a normalised natural key
   (note: `release_date` is nullable, so plain `UNIQUE` won't work — use
   `UNIQUE NULLS NOT DISTINCT`, Postgres 15+) and/or a `musicbrainz_id uuid UNIQUE`.
2. `releases` has **no source provenance**. Add a `release_sources` table
   (`release_id, source, source_ref, claimed_date, fetched_at`) — sources disagree on dates, and
   keeping every claim lets you pick a canonical one and detect slipped releases.
3. **Foreign key columns are not auto-indexed by Postgres.** Missing: `releases.artist_id`,
   `user_artists.artist_id`, `seen.release_id`, and `releases.release_date` (the headline query
   sorts on it).
4. `releases.artist_id` and `releases.title` should be `NOT NULL`. Nullable `release_date` is
   correct — announced-but-undated albums are a real case.
5. No `schema_migrations` table or migration runner yet. Migrations are numbered `.sql` files,
   never edited once applied.
6. `refresh_token` is plaintext. Acceptable at two users; revisit if this grows.

## Conventions

- Parameterised queries always (`$1`), never string interpolation.
- Numbered migrations, never edit an applied one.
- Worker pool: `max: 1` and call `pool.end()` explicitly, or the script never exits.
- Never log or return `refresh_token`. No `select *` in anything user-facing.
- Config from env vars only — never hardcode connection strings or credentials.
