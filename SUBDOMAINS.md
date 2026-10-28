# Graduate-specific subdomains (Coolify)

Example base domain: `graduation.elive.co.tz`.
- Platform landing page: `https://graduation.elive.co.tz/`
- Graduate microsite: `https://veronica.graduation.elive.co.tz/`
- Existing URL remains supported: `https://graduation.elive.co.tz/s/veronica`

## Deployment prerequisites

1. In DNS, point `graduation.elive.co.tz` and `*.graduation.elive.co.tz` to the server/proxy (using A/AAAA records or appropriate CNAME records as supported by the DNS provider).
2. Add BOTH `graduation.elive.co.tz` and `*.graduation.elive.co.tz` as Coolify frontend domains, and ensure the proxy routes them to the same frontend service. Issue an HTTPS certificate covering the wildcard; wildcard certificates generally require DNS validation, not ordinary HTTP validation.
3. Set `SITES_BASE_DOMAIN=graduation.elive.co.tz` in the Compose application environment BEFORE redeployment. The Compose file passes this to the backend and to the Vite frontend Docker build. You must REBUILD the frontend after changing it.
4. Redeploy and test the platform root, a known active graduate subdomain, and a legacy `/s/{slug}` URL.

The backend uses the incoming Host header; Nginx forwards Host to the API. Only subdomains that exactly match the configured base-domain suffix and contain a valid graduate slug resolve. Unpublished or expired graduates return an unavailable result. Set up DNS and HTTPS before sharing live subdomains.

**Security:** Make sure the Coolify reverse proxy receives requests only for configured hostnames. Do not add arbitrary catch-all public wildcard behavior outside your intended domain.
