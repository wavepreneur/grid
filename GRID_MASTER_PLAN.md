# GRID - The Enterprise Experience OS (Phase 1: Exitmania MVP)

## 1. Vision & Produkt-Positionierung
GRID ist eine Zero-Ops-Infrastruktur-Plattform (SaaS), die interaktive Gruppen-Erlebnisse für Unternehmen global skaliert und messbar macht. 
Als Proof of Concept und erste "App" auf GRID läuft das Produkt **Exitmania** (Self-guided Teambuilding & Escape Games für bis zu 10.000+ Teilnehmer gleichzeitig).

Das System muss zwei Szenarien fehlerfrei bedienen:
1. **Outdoor-Events (Exitmania Standard):** GPS-basiertes Gameplay in 1900+ Städten weltweit.
2. **Custom- & Corporate-Events:** Unternehmen können Routenpunkte flexibel selbst verlegen (z. B. um das eigene Firmengelände) und eigene Multiple-Choice-Quizfragen als Bonusaufgaben einbetten.

---

## 2. Der Tech-Stack
* **Framework:** Next.js (App Router, React)
* **Backend & Datenbank:** Supabase (PostgreSQL)
* **Realtime-Layer:** Supabase Realtime (WebSockets) für sofortigen State-Sync zwischen den Devices
* **Hosting:** Vercel
* **Styling:** Tailwind CSS (Cyberpunk/High-Tech-Look: Dunkler Hintergrund, neon-türkise Akzente gemäß Datei `screencapture-exitmania-grid-2026-04-21-17_39_21.jpg`)

---

## 3. Die 4 MVP-Kernfeatures (Streng sequenzieller Bauplan)

Cursor MUSS den Entwickler blockieren oder aktiv warnen, wenn an Phase N gearbeitet wird, bevor Phase N-1 vollständig und stabil implementiert ist.

### Phase 1: Zero-Auth Lobby & Team-Setup
* **Ziel:** Maximal barrierefreier Einstieg für non-tech User. Keine Passwörter, keine E-Mail-Verifikation für Spieler.
* **Ablauf:** 
  1. Admin erstellt Event -> System generiert globalen Einladungs-Link/QR-Code.
  2. Der erste Klicker (Captain) bestimmt Teamgröße (1-8 Personen), vergibt den Teamnamen und wählt die Abteilungs-/Länder-Zugehörigkeit aus (Metadaten-Auswahl).
  3. Weitere Mitglieder klicken auf den Link, vergeben einen Usernamen und landen in der Echtzeit-Lobby.
  4. Spiel startet manuell durch den Captain oder automatisch nach 3 Minuten.

### Phase 2: Die Realtime State-Engine & Sync
* **Ziel:** Alle Geräte im Team sind zu jeder Millisekunde synchron.
* **Ablauf:** 
  * Lösen Spieler A und B auf der Straße oder am Desktop ein Rätsel, wird das Event an Supabase gesendet.
  * Per Supabase Realtime ploppt bei Spielern C bis H sofort ein Modal auf ("Rätsel gelöst!") und die App springt für alle synchron in das nächste Level.

### Phase 3: Der flexible Location- & Content-Layer (Exitmania Engine)
* **Ziel:** Das 10-Level-Spiel muss Standard-Routen, selbst verlegte GPS-Punkte und Custom-Unternehmens-Quizzes (Multiple Choice) dynamisch laden können.
* **Ablauf:** 
  * Jedes Level basiert auf einer JSON-Struktur (GPS-Koordinate, Inhalt, Typ).
  * Wenn ein Admin im Dashboard eigene Routenpunkte setzt oder Fragen hochlädt, überschreibt das System die Standard-Exitmania-Werte für dieses spezifische Event.
  * Das System gleicht via Geofencing (GPS-Toleranzradius im Browser) ab, ob das Team am richtigen Punkt steht. Ist das Event rein digital oder eine Bonusfrage, wird das GPS-Tracking für dieses Level ignoriert.

### Phase 4: Minimalistisches Data-Logging (Vorbereitung für HR-Insights)
* **Ziel:** Daten so sammeln, dass später tiefgehende Organisationsanalysen (ONA) möglich sind, ohne den Datenschutz (DSGVO) zu verletzen.
* **Ablauf:** Bei jeder Interaktion (Klick, Fehlversuch, gelöstes Rätsel, Hilfe angefordert) loggt das System anonymisiert in Supabase: `timestamp`, `user_id`, `team_id`, `event_type`, `metadata` (Abteilung/Region). Keine Speicherung von Klarnamen oder präzisen Bewegungsprofilen nach Event-Ende.

---

## 4. Richtlinien für Cursor als Co-Pilot / Architektur-Guide
* **Nicht blind coden:** Wenn der Nutzer ein Feature anfordert, das die Stabilität gefährdet oder die Komplexität im MVP unnötig erhöht, schlage eine einfachere, elegantere Lösung vor.
* **Privacy by Design:** Achte bei jedem Datenbank-Schema darauf, dass die Datenstruktur strikt anonymisiert bleibt, damit das Produkt vor jedem Enterprise-Betriebsrat besteht.
* **Offline-Resilienz:** Da das Spiel in Funklöchern funktionieren muss, leite den Entwickler an, kritische Spielzustände im `LocalStorage` zu puffern.
