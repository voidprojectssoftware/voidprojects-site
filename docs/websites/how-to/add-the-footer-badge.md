> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Add the "Made by Void Projects" footer badge to a client site

Every site we build links back to [voidprojects.ai/websites](https://voidprojects.ai/websites) from its footer. The badge shows a freshly generated Void Projects orbit mark on every visit.

## Paste the badge

Put this in the client site's footer:

```html
<a href="https://voidprojects.ai/websites" style="display:inline-flex;align-items:center;gap:6px">
	<img src="https://voidprojects.ai/api/mark.svg" width="20" height="20" alt="" />
	<span>Made by <strong>Void Projects</strong></span>
</a>
```

It needs no script. The text inherits the client site's font and colors, so restyle the `<a>` to fit their footer if needed. The mark is brand violet and reads on both light and dark backgrounds.

## How the mark endpoint behaves

`GET https://voidprojects.ai/api/mark.svg`

| Request                 | Response                                           |
| ----------------------- | -------------------------------------------------- |
| no query                | a new mark each request, `Cache-Control: no-store` |
| `?seed=<0..2147483647>` | the same mark for that seed, cacheable for a day   |
| any other `seed`        | `400` with a plain-text reason                     |

The endpoint is an Azure Function in `api/src/mark.ts`, bundled by `npm run build:api` and deployed as the Static Web App's managed API. Under `npm run dev` the same endpoint is served by a Vite middleware. The first request after the function has been idle takes about a second while it starts up.
