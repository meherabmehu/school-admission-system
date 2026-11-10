# Assumptions

Decisions taken where the assignment left room for interpretation.

## Identity and access
- There is no login. The student is identified only by the `X-Student-Id` header, which must be
  exactly 17 ASCII digits (birth registration number). Anything else is `400 INVALID_STUDENT_ID`.
- Creating classes is open to anyone (no admin authentication), as no auth was requested.
- `GET /holds/{holdId}` is readable without the header (the hold id is a random, hard-to-guess
  value). Confirm and cancel always require the owner's student ID (`403 NOT_YOUR_HOLD` otherwise).

## Classes
- A class name is 1–100 characters after trimming. Names are unique ignoring case and repeated
  spaces (`409 CLASS_ALREADY_EXISTS`).
- `totalSeats` is a whole number from 1 to 10,000. Classes cannot be edited or deleted (not required).

## Holds
- One active (`HELD` or `CONFIRMED`) application per student per class. After a hold expires or is
  cancelled, the student may apply to the same class again. A student may hold seats in several
  different classes at the same time.
- A second apply while a hold is active returns `409 ALREADY_APPLIED` together with the existing
  `holdId`, so the UI can take the parent to that application.
- A hold is expired as soon as `now >= expiresAt`, even if the background job has not updated the row
  yet. Seat counts, confirm and every API response use this rule, so expiry never depends on timing
  of the sweeper.
- Confirming an already confirmed hold returns `200` with the same hold (idempotent). Confirming an
  expired or cancelled hold returns `409`.
- Cancelling an already cancelled (or expired) hold returns `204` (idempotent). A confirmed admission
  cannot be cancelled (`409 ALREADY_CONFIRMED`), because the fee is already paid.
- Payment itself is out of scope: pressing "confirm" stands for "the fee was paid".
- `HOLD_DURATION_SECONDS` applies to new holds; changing it does not change existing holds.
- Times are stored and returned in UTC. Responses include `serverTime` so the UI countdown follows
  the server clock, not the user's computer clock.

## Frontend
- The current student ID is stored in `localStorage`; applications themselves always come from the
  server (`GET /me/holds`), so they survive a refresh or reopening the browser.
- Seat counts and application lists refresh every 5 seconds; countdowns tick every quarter second
  and re-fetch the moment they reach zero.
- The backend URL is read at runtime from `/config.js` (`API_BASE_URL`) so the same image can point
  to any backend. The Docker image serves the built files with a tiny Node static server (no extra
  web server) on port 3000.
- English and Bangla UI text are provided because the users are parents in Bangladesh, many of whom
  are not technical.

## Several backend processes (bonus)
- Seat rules are enforced inside PostgreSQL, not in backend memory, so any number of backend
  processes can share one database:
  - Creating a hold locks the class row (`SELECT ... FOR UPDATE`) inside a transaction, so requests
    from different processes queue on the same lock before counting `HELD` + `CONFIRMED` seats.
  - A partial unique index on `(class_id, student_id) WHERE status IN ('HELD','CONFIRMED')` blocks a
    second active application even if two processes insert at the same moment.
  - Confirm and cancel lock the hold row, so the same hold is never counted twice.
  - The expiry sweeper only updates rows that are already past `expires_at`, so running it in every
    process is harmless.
  - Startup migrations take a PostgreSQL advisory lock, so two processes can start together.
- `ConcurrencyTests.Two_backend_instances_sharing_one_database_do_not_overbook` checks this with
  two separate app instances against one database.
