# VK miner

Zoekt eerie spraaksamples op Internet Archive en knipt ze als WAV.
Pagina: humanmotives.org/vkminer/

## Startknop instellen (eenmalig)

1. GitHub-token maken: github.com → Settings → Developer settings →
   Fine-grained tokens → Generate new token.
   - Repository access: alleen de website-repo
   - Permissions: Actions → Read and write
2. Netlify: je site → Site configuration → Environment variables →
   Add a variable. Voeg toe:
   - GITHUB_TOKEN      = het token uit stap 1
   - GITHUB_REPO       = jouwnaam/reponaam (zoals in de GitHub-URL)
3. Doe daarna een willekeurige commit in de repo, zodat Netlify opnieuw publiceert.

## Gebruik

Pagina → Nieuwe batch → instellingen kiezen → Start batch.
Een run duurt meestal 15–30 minuten. De pagina toont de voortgang en laadt
de nieuwe batch zodra die online staat. Starten kan ook via
GitHub → Actions → VK miner → Run workflow.

Optioneel: GitHub-secret ANTHROPIC_API_KEY voor betere selectie
(repo → Settings → Secrets and variables → Actions).

## Instellingen

Zoekopdrachten, trefwoorden en cliplengte: tool/config.yaml

## Opruimen

WAV-bestanden maken de repo groot. Download wat je wilt houden (zip-knop),
verwijder daarna oude mappen in batches/ en de bijbehorende regel in batches.json.

Niet alles op Internet Archive is publiek domein. Controleer de licentie voor je iets uitbrengt.
