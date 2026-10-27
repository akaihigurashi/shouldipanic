<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.png">
    <img alt="shouldipanic" src="docs/logo-light.png" width="351">
  </picture>
</h1>

The landing page of [shouldipanic.ch](https://shouldipanic.ch): free checks for
current web vulnerabilities. Each vulnerability has its own scanner with its own
repository:

- [brotli2scan](https://github.com/akaihigurashi/brotli2scan): HTTP2Shell (CVE-2026-111497, Brotli)
- [php2scan](https://github.com/akaihigurashi/php2scan): PHP2Shell (CVE-2026-109618 / -109619)

Their shared engine is [panic-core](https://github.com/akaihigurashi/panic-core).

## Adding a scanner to the page

Add an entry to [`scanners.json`](scanners.json) (newest first), then:

```bash
python3 build.py      # renders site/index.html and site/scanners.css
```

Add the scanner to [`deploy/docker-compose.yml`](deploy/docker-compose.yml) and
[`deploy/nginx.conf`](deploy/nginx.conf) too.

## Run the whole site

[`deploy/`](deploy) has everything to run shouldipanic.ch yourself on one machine:
the landing page and every scanner, each in its own hardened container, behind nginx.

1. **DNS**: point `example.ch` and `*.example.ch` to the machine.
2. **Certificate**: one for `example.ch` and `*.example.ch`, e.g.
   `certbot certonly --dns-<provider> -d example.ch -d '*.example.ch'`.
3. **Containers**:
   ```bash
   mkdir /opt/shouldipanic && cd /opt/shouldipanic
   curl -LO https://raw.githubusercontent.com/akaihigurashi/shouldipanic/main/deploy/docker-compose.yml
   curl -L -o .env https://raw.githubusercontent.com/akaihigurashi/shouldipanic/main/deploy/.env.example
   chmod 600 .env && nano .env          # set DOMAIN, the rest is optional
   docker compose pull && docker compose up -d
   ```
4. **nginx**: copy [`deploy/nginx.conf`](deploy/nginx.conf) to `/etc/nginx/conf.d/`,
   replace `example.ch` with your domain, then `nginx -t && systemctl reload nginx`.
5. **Optional access key** (no limits for you, IP addresses allowed):
   `docker exec -it php2scan python3 web.py --make-key yourname --origin https://example.ch`,
   put the two printed lines into `.env`, `docker compose up -d`, open the magic link.

Updates: `docker compose pull && docker compose up -d`. The images are rebuilt weekly
with the latest security updates.

## Only the landing page

The page is static (`site/`). The Docker image serves it with unprivileged nginx
on port 8090 and strict security headers:

```bash
docker run -d --name shouldipanic --restart unless-stopped -p 127.0.0.1:8090:8090 \
  ghcr.io/akaihigurashi/shouldipanic:latest
```

No cookies, no tracking, no third-party requests; fonts are self-hosted.

## License

GPL-3.0, see [LICENSE](LICENSE). Fonts: Bricolage Grotesque, Instrument Sans and
JetBrains Mono (SIL Open Font License, see `site/fonts/`).
