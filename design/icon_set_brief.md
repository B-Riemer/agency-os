# Agency OS — Brief für das Agenten-Motiv-Set (Google Stitch)

> Ziel: ein **kohärentes, futuristisches Emblem-Set** für die Agenten-Avatare. Ein Schema, viele
> Rollen. Wird in Agency OS als **Motiv-Bibliothek** angeboten (Auswahl beim Onboarding), mit
> **Foto-Override** (lädt jemand ein Foto hoch, ersetzt es das Motiv).

## Stil-Vorgaben (ein Schema für alle)

- **Look:** holografische **Line-Art**, fein, präzise, „post-2030" — kein flaches 90er-Icon. Erlaubt: feine Doppellinien, dünne Verläufe, dezente Tiefe/Iso-Andeutung, optionaler innerer Akzent.
- **Monochrom & tintbar:** Motive **einfarbig** zeichnen (eine Linienfarbe), damit die App sie pro Agent einfärbt (Rollen-/Status-Farbe) und den **Glow selbst** hinzufügt. **Keinen Glow/Schatten einbacken** — das macht die App (Ring + Bloom).
- **Konsistenz:** identische Strichstärke, identische optische Größe/Schwerpunkt, gleicher Detailgrad über alle Motive. Sie müssen als Familie wirken.
- **Komposition:** optisch zentriert, ~10–12 % Innenabstand, quadratisch.

## Technische Specs (für sauberen 1:1-Austausch)

- **Format:** SVG (Vektor, skaliert scharf von 28 px bis 160 px).
- **viewBox:** `0 0 64 64`, quadratisch.
- **Farbe:** Linien als `stroke="currentColor"`, `fill="none"` → die App setzt `color` (Tint) + `text-shadow`/Filter (Glow). Bitte **keine** festen Hex-Farben.
- **Strichstärke:** einheitlich, ~`2.4`–`2.6`, runde Enden (`stroke-linecap="round"`, `stroke-linejoin="round"`).
- **Aufgeräumt:** ohne `<defs>`-Ballast/IDs-Kollisionen, optimiert (z. B. SVGO).
- **Dateinamen:** kebab-case = der `icon`/motif-Schlüssel (siehe Tabelle), z. B. `strategy-target.svg`.

## Rollen → Motiv (Startset, erweiterbar)

| Schlüssel (`icon`) | Rolle | Motiv-Idee (futuristisch) |
|---|---|---|
| `brain` | CEO (ASTRA) | stilisiertes neuronales Gehirn / Denk-Kern |
| `target` | VP Strategy | Zielscheibe mit Orbit-Ring |
| `analytics` | Lead Analyst | Datendiagramm mit Knotenpunkten |
| `scenario` | Scenario Planner | verzweigender Pfad / Entscheidungsbaum |
| `research` | Market Researcher | Scan-/Lupen-Glyph mit Raster |
| `quill` | VP Content | Feder / Schreibspitze |
| `palette` | Creative Director | abstrakte Paletten-/Form-Komposition |
| `writer` | Lead Writer | Stift mit Textlinien |
| `broadcast` | Social Media Mgr | Signal-/Broadcast-Wellen |
| `cpu` | CTO | Prozessor-/Chip-Sigille |
| `architecture` | Lead Architect | geschichtete Stack-/Blueprint-Struktur |
| `devops` | DevOps Lead | Server/Knoten mit Kreislauf-Pfeilen |
| `ml` | ML Engineer | Modell-/Tensor-Netz |
| `growth` | VP Sales | aufsteigender Trend-Vektor |
| `deal` | Account Executive | Handschlag / Vertrags-Glyph |
| `partner` | External Partner | verbundene Knoten (extern) |
| `outreach` | Sales Dev Rep | Kontakt-/Signal-Glyph |
| `user` | Default-Fallback | generischer Agenten-Kopf/Sigille |

> Externe Agenten brauchen **kein eigenes Motiv** — die App markiert „extern" über den **orangen Ring** + Badge. Motiv folgt der Rolle.

## Integration in Agency OS (so wird es eingetauscht)

1. SVGs ablegen unter `apps/web/src/assets/motifs/<schlüssel>.svg`.
2. Im Daten-/Agenten-Objekt steht pro Agent `icon: "<schlüssel>"` (heute schon im Prototyp vorhanden).
3. Die Avatar-Komponente lädt `motifs/<icon>.svg`, setzt Tint (Agentenfarbe) + Glow, packt es in den Ring. **Foto-Override:** ist `photo` gesetzt, zeigt sie das Foto statt des Motivs.
4. Der Tabler-Platzhalter im Prototyp entfällt damit ersatzlos — **kein Code-Umbau**, nur Assets + Mapping.

## Liefer-Checkliste

- [ ] Ein zusammenhängendes Set, alle Motive im selben Schema.
- [ ] SVG, `0 0 64 64`, `currentColor`, `fill="none"`, einheitliche Strichstärke, runde Enden.
- [ ] Kein eingebrannter Glow/Schatten/feste Farbe.
- [ ] Dateinamen = Schlüssel aus der Tabelle.
- [ ] Optional: 2–3 zusätzliche generische Defaults (`user`, `bot`, `spark`) für neue Rollen.
