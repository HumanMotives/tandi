# Sample harvester

Zoekt op Internet Archive naar eerie spraak (old-time radio, B-films, UFO-interviews), transcribeert met Whisper, kiest de beste zinnen en knipt ze als WAV. Elke run levert een eigen auditpagina op Cloudflare Pages op.

## Eenmalig instellen

1. Zet deze map in een GitHub-repo (mag privé).
2. Maak het Pages-project aan: `npx wrangler pages project create sample-harvest --production-branch=main`
3. Repo → Settings → Secrets and variables → Actions:
   - Secret `CLOUDFLARE_API_TOKEN` (token met *Cloudflare Pages: Edit*)
   - Secret `CLOUDFLARE_ACCOUNT_ID`
   - Optioneel secret `ANTHROPIC_API_KEY`: Claude beoordeelt dan elke zin op bruikbaarheid. Zonder key werkt de selectie alleen op trefwoorden.
   - Optioneel variable `PAGES_PROJECT` als je projectnaam anders is.

## Gebruik

Actions → *Harvest samples* → *Run workflow*. Kies preset, aantal items en Whisper-model.
De URL van de auditpagina staat onderaan in de log van de stap *Publiceren*, en in het Cloudflare-dashboard onder het project. Elke batch krijgt een eigen preview-URL en blijft bestaan.

Op de auditpagina: afspelen, bewaren of weg, en de bewaarde clips als zip downloaden (inclusief `bronnen.json` met bron en licentie). Beslissingen worden per browser bewaard.

Verwerkte bestanden komen in `state/processed.txt`, zodat een volgende run nieuw materiaal pakt. Leeg dat bestand om opnieuw te beginnen.

## Afstellen

Alles staat in `config.yaml`: zoekpresets, trefwoorden met gewicht, cliplengte, marge en drempels.

## Tijd en grenzen

- `base.en` doet een half uur radio in een paar minuten op een gratis runner. `small.en` is merkbaar beter, ongeveer 3x trager.
- Een run mag maximaal ~5,5 uur duren. Begin met 5 items × 3 bestanden.
- Preview-URL's op pages.dev zijn openbaar voor wie de link heeft. Afschermen kan met Cloudflare Access.

## Licenties

Niet alles op Internet Archive is publiek domein. `--pd-only` (standaard aan) slaat items zonder duidelijke licentie over, maar die metadata is niet altijd juist. Controleer de licentie van wat je uitbrengt.
