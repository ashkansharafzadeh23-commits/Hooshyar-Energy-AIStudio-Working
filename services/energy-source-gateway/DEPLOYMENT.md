# HOOSHYAR ENERGY SOURCE GATEWAY — DEPLOYMENT & OPERATION GUIDE
**Stage 13.10.2-C2D: Deployment Readiness & Operational Architecture**

> **IMPORTANT DEVELOPMENT STATUS NOTICE**:
> The Hooshyar Energy platform is currently in active development.
> No production server, Iran-side hosting, live SMS gateway, or live SATBA crawl is currently active or deployed.
> The service definitions, systemd unit files, Docker configurations, and reverse proxy snippets in this document are **future operational specifications** provided for architectural readiness. They have not been deployed to a production environment.

---

## 1. Architectural Overview & Responsibility Boundaries

The **Hooshyar Energy Source Gateway** is an isolated, autonomous microservice designed to run inside Iran network perimeter (or co-located in staging) to reliably fetch approved official Iranian renewable energy data sources (such as SATBA — سازمان انرژی‌های تجدیدپذیر و بهره‌وری انرژی برق).

### Strict Service Boundaries
* **Permitted Scope**:
  * Authenticate cryptographically signed requests from the Main Backend via canonical HMAC-SHA256.
  * Resolve server-controlled resource policies (never arbitrary client URLs).
  * Securely fetch official upstream documents over HTTPS with DNS rebinding protection and SSRF filtering.
  * Construct a signed response envelope (`GatewayFetchResponseEnvelope`) binding the original request nonce and payload SHA-256.
* **Strictly Prohibited**:
  * Zero editorial candidate creation.
  * Zero publication of `EnergyInformationRecord`.
  * Zero database access to Main Backend `db.json` or PostgreSQL.
  * Zero Persian linguistic normalization or deduplication.
  * Zero arbitrary proxying or unapproved outbound traffic.

---

## 2. Environment Variables & Configuration

The service is configured purely through environment variables:

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `ENERGY_GATEWAY_PORT` | No | `3100` | Port for the HTTP server to listen on. |
| `ENERGY_GATEWAY_HMAC_SECRET` | **YES** | *None* | Shared secret between Main Backend and Gateway. Must be at least 32 bytes (256-bit entropy). |
| `ENERGY_GATEWAY_ID` | No | `hooshyar-gateway-pilot-01` | Unique identifier of this gateway instance. |
| `NODE_ENV` | No | `production` | Node environment (`production`, `staging`, `development`). |
| `RUN_STANDALONE_GATEWAY` | Yes (for direct run) | `false` | When set to `true`, `server.ts` activates the HTTP listener on start. |
| `ENERGY_GATEWAY_RATE_LIMIT_MAX` | No | `60` | Maximum requests per sliding window minute per client. |

---

## 3. Cryptographic Secret Management & Rotation

### Generation of Strong HMAC Secrets
Generate a cryptographically secure 256-bit secret using OpenSSL:
```bash
openssl rand -hex 32
```
Example output:
```
e9b25f8a1c4d7e0f3b5a6c8d1e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f
```

### Storage & Injection Rules
* **Never commit secrets** to git or configuration files.
* Inject secrets via Docker Secrets, Kubernetes Secrets, or a protected `systemd` environment file (`chmod 600 /etc/hooshyar/gateway.env`).
* Both Main Backend (`ENERGY_GATEWAY_HMAC_SECRET`) and Gateway must share the identical secret.
* **Rotation Procedure**:
  1. Stand up secondary gateway instance with new secret key ID.
  2. Update Main Backend key map.
  3. Decommission old secret after grace window.

---

## 4. Standalone Startup & Process Management

### Independent Execution with Node.js
```bash
export NODE_ENV=production
export ENERGY_GATEWAY_PORT=3100
export ENERGY_GATEWAY_HMAC_SECRET="<YOUR_32_BYTE_HEX_SECRET>"
export RUN_STANDALONE_GATEWAY=true

node --loader ts-node/esm services/energy-source-gateway/server.ts
```

### Systemd Service Definition (`/etc/systemd/system/hooshyar-gateway.service`)
```ini
[Unit]
Description=Hooshyar Energy Source Gateway
After=network.target

[Service]
Type=simple
User=hooshyar-gateway
Group=hooshyar-gateway
WorkingDirectory=/opt/hooshyar-energy
EnvironmentFile=/etc/hooshyar/gateway.env
ExecStart=/usr/bin/node dist/services/energy-source-gateway/server.js
Restart=always
RestartSec=5
KillMode=process
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Docker Container Specification
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY services/energy-source-gateway ./services/energy-source-gateway
RUN npx tsc -p services/energy-source-gateway/tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV RUN_STANDALONE_GATEWAY=true
USER node
COPY --from=builder /app/dist ./dist
EXPOSE 3100
CMD ["node", "dist/services/energy-source-gateway/server.js"]
```

---

## 5. Reverse Proxy & HTTPS Termination

The gateway application should bind to loopback (`127.0.0.1:3100`) and sit behind a hardened reverse proxy (NGINX or Caddy) with TLS termination.

### NGINX Hardened Configuration (`/etc/nginx/conf.d/gateway.conf`)
```nginx
server {
    listen 443 ssl http2;
    server_name gateway.energy.hooshyar.internal;

    ssl_certificate /etc/ssl/certs/gateway.crt;
    ssl_certificate_key /etc/ssl/private/gateway.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 64k;
    client_body_timeout 10s;
    client_header_timeout 10s;

    # Restrict ingress to Main Backend IPs only
    allow 10.0.0.0/8;       # Internal VPN / VPC
    allow 192.168.1.0/24;   # Staging VPC
    deny all;

    location /health {
        proxy_pass http://127.0.0.1:3100/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /api/v1/fetch {
        proxy_pass http://127.0.0.1:3100/api/v1/fetch;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 15s;
        proxy_send_timeout 10s;
    }
}
```

---

## 6. Health Checks & Observability

### Health Endpoint
* **Path**: `GET /health`
* **Response**:
  ```json
  {
    "status": "ok",
    "service": "hooshyar-energy-source-gateway",
    "protocolVersion": "1.0"
  }
  ```
* **Security**: Publicly accessible on local network, unauthenticated, never exposes secrets, nonces, or configuration keys.
* **Liveness / Readiness Probe**:
  ```yaml
  livenessProbe:
    httpGet:
      path: /health
      port: 3100
    initialDelaySeconds: 5
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /health
      port: 3100
    initialDelaySeconds: 2
    periodSeconds: 5
  ```

### Structured Sanitized Logging
The Gateway outputs single-line JSON logs to `stdout`/`stderr`.
* Event types:
  * `GATEWAY_SERVICE_STARTED`
  * `GATEWAY_FETCH_COMPLETED`
  * `GATEWAY_ERROR`
* **Sanitization Guarantee**: Secrets, raw authentication tokens, complete response bodies, and cookies are never printed to logs.

---

## 7. Future Iran-Side Hosting & Network Infrastructure

When deploying the gateway to an Iranian data center (e.g. Asiatech, Afranet, MobinNet, ArvanCloud):

1. **National Intranet Routing**:
   * Official government websites (`.gov.ir` domains like `satba.gov.ir`) may be throttled or inaccessible from foreign IPs during high security alerts.
   * Hosting the Gateway on an Iran-based VPS guarantees low latency and 99.9% availability for official energy data crawls.
2. **DNS Configuration**:
   * Use reputable local Iranian DNS resolvers (e.g. `10.202.10.202` / `10.202.10.10`) alongside root resolvers.
   * The built-in DNS Rebinding Guard resolves every IP before connecting and aborts on any private or deceptive answer.
3. **Outbound Firewall Policy (Egress Hardening)**:
   * Egress must be restricted to port 443 (HTTPS) only.
   * Block all outbound port 80 (HTTP) to enforce encryption.
   * Block all outbound access to RFC1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and cloud metadata (`169.254.169.254`).

---

## 8. Operational Pre-Flight Checklist

Before enabling live traffic between Main Backend and Gateway:

- [ ] `ENERGY_GATEWAY_HMAC_SECRET` is set to >= 32-byte cryptographic random hex.
- [ ] `GET /health` returns HTTP 200 with protocolVersion `1.0`.
- [ ] Rate limiting is verified (`429 RATE_LIMIT_EXCEEDED` on flood).
- [ ] Replay attack detection is verified (`401 REPLAY_DETECTED` on repeated nonce).
- [ ] Zero unapproved SATBA policies are present in production (`defaultGatewayPolicyRegistry.count === 0`).
- [ ] Main Backend client (`EnergyGatewayClient`) is configured with the identical secret and base URL.
- [ ] No public database writes or automatic publication occurs without editorial approval.
