# AI Usage

## Tools

- **Devin (Cognition AI):** Used during the initial implementation to help develop the application and its supporting documentation.
- **ChatGPT / Codex:** Used during later development for code review, debugging, test development, deployment configuration, and user interface refinement.

## Areas of assistance

AI assistance was used as a development aid across the following areas:

- **Requirements and design:** Organizing the assignment into backend, frontend, data, and operational requirements, including seat capacity, concurrent applications, hold expiry, idempotency, and persistence.
- **Backend:** Drafting and reviewing .NET 8 minimal API code, EF Core data access, PostgreSQL integration, request validation, response handling, and hold lifecycle behavior.
- **Frontend:** Supporting React and TypeScript implementation, API integration, application status and countdown behavior, validation, and user-facing error messages.
- **Testing and documentation:** Assisting with test scenarios and project documentation, including the README and assumptions record.
- **Runtime and deployment:** Assisting with Docker configuration, environment settings, and the Render deployment blueprint.

## Review and responsibility

AI-generated suggestions were treated as drafts. The project developer was responsible for reviewing and adapting them to the assignment, integrating the final changes, and resolving implementation decisions. Particular review attention was given to database-enforced seat limits, parallel requests, hold expiry, repeat confirmation or cancellation requests, and consistency between the API and user interface.

## Examples of issues addressed

- **Database query translation:** Adjusted query composition so filtering and ordering occur before projection to the API response model.
- **Container networking:** Configured the API to listen on the container interface so it can be reached through the published Docker port.
- **Concurrent seat allocation:** Used PostgreSQL transactions and row locking, together with a partial unique index, to protect seat capacity and prevent duplicate active applications.
- **Expiry behavior:** Ensured the API and UI treat a hold as expired based on its server-side expiry time, while the background process updates persisted status.
- **UI and test robustness:** Refined accessible labels, test selectors, and inline icon rendering to make the interface and automated checks more consistent.

## Verification

The project includes backend tests using PostgreSQL, frontend tests using Vitest and Testing Library, and a .NET 8 build. Backend test coverage includes concurrent seat allocation, including two separate backend processes sharing a database; frontend tests cover key application flows and expiry behavior. Docker Compose configuration supports running the application and its test suites locally.

AI assistance supported implementation and review; it does not replace the project source code, test results, or the developer's responsibility for the submitted work.
