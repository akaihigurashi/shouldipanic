# shouldipanic.ch landing page: static files served by unprivileged nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="shouldipanic" \
      org.opencontainers.image.description="Landing page of shouldipanic.ch" \
      org.opencontainers.image.licenses="GPL-3.0-only"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/

EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8090/healthz || exit 1
