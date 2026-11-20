/*
 * Ungefähre Sendezeiten im Stream, je Turnier-Slug und Slot-Code. Die Matches
 * sind vorher aufgezeichnet; `scheduledAt` aus der API ist die echte
 * Spielzeit und gehört deshalb nicht in den Baum.
 *
 * Gliddencup II: 1:30 pro Match (1:15 Spiel, 15 min Puffer), Einführungen
 * 10 min. Samstag nur 1:20, damit das Viertelfinale nach 10 min Übergabe wie
 * angekündigt um 18:00 beginnt.
 */
const AIR_TIMES = {
  gc2: {
    'R1-M4': 'Fr, ca. 19:10',
    'R1-M2': 'Fr, ca. 20:40',
    'R1-M7': 'Fr, ca. 22:10',
    'R1-M1': 'Sa, ca. 11:10',
    'R1-M5': 'Sa, ca. 12:30',
    'R1-M6': 'Sa, ca. 13:50',
    'R1-M3': 'Sa, ca. 15:10',
    'R1-M8': 'Sa, ca. 16:30',
    'R2-M1': 'Sa, ca. 18:00',
    'R2-M2': 'Sa, ca. 19:30',
    'R2-M3': 'Sa, ca. 21:00',
    'R2-M4': 'Sa, ca. 22:30',
    'R3-M1': 'So, ca. 18:10',
    'R3-M2': 'So, ca. 19:40',
    'R4-M1': 'So, ca. 21:10',
  },
}

export const airTimesOf = tournament => AIR_TIMES[tournament?.slug] ?? {}
