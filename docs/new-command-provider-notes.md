# New Command Provider Notes

## QR code

The repository already declares `qrcode` version `^1.5.4` in `package.json`. The `.qr <text or URL>` command will generate a PNG buffer locally; no external service or Railway variable is needed.

## URL shortening

Provider: is.gd API.

Documentation: https://is.gd/apishorteningreference.php

Endpoint: `https://is.gd/create.php?format=json&url=<encoded-url>`.

The API supports HTTPS GET or POST and returns JSON such as `{ "shorturl": "https://is.gd/abc123" }` on success or `{ "errorcode": 1, "errormessage": "..." }` on error. It is intended for low-volume usage and is rate-limited per IP; the bot command should use a timeout, validate http(s) URLs, and show a clear user-facing error.

## Anime search

Provider: Jikan v4 API.

Documentation: https://docs.api.jikan.moe/

Base URL: `https://api.jikan.moe/v4/`. The intended request is `GET /anime?q=<encoded-title>&limit=1&sfw=true`. Jikan is an unofficial MyAnimeList API and documents a limit of 60 requests/minute and 3 requests/second. The command will use a timeout and handle 429/5xx errors.

## Fact checking

Provider: Google Fact Check Claim Search API.

Documentation: https://developers.google.com/fact-check/tools/api

The Claim Search API queries results available through Fact Check Explorer and requires an API key. The command will use a Railway variable named `GOOGLE_FACTCHECK_API_KEY`, call the claims search endpoint, and present published claim-review results rather than presenting its own verdict. If no matching review is found, it will say that this does not establish whether the claim is true or false.
