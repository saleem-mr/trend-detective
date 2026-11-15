# Publishing

## Current deployment (live)
| item | value |
|---|---|
| host | Hostinger Large `145.223.116.240` (Frankfurt, x86_64, 4 vCPU / 15 GB / 194 GB free) |
| URL | **https://trend.mawqi3k.com/** (DNS: A `trend` → 145.223.116.240, TTL 300) |
| path | `/opt/trend-detective` |
| run | `docker build -t trend-detective .` then `docker run -d --name trend-detective --restart unless-stopped -p 80:3000 --env-file .env trend-detective` |
| secrets | `/opt/trend-detective/.env` (mode 600) — only the optional LLM key |
| TLS | Let's Encrypt cert for `trend.mawqi3k.com` (`certbot --webroot -w /opt/trend-detective/acme`), auto-renew via `certbot-renew.timer` + deploy hook `systemctl reload nginx` |
| topology | host **nginx 1.30** owns 80/443 → proxies to the app on `127.0.0.1:3000`; app container publishes only loopback |
| firewall | **22, 80, 443 only** (MySQL/PostgreSQL/Redis/MongoDB/FTP and 11 admin ports were closed) |
| removed | the `stunnel` SSH-over-443 tunnel and `mada` certs were deleted (backup: `/root/backup-mada-*`) |
| note | `docker compose` is not installed on this host, so use plain `docker build` / `docker run` |


Verified locally: the image builds (195 MB), the container passes `/api/health`, `/api/analyze` and
`/api/chat`, and the C++ engine is compiled inside the image.

## One-command local production check
```bash
docker build -t td .
docker run -d --name td -p 3000:3000 --env-file .env td
curl -s localhost:3000/api/health
```

## Full stack (app + nginx)
```bash
cp .env.example .env      # fill only what you use; LLM keys are optional
docker compose up -d --build
curl -s localhost/api/health
```
Ports 80/443 are published by the `nginx` service; the app itself is not exposed.

## On a fresh VPS (Ubuntu 22.04/24.04)
```bash
# 1. docker
curl -fsSL https://get.docker.com | sh
# 2. code
git clone <repo> /opt/trend-detective && cd /opt/trend-detective
# 3. env
cp .env.example .env && $EDITOR .env
# 4. run
docker compose up -d --build
# 5. TLS
apt install -y certbot
certbot certonly --standalone -d your-domain.tld    # stop nginx first, or use --webroot
#    then uncomment the 443 block in deploy/nginx.conf, mount ./deploy/certs, and
docker compose restart nginx
```

## Operational notes
- **Health**: `GET /api/health` returns engine presence and the active LLM provider chain. Use it as the
  container healthcheck (already configured in the Dockerfile).
- **Chat rate limit**: 20 requests/minute per IP (`CHAT_LIMIT`), returning 429 with `Retry-After`.
- **Caching**: `/vendor/*` is immutable for a year; HTML/JS/CSS use 5-minute freshness; `/api/*` is
  `no-store`.
- **Logs**: `docker compose logs -f app`.
- **Recompute results** (after changing data or engine flags):
  ```bash
  docker compose exec app ./scripts/build_presets.sh
  ```
  or rebuild the image so the new `data/*.json` is baked in.
- **No credentials are required** for the data path (NASA POWER, NASA GIBS, Leaflet is vendored). Only
  the optional LLM chat needs a key.

## Pre-flight checklist
- [ ] `docker compose config` parses
- [ ] `/api/health` → `{"ok":true,"engine":true,...}`
- [ ] `/api/analyze?region=sahel` returns 6/6 variables
- [ ] map tiles load from `gibs.earthdata.nasa.gov` only (no key, no CARTO)
- [ ] chat answers in EN and AR
- [ ] `docker compose logs` has no errors
- [ ] rotate any key that was shared in chat during development