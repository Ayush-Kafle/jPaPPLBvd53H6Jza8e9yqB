# Leads

A small internal tool for a sales team. It lists leads and lets you archive them one at a time.

Stack is React (Vite) on the front and Express on the back, in one repo. No database, the data lives in memory and resets when the server restarts.

## Running it

Your interviewer sends you a link to a ready environment. Nothing to install, nothing to configure. Open it and run:

```
npm run dev
```

Web is on port 5173, API is on 8787. Vite proxies `/api` through, so you only need the web URL.

A seed number is set for your session and it shows in the top right of the page. Your interviewer will read it out at the start. Check that it matches.

Running locally instead: `npm install` first, Node 18 or newer.

## Your tools

Use whatever you normally use. We are not testing whether you can type React from memory, and reaching for an agent is expected rather than discouraged.

**Already installed.** Sign in with your own account, the way you normally would. Please do this in the first few minutes rather than partway through the build, so a login screen does not eat your time.

In the terminal:

```
claude     # Claude Code
codex      # Codex CLI
gemini     # Gemini CLI
```

Claude Code sign in, since this environment is a container and behaves slightly differently from your laptop:

1. Run `claude` and choose "Claude.ai" as the login method
2. A browser opens. If it does not, press `c` to copy the login URL and open it yourself
3. Sign in, and the browser will show you a login code rather than sending you back automatically. That is normal in a container.
4. Paste that code into the terminal at the "Paste code here if prompted" prompt
5. You will see "Login successful", press Enter

Claude Code needs a Pro or Max plan, the free Claude.ai plan does not include it. If you do not have one, use Copilot or Codex instead. `/status` shows which account you are on and `/login` switches.

In the editor sidebar: Copilot and Copilot Chat, Cline, and Continue. Copilot needs nothing, it is already signed in as you. Cline and Continue will ask for your own API key.

One thing to keep in mind: you are sharing this tab. If you use a raw API key, paste it into the extension settings panel rather than typing it into the terminal, so it does not end up on screen.

**Adding something else.** It is an ordinary Linux container with network access, so install what you like:

```
npm install -g <whatever-you-use>
```

Editor extensions install from the Extensions panel the usual way.

**Cursor, Windsurf, or Zed.** These are separate editors rather than extensions, so they cannot open in a browser tab. They can attach to this environment over SSH, and you keep your own keybindings and agent:

```
gh codespace ssh --config >> ~/.ssh/config
```

Then in your editor, open the command palette and run "Remote-SSH: Connect to Host", and pick this codespace from the list. Zed uses its own SSH remoting for the same thing.

Set this up before the session starts, not during it. If you want this path, tell your interviewer ahead of time and they will walk you through it. Note that Cursor and Windsurf bill through your own account, the provided keys do not cover them.

## What you are building

Add multi-select to the table and an "Archive Selected" action.

Make it feel good to use, and make it behave correctly when things go wrong.

That is the whole brief. The gaps in it are yours to fill, and how you fill them is part of what we are talking about. Ask before you start if something matters to you.

## Ground rules

Two things we ask:

1. Talk while you work. What are you about to try, what do you expect to happen, and why. Thinking out loud is the point of the session.
2. Before every run, say what you expect to see. Then run it. If you were wrong, say so and say why.

You will not finish everything. That is fine and expected. We would rather see twenty minutes of good judgment than a rushed feature.

## API

Base path `/api`. All responses are JSON.

### `GET /api/items`

Returns `{ seed, items }`. Each item has `id`, `name`, `company`, `email`, `source`, `owner`, `value`, `lastContact`, `archived`.

### `POST /api/items/:id/archive`

Archives a single lead. There is no batch endpoint.

Success is `200` with `{ item }`.

Errors come back as `{ error: { code, message, id } }`:

| Status | Code | Meaning |
| --- | --- | --- |
| 409 | `record_locked` | Another user holds a lock on this lead |
| 500 | `archive_failed` | Upstream archive service is down |
| 404 | `not_found` | No such lead |

Other status codes are possible. Error responses always carry a readable `message`, so read it.

Heads up: this endpoint is slow and some records fail every time. That is intentional, not a broken scaffold. Treat it as the real world.

### `POST /api/reset`

Puts the dataset back to its starting state. Useful mid-build.
