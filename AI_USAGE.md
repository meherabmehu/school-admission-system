# AI Usage

## Tools and scope

AI coding assistants were used during implementation and follow-up development:

- **Devin (Cognition AI):** assisted with the initial requirements breakdown, implementation, and project documentation.
- **ChatGPT/Codex:** assisted with a later code review, the separate-process concurrency test, Render deployment configuration, and UI refinements.

AI assistance was used to draft and review code and documentation. It did not replace engineering review or decide whether the assignment requirements were satisfied.

## How AI assistance was used

- Converted the assignment brief into implementation tasks and discussed options for enforcing seat limits under concurrent requests.
- Drafted portions of the .NET API, EF Core persistence layer, PostgreSQL migration, React interface, Docker configuration, and automated tests.
- Helped identify edge cases in hold expiry, duplicate applications, request validation, API errors, and parallel confirmations.
- Assisted with documentation, including `README.md`, `ASSUMPTIONS.md`, and this disclosure.
- Reviewed deployment requirements and prepared a Render Blueprint for the API, frontend, and managed PostgreSQL database.

## Review and decision-making

I treated AI-generated output as a draft. I checked proposed behavior against the assignment's API contract and seat-allocation rules, reviewed changes in the repository, and recorded interpretation choices in `ASSUMPTIONS.md`. I retained, revised, or rejected suggestions based on those checks. The application does not treat a successful AI response as proof that a requirement is met; builds, tests, and runtime checks provide that evidence.

## Issues found during development

- **An EF Core query could not be translated.** The initial class-list query projected before filtering and sorting, causing `GET /classes` to return a server error. The query was reordered to apply those operations to the entity before projection.
- **The API initially bound to the wrong Docker address.** The configured URL prevented requests from reaching the API through the container's published port. Binding was corrected and checked through the health endpoint.
- **A stale local API process obscured an endpoint change.** The unexpected response was traced to the old process and resolved by restarting the API.
- **Emoji icons rendered inconsistently.** They were replaced with inline SVG icons after visual review.
- **A frontend test selector matched more than one accessible label.** The test was changed to select the student ID textbox by role.

These issues were corrected and rechecked; they were not accepted as final behavior.

## Verification

- Backend: **24 automated tests passed** against PostgreSQL through Docker Compose. Coverage includes capacity under parallel requests and two separate backend OS processes sharing one database.
- Frontend: **14 Vitest tests passed**. The production build completed with TypeScript checking and Vite.
- Backend solution: built with .NET 8 with **zero warnings and zero errors**.
- Runtime smoke checks confirmed the API health endpoint responds and the classes endpoint returns valid JSON.

The test suites can be rerun with the Docker commands documented in `README.md`.
