---
target: src/pages/gliddencup/admin
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Projects\\draftfinder-frontend\\src\\pages\\gliddencup\\admin"
timestamp: 2026-09-26T02-11-58Z
slug: src-pages-gliddencup-admin
---
# Critique: GliddenCup-Admin (src/pages/gliddencup/admin)

Method: dual-agent. Grundlage: Quellcode-Review; Browser-Prüfung nicht möglich (kein Login, Claude in Chrome nicht eingerichtet).

## Design Health Score: 27/40 (Acceptable)
1 Systemstatus 3 · 2 Reale Welt 3 · 3 Kontrolle 2 · 4 Konsistenz 2 · 5 Fehlervermeidung 3 · 6 Wiedererkennen 3 · 7 Effizienz 2 · 8 Minimalismus 3 · 9 Fehlerbehebung 3 · 10 Hilfe 3

## Design-Spezifität
Verhalten maßgeschneidert, Form Standard-Vuetify. Detektor: 0 Befunde im Quellcode; 3× layout-transition im URL-Scan sind Vuetify-interne Fehlalarme.

## Priority Issues
- [P1] Runden-Formular übernimmt gespeicherte Werte nicht (rounds.vue:61); PUT schickt leere Presets mit, „Für alle Runden“ ohne Rückfrage. → harden
- [P1] Übersicht nicht live; „Blockiert“/„Eskaliert“ ohne Link (index.vue:150-151). → clarify / shape
- [P2] „Starten“ als Primär-Button neben „Details“ (index.vue:62-73, matches/[id].vue:13-22), in der Freigabe dagegen Notfall-Aktion. → quieter
- [P2] Match-Details: acht gleichrangige Abschnitte, kein nächster Schritt; Korrektur immer offen; Chat lädt automatisch und erzeugt Audit-Einträge. → distill
- [P2] A11y: fehlende Labels (admin.vue:17,45, Pseudonym-Feld, Empfänger-Select, Auslosungs-Selects), Buttons ohne Zeilenkontext, opacity .55, Farbe als einzige Info im Audit. → audit

## Persona Red Flags
- Alex: keine Sammel-Freigabe, busy sperrt alle Zeilen, v-select ohne Tippsuche, kein Enter/Strg+Enter.
- Sam: Auslosungs-Selects ohne Slot-Label, Sieger nur fett, •••••••• vorgelesen.
- Turnierleitung am Turnierabend: Übersicht veraltet still, Blocker nicht klickbar, Deep-Link + Zurück verlässt App, Session-Ablauf verliert Eingaben, Termine ohne Heute/Nächstes.

## Kleinere Beobachtungen
„Vergeben“ ohne Feedback; Anmeldungen heben offene Punkte nicht hervor; fehlende Leerzustände (Bracket, Audit, Runden); Titel „Turnierleitung“ auch für Helfer; Theme-Wahl nicht gespeichert; kein aktiver Nav-Punkt in Match-Details; neutraler Bestätigen-Button bei Auslosung; doppelte Bytes-Formatierung; 9 ungruppierte Nav-Punkte.

## Fragen
- Vorbereitungsschritte nach der Auslosung einklappen?
- Aktionen direkt in der Übersicht erledigen?
- Chat überhaupt automatisch laden, wenn jeder Aufruf protokolliert wird?
