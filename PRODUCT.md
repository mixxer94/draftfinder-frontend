# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ein Freundeskreis aus der deutschsprachigen Age-of-Empires-II-Szene, der sich über Discord organisiert. Man kennt sich, und die Inhalte leben von Insider-Wissen über die Mitspieler.


- **Helfer**: unterstützen die Turnierleitung und sehen nur Übersicht, Bracket und Termine im Admin-Bereich.
- **Teilnehmer und Zuschauer**: geben Tipps ab, verfolgen den Turnierbaum und schauen sich Auswertungen und Drafts an.

## Product Purpose

draftfinder.de bündelt mehrere kleine Community-Tools. Im Mittelpunkt steht der **Gliddencup**, ein Turnier, in dem alle Teilnehmer unter Pseudonym antreten. Die Community tippt, wer hinter welchem Pseudonym steckt.

Die Entwicklung konzentriert sich auf die **Admin-Oberfläche unter `/gliddencup/admin/*`**. Sie ist erfolgreich, wenn die Turnierleitung ein komplettes Turnier ohne Umwege über Server-Konsole oder Chat durchführen kann: Sie sieht jederzeit, was offen ist, und kann es mit wenigen Klicks erledigen.

## Positioning

Die Seite ist ein maßgeschneidertes Werkzeug für genau dieses eine Pseudonym-Turnierformat und diesen einen Freundeskreis, kein allgemeines Turnier-Tool. Anonymität der Teilnehmer, Tippspiel und Auflösung gehören zum Kern des Formats.

## Operating Context

- Der Turnierablauf im Admin-Bereich: Anmeldungen → Runden → Auslosung → Matches freigeben → Bracket → Termine → Replays, dazu ein Audit-Log. Die Übersicht zeigt nur offene Punkte, ohne die es nicht weitergeht, sowie laufende Matches.
- Die Formate sind Single und Double Elimination (z. B. `RO16_DE`, Best-of-3) mit Winner Bracket, Loser Bracket und Grand Final.
- Das Turnier wird einmalig per Seed-Skript auf dem Server angelegt.
- Drafts laufen extern über aoe2cm.net, der Draft Finder verlinkt dorthin. Die Presets sind Civdrafts sowie Mapdrafts für Liga 1–5 und Liga 6–9.
- Die öffentliche Tipp-Seite unter `/gliddencup` hat die Tabs Tippen, Teilnehmer, Turnierbaum und nach der Auflösung Tipps ansehen und Auswertungen. Das öffentliche Bracket liegt unter `/gliddencup/[slug]`.
- Die Nutzung ist gemischt: Die Tipp-Seite wird auch auf Touch-Geräten verwendet und hat eine eigene Mobil-Variante.

## Capabilities and Constraints

- Stack: Vue 3, Vuetify 3, Vite, dateibasiertes Routing (`unplugin-vue-router`), Axios. Hell- und Dunkel-Theme folgen `prefers-color-scheme`.
- Das Backend ist eine eigene API unter `/api` bzw. `/api/gliddencup`. Die Rechteprüfung macht die API, das Frontend blendet nur vorab aus.
- Weitere Bereiche: Draft Finder (Startseite), Billy Tracker (VOD-Statistik eines Twitch-Streamers), API-Info.
- Oberflächensprache ist Deutsch, per Du.
- Begriffe: Turnierleitung, Helfer, Anmeldung, Auslosung, Freigabe, startklar, gewertet, Pseudonym, Tipp.

## Brand Commitments

- Ton: sachlich-freundlich, per Du, klar und nützlich, ohne Gags in der Oberfläche. Insider-Inhalte wie Spielerzitate sind Inhalt, keine Tonvorgabe für UI-Texte.
- Rechtlicher Hinweis: Die Seite nutzt Assets aus Age of Empires II: DE unter Microsofts „Game Content Usage Rules“. Der Footer-Hinweis dazu muss erhalten bleiben.

## Evidence on Hand

- Civ-Embleme: `public/civemblems/*.png`
- Map-Bilder: `public/maps/*.png`

- Spielerprofile mit Werten und Zitaten: `src/assets/players.json`. Match-Daten liegen in `src/assets/matches.json`.
- Es gibt keine Testimonials, Nutzerzahlen oder Presse, und es sollen auch keine erfunden werden.

## Product Principles

1. **Die Turnierleitung zuerst.** Neue Arbeit dient vor allem dem Admin-Bereich. Was dort Schritte spart oder Fehler verhindert, hat Vorrang.
2. **Zeigen, was offen ist.** Jede Admin-Ansicht beantwortet zuerst die Frage, was jetzt zu tun ist. Status und nächster Schritt stehen vor Vollständigkeit.
3. **Anonymität schützen.** Nichts in öffentlichen Ansichten darf die Identität hinter einem Pseudonym vor der Auflösung verraten.
4. **Nachvollziehbar statt magisch.** Aktionen mit Folgen, etwa Auslosung, Freigabe oder Wertung, werden bestätigt und im Audit-Log festgehalten.
5. **Klein halten.** Es ist ein Werkzeug für einen Freundeskreis. Einfache Lösungen schlagen generische Turnier-Features.

## Accessibility & Inclusion

Die Statusfarben (warning, success, info) sind im Theme so abgedunkelt, dass sie auf background und surface WCAG AA (4,5:1) erreichen. Dieser Kontraststandard soll beibehalten werden.
