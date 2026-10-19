# Deploying Trackify for free

- **Backend** (API, Celery worker, Postgres, Redis, HTTPS): one Oracle Cloud Always Free ARM VM, run with Docker Compose from `deploy/`.
- **Frontend**: Cloudflare Pages.
- **File storage**: Cloudflare R2 (already set up).

## 1. Create the VM

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com). A card is needed for verification; Always Free resources are not charged.
2. **Compute → Instances → Create instance**
   - Image: **Canonical Ubuntu 24.04**
   - Shape: **Ampere → VM.Standard.A1.Flex**, 4 OCPUs, 24 GB memory
   - Add your SSH public key (`cat ~/.ssh/id_ed25519.pub`, or let Oracle generate one and download it).
   - If you get an "out of capacity" error, try another availability domain or try again later.
3. Open the ports: click the instance's **subnet → Default security list → Add ingress rules**:
   - Source `0.0.0.0/0`, TCP, destination port `80`
   - Source `0.0.0.0/0`, TCP, destination port `443`
4. Note the instance's **public IP**.

## 2. Set up the server

```bash
ssh ubuntu@<PUBLIC_IP>
git clone https://github.com/coqeks/Trackify.git
cd Trackify
bash deploy/setup-server.sh
exit   # log back in so the docker group applies
```

If the repo is private, set up a GitHub deploy key or a personal access token before cloning.

## 3. Configure and start the backend

```bash
ssh ubuntu@<PUBLIC_IP>
cd Trackify/deploy
cp .env.example .env
nano .env
```

- `API_DOMAIN`: no domain needed. Use your IP with dashes plus `.sslip.io`, e.g. `140-238-12-34.sslip.io`.
- `POSTGRES_PASSWORD` and `SECRET_KEY`: generate each with `openssl rand -hex 32`.
- R2 values: copy from your local `.env`.
- `CORS_ORIGINS`: your Cloudflare Pages URL from step 4. You can fill it in afterwards and run `docker compose up -d` again.

Then start everything:

```bash
docker compose up -d --build
```

The first build takes a while (PyTorch is large). Check it works:

```bash
curl https://<API_DOMAIN>/health      # {"status":"ok"}
docker compose logs -f worker         # watch separation jobs
```

The first separation job also downloads the Demucs model weights. They're cached in a volume afterwards.

## 4. Deploy the frontend to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the Trackify repo.
2. Build settings:
   - Root directory: `frontend`
   - Build command: `npx vite build` (`npm run build` also type-checks, and the frontend currently has TypeScript errors that would fail the build)
   - Build output directory: `dist`
   - Environment variable: `VITE_API_BASE` = `https://<API_DOMAIN>`
3. Deploy, then put the resulting `https://<project>.pages.dev` URL in `CORS_ORIGINS` on the server and run `docker compose up -d`.

Pages redeploys automatically on every push to `main`.

## Updating the backend

```bash
ssh ubuntu@<PUBLIC_IP>
cd Trackify && git pull
cd deploy && docker compose up -d --build
```

## Useful commands (run in `deploy/`)

| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Logs | `docker compose logs -f api` (or `worker`, `caddy`) |
| Restart | `docker compose restart` |
| Database shell | `docker compose exec postgres psql -U trackify` |
| Back up database | `docker compose exec postgres pg_dump -U trackify trackify > backup.sql` |
