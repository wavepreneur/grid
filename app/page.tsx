import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Grid
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Next.js + Supabase ist bereit
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Das Projekt ist mit Supabase GridOS verbunden. Als Nächstes kannst
            du Auth, Tabellen und deine App-Logik aufbauen.
          </p>
        </div>

        <div className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-left text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <p>
            Supabase Status:{" "}
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {error ? "Verbindungsfehler" : "Verbunden"}
            </span>
          </p>
          <p className="mt-2">
            Session:{" "}
            <span className="font-medium">
              {data.session ? "Aktiv" : "Keine aktive Session"}
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
