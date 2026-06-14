#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Fehler: .env.local fehlt. Kopiere zuerst .env.local.example."
  exit 1
fi

set -a
source .env.local
set +a

echo "==> GitHub Login (falls noch nicht eingeloggt)"
gh auth status >/dev/null 2>&1 || gh auth login

echo "==> GitHub Repository erstellen und pushen"
if ! gh repo view wavepreneur/grid >/dev/null 2>&1; then
  gh repo create wavepreneur/grid --public --source=. --remote=origin --push
else
  git push -u origin main
fi

echo "==> Vercel Login (falls noch nicht eingeloggt)"
vercel whoami >/dev/null 2>&1 || vercel login

echo "==> Vercel Projekt verknüpfen und deployen"
vercel link --yes

for env in production preview development; do
  printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL "$env"
  printf '%s' "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$env"
done

vercel --prod

echo "Fertig."
