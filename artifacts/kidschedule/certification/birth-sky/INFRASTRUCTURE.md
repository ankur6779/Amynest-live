# Birth Sky INFRASTRUCTURE

**Authority for RC3 / GA1 / GA2 production references.**

| Component | Platform | Notes |
| --- | --- | --- |
| Backend API | Coolify on Hetzner VPS | https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io |
| PostgreSQL | Coolify Postgres on Hetzner | tcl9udyxcuq2zu598ebj0pfu |
| Redis | Coolify Redis on Hetzner | BullMQ |
| Static SPA | Cloudflare | www.amynest.in |
| API routing | Cloudflare Worker | amynest-api-proxy → Coolify |
| AI Worker | Dedicated Hetzner server | 167.233.39.146 amynest-worker |


Render is **not** production. Do not probe or document Render as the deploy target.
