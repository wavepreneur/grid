# Grid

Next.js App mit Supabase-Backend, deployed auf Vercel.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) (Projekt: GridOS)
- [Vercel](https://vercel.com)
- GitHub: `wavepreneur/grid`

## Lokale Entwicklung

1. Abhängigkeiten installieren:

```bash
npm install
```

2. Umgebungsvariablen anlegen:

```bash
cp .env.local.example .env.local
```

Trage deine Supabase-Werte aus dem [Supabase Dashboard](https://supabase.com/dashboard/project/pqkktqnnghldzcudzaph/settings/api) ein.

3. Dev-Server starten:

```bash
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

## Supabase CLI

Das Projekt ist mit Supabase GridOS verknüpft:

```bash
supabase status
supabase db pull
supabase migration new my_change
```

## Deployment (Vercel)

1. Repository auf GitHub pushen
2. In Vercel: **Add New Project** → GitHub Repo `grid` importieren
3. Environment Variables setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy starten
