# VK miner (MVP)

Zoekt eerie spraaksamples op heel Internet Archive (inclusief Prelinger) en knipt ze als WAV.
Pagina: humanmotives.org/vkminer/

## Gebruik (geen GitHub-account nodig)
- Nieuwe batch: knop Nieuwe batch → zoekwoorden en trefwoorden → Start batch.
  Duurt 15–30 minuten; de pagina laat de nieuwe batch vanzelf zien.
- Langer of meer uit een bron: knop Langer of Meer uit bron → zinnen aanvinken → Knip selectie.
- Zoekwoorden leeg = lijst onder search in tool/config.yaml.
  Trefwoorden komen bovenop keywords in tool/config.yaml.

## Eenmalig instellen (Chris)
1. GitHub-token: github.com → Settings → Developer settings → Fine-grained tokens → Generate new token.
   Resource owner: HumanMotives. Repository access: alleen tandi. Permissions: Actions → Read and write.
2. Netlify: site → Site configuration → Environment variables:
   - GITHUB_TOKEN = het token
   - GITHUB_REPO  = HumanMotives/tandi
   - VKMINER_PASSWORD = optioneel; vul in als alleen de band mag starten
3. Netlify: Deploys → Trigger deploy.

## Overig
Dubbelingen: al geknipte zinnen staan in tool/seen.txt; leeg dat bestand om opnieuw te beginnen.
Optioneel: GitHub-secret ANTHROPIC_API_KEY voor betere selectie.
Opruimen: oude mappen in batches/ verwijderen plus de regel in batches.json.
Niet alles op Internet Archive is publiek domein. Controleer de licentie voor je iets uitbrengt.
