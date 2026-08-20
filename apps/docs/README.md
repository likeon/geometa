# Learnable Meta documentation

The public documentation site is an Astro Starlight app served at
`https://docs.learnablemeta.com`.

## Local development

```sh
npm ci
npm run dev
```

Run `npm run check` and `npm run build` before opening a pull request.

## Deployment

Pull requests build the production container without publishing it. Changes to
`apps/docs` on `main` publish `ghcr.io/likeon/geometa-docs`, then Flux deploys
the image to the `docs` service in Kubernetes.

The generated API pages use the live OpenAPI schema. Run the **Build docs**
workflow manually after an API-only deployment when those pages need refreshing.

### One-time setup

1. After Flux creates `docs-update-receiver`, combine its
   `.status.webhookPath` with the existing Flux receiver base URL and save the
   full URL as the `FLUX_RECEIVER_DOCS` GitHub Actions secret.
2. In the existing Cloudflare Tunnel, add the public hostname
   `docs.learnablemeta.com` with the service URL `http://docs:80`. Cloudflare
   will create the proxied DNS record and certificate.
