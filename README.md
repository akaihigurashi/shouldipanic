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

Add an entry at the top of [`scanners.json`](scanners.json) (newest first), then:

```bash
python3 build.py      # renders site/index.html from template.html
```

## Run it

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
