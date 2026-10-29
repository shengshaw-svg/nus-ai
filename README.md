# Snip

Snip is a tiny URL shortener with one backend and two clients: an Angular web app and a Node.js CLI. Both clients use the same HTTP API and see the same in-memory links while the backend is running. Restarting the backend clears them.

## Repository layout

Each project lives at the root of its own orphan branch. The `main` branch mounts those branches as submodules, pinning each directory to a specific commit.

| Directory | Branch | Stack | Purpose |
| --- | --- | --- | --- |
| `backend/` | `backend` | Bun | API, link storage, and short-code redirects |
| `frontend/` | `frontend` | Angular 19 | Web form and links table |
| `cli/` | `cli` | Node.js | Terminal client |

## API

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://example.com" }` | `201` with `{ code, url, shortUrl, hits, createdAt }`; `400` for invalid JSON or a non-HTTP(S) URL |
| `GET` | `/api/links` | - | `200` with an array of links in the same shape |
| `GET` | `/:code` | - | `302` to the original URL and increments `hits`; `404` for an unknown code |

## Clone

Select the `main` superproject branch and use `--recurse-submodules` to populate all three project folders. The explicit branch is needed while GitHub's repository default still points to `backend`:

```sh
git clone --branch main --recurse-submodules https://github.com/shengshaw-svg/nus-ai.git
cd nus-ai
```

A plain `git clone` leaves submodule directories empty. To populate them afterward, run `git submodule update --init --recursive`.

## Run

Use three terminals from the `main` checkout. Start the backend first:

```sh
cd backend
bun start
```

```sh
cd frontend
npm install
npx ng serve
```

```sh
cd cli
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
```

Open the frontend at `http://localhost:4200`. The CLI uses `http://localhost:3000` by default; set `SNIP_API` to use a different backend URL.

## Update a project

Commit and push changes from inside the project submodule first. Then update and commit the pinned submodule pointer from `main`:

```sh
cd backend
# edit files
git add -A
git commit -m "Update backend"
git push
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

For `frontend` or `cli`, substitute that directory and branch name. The project commit and the pointer-bump commit are separate, keeping each `main` snapshot pinned and reproducible.# Snip CLI

A zero-dependency Node.js client for the Snip URL shortener. Node 20 or newer is required.

```sh
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
node cli.js help
```

The API defaults to `http://localhost:3000`. Set `SNIP_API` to use another HTTP or HTTPS server. On Windows, use `snip.cmd`; PowerShell users can use `snip.ps1`.# SnipFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
