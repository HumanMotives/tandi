# Jong Nederland homepage demo

Losse HTML/CSS/JS demo voor GitHub + Netlify.

## Bestanden

- `index.html`
- `styles.css`
- `script.js`
- `images/logo-mark.png`
- `images/hero-kind-placeholder.svg`

## Laatste wijzigingen

- Polaroid-fotocollage in de hero verwijderd.
- Hero aangepast naar een vrijstaand kind/karakter met bordje.
- Wisselende woorden toegevoegd: spelen, vies worden, lachen, ontdekken, maken, vrienden.
- Menu gebruikt nu het geüploade Jong Nederland beeldmerk.

## Eigen afbeeldingen gebruiken

Zet nieuwe afbeeldingen in:

```txt
/images/
```

Vervang in `index.html` bijvoorbeeld:

```html
<img class="character-img" src="images/hero-kind-placeholder.svg" alt="Kind met bordje: Jong Nederland is...">
```

Door:

```html
<img class="character-img" src="images/jouw-afbeelding.png" alt="Kind met bordje">
```

Beste resultaat: vrijstaande PNG/WebP met transparante achtergrond.
