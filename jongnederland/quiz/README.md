# Jong Nederland Quiz MVP

Statische demo voor GitHub + Netlify.

## Bestanden

- `index.html` - structuur van de quizmodule
- `styles.css` - styling gebaseerd op Jong Nederland kleuren en speelse campagnevormen
- `script.js` - quizvragen, puntentelling en resultaatlogica

## Aanpassen

### CTA links
Pas de links onderaan in `index.html` aan:

- Vind een club in de buurt
- Bekijk activiteiten
- Schrijf je in voor nieuws

### Quizvragen
Pas vragen en antwoorden aan in `script.js` in de array `quizData`.

### Resultaten
Pas de resultaatteksten aan in `script.js` onder `results`.

### Kleuren
De hoofdkleuren staan bovenaan in `styles.css` als CSS variables:

- `--natuur-groen: #aacf64`
- `--bos-groen: #244622`
- `--zand-beige: #faf2e8`
- `--zon-geel: #f5c368`
- `--water-blauw: #8fd4ec`
- `--nacht-blauw: #033b6e`

## Netlify deploy

1. Maak een nieuwe GitHub repository.
2. Upload deze bestanden naar de root van de repository.
3. Koppel de repository aan Netlify.
4. Build command leeg laten.
5. Publish directory: `/` of leeg laten, afhankelijk van Netlify instelling.

## Integratie later

Deze versie gebruikt geen externe libraries, geen database en geen tracking. Daardoor is hij makkelijk te hosten, te embedden of later om te bouwen naar WordPress/plugin-code.
