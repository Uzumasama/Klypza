# Klypza

**Your Media, One Simple Download.**

Klypza is a responsive, video-only web tool for processing supported public video links from TikTok, Instagram Reels, Facebook Reels, YouTube Shorts, and Pinterest video Pins.

## Product scope

- Video links only; photo and profile downloads are not supported.
- Supports one or multiple direct public video-post URLs.
- Platform selector validates that each URL matches the selected platform.
- Results are kept in the same order as submitted links.
- Individual downloads and quality-grouped ZIP batches.
- Duplicate URLs are filtered by the response normalizer and batch grouping avoids repeating the same source in a quality group.
- English interface, mobile-first layout, and informational pages.

## Architecture

- Static frontend: `public/`
- Cloudflare Worker API: `cloudflare/worker.mjs`
- Worker configuration and static asset binding: `wrangler.toml`
- Video processing provider: SaveAPI (server-side only)

The SaveAPI integration uses the provider's API endpoints from the Worker. Never expose the API key in browser JavaScript, HTML, GitHub commits, or public issue reports.

## Cloudflare configuration

Required Worker secret:

- `SAVEAPI_KEY`: a valid SaveAPI API key, configured with Wrangler secret or in the Cloudflare dashboard.

Optional Worker variable:

- `MAX_PROXY_BYTES`: maximum response size proxied through the Worker. Defaults to 19,500,000 bytes.

For GitHub Actions deployment, add the repository secret `CLOUDFLARE_API_TOKEN` with permission to deploy the Worker. The workflow does not contain credentials.

## Local development

Requires Node.js 20+ and Wrangler:

```sh
npm install --save-dev wrangler
npx wrangler dev
```

## Deployment

```sh
npx wrangler secret put SAVEAPI_KEY
npx wrangler deploy
```

The GitHub Actions workflow deploys on pushes to `main` after `CLOUDFLARE_API_TOKEN` has been configured.

## Search and legal pages

The static site includes About, Contact, Privacy Policy, Terms of Use, Copyright Policy, robots.txt, and sitemap.xml. Canonical URLs currently target:

`https://klypza.cokso344.workers.dev/`

Revisit the canonical URL, sitemap, and Search Console verification if the production hostname changes.

## Responsible use

Only download videos you own or are authorized to save. Respect copyright, privacy, and each source platform's terms. Klypza is an independent service and is not affiliated with the named platforms.
