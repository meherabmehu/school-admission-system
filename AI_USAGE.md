# AI Usage

## Tools used
- **Devin (Cognition AI)** – an AI coding agent, used through a chat session with access to this
  repository and a sandbox machine (shell, .NET SDK, Node, Docker, browser).

## Where AI was used
- Reading the assignment PDF and turning it into a task list and a design (row lock +
  partial unique index for seat safety, time-based expiry plus a background sweeper).
- Writing most of the code: the .NET API, EF Core model and migration, the React UI, the Dockerfiles
  and `docker-compose.yml`.
- Writing the backend tests (xUnit against real PostgreSQL, including the 100-request concurrency
  test and the two-instance test) and the frontend tests (Vitest + Testing Library).
- Drafting `README.md`, `ASSUMPTIONS.md` and this file.

The requirements, decisions on unclear points, review of the generated code, and the final
manual check of the running app were done by me.

## Mistakes the AI made and how they were caught
- **Untranslatable EF Core query.** The first version of the class listing filtered and sorted
  *after* projecting to the response record. EF Core could not translate it and `GET /classes`
  returned `500`. Caught by calling the API with `curl` during manual testing; fixed by filtering
  and ordering on the entity before the projection.
- **Backend unreachable in Docker.** `appsettings.json` set `Urls` to `http://localhost:8080`,
  which overrode the container's `ASPNETCORE_URLS` and made Kestrel listen only inside the
  container. The container looked healthy but `curl localhost:8080/health` failed. Caught by a
  health check after `docker compose up`; fixed by binding to `http://+:8080`.
- **Stale process during manual tests.** New hold endpoints returned `404` because an old API process
  was still running. Caught by the unexpected status codes; fixed by restarting the API after build.
- **Icons that did not render.** The first UI used emoji as icons; in a browser without an emoji
  font they showed as empty boxes. Caught by looking at screenshots; replaced with inline SVG icons.
- **Ambiguous test query.** A frontend test looked up the student ID input by label text, which also
  matched the surrounding section's `aria-label`, so the test failed. Caught by the failing test
  run; fixed by querying the textbox role.

## How the output was checked
- Every backend change was run against a real PostgreSQL database; the full xUnit suite
  (21 tests) passes, including the concurrency and multi-instance tests.
- The frontend test suite (14 tests) passes, `tsc` and ESLint are clean.
- The whole stack was started with `docker compose up --build` from an empty volume and used through
  the browser: create class → apply → countdown → confirm / cancel / expire, and data was still there
  after restarting the containers.
