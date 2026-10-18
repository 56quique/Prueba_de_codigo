# Cocina del Mundo

Recetas de almuerzo y cena de 19 países. App web instalable (PWA): porciones que recalculan los ingredientes, cronómetro por paso, filtros y modo sin internet.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app (diseño y funciones) |
| `recetas.json` | Todas las recetas y países. Acá se agregan las recetas nuevas |
| `manifest.json` | Nombre, colores e íconos para instalarla en el celular |
| `sw.js` | Guarda la app y las recetas para usarla sin internet |
| `icon-*.png`, `apple-touch-icon.png` | Íconos de la app |
| `img/paises/` | Una foto por país (ver abajo) |

## Publicar en GitHub Pages

1. Creá un repositorio nuevo en GitHub (por ejemplo `cocina-del-mundo`).
2. Subí **todos los archivos sueltos, en la raíz del repositorio** (Add file, Upload files).
3. En Settings, Pages: Source "Deploy from a branch", rama `main`, carpeta `/ (root)`. Guardá.
4. Esperá un minuto. El enlace queda así: `https://TU-USUARIO.github.io/cocina-del-mundo/`

## Instalar en el celular

- **Android (Chrome):** abrí el enlace y tocá el botón amarillo de instalar, o el menú y «Instalar app».
- **iPhone (Safari):** Compartir y «Agregar a pantalla de inicio».

## Fotos de los países

La pantalla de inicio muestra una tarjeta por país y, al tocarla, se abren sus recetas. Las fotos van en la carpeta `img/paises/`, una por país, con estos nombres exactos (en minúscula):

| País | Archivo |
|---|---|
| 🇳🇴 Noruega | `no.webp` |
| 🇯🇵 Japón | `jp.webp` |
| 🇲🇽 México | `mx.webp` |
| 🇮🇹 Italia | `it.webp` |
| 🇮🇳 India | `in.webp` |
| 🇵🇪 Perú | `pe.webp` |
| 🇬🇷 Grecia | `gr.webp` |
| 🇲🇦 Marruecos | `ma.webp` |
| 🇩🇪 Alemania | `de.webp` |
| 🇵🇱 Polonia | `pl.webp` |
| 🇺🇦 Ucrania | `ua.webp` |
| 🇸🇪 Suecia | `se.webp` |
| 🇵🇾 Paraguay | `py.webp` |
| 🇧🇷 Brasil | `br.webp` |
| 🇪🇸 España | `es.webp` |
| 🇫🇷 Francia | `fr.webp` |
| 🇹🇭 Tailandia | `th.webp` |
| 🇰🇷 Corea | `kr.webp` |
| 🇹🇷 Turquía | `tr.webp` |

- Formato WebP (recomendado) o JPG, de unos 1200 x 800 px y menos de 200 KB cada una. La app busca primero `.webp` y, si no lo encuentra, prueba con `.jpg` con el mismo nombre; podés mezclar ambos formatos. Conviene que el sujeto quede hacia el centro: en la tarjeta se recorta en vertical.
- Si falta una foto, la tarjeta muestra el color del país con su bandera, así que podés subirlas de a poco.
- Al subir las fotos a GitHub, mantené la carpeta `img/paises/` dentro de la raíz del repositorio.
- Las fotos se guardan en el celular la primera vez que se ven. Si más adelante cambiás una foto por otra con el mismo nombre, subí también el número de `VERSION` en `sw.js` (por ejemplo `cocina-v3`) para que se actualice.

## Agregar recetas

Cada receta nueva se completa en `recetas.json` (ingredientes, pasos y tiempos de cada timer) y marcando `"desarrollada": true`. No hace falta tocar `index.html` ni `sw.js`. Al abrir la app con internet, las recetas nuevas se descargan solas.

## Probar en la computadora

No abras `index.html` con doble clic: el navegador bloquea la lectura de `recetas.json`. Usá el enlace de GitHub Pages o, en la carpeta del proyecto, `python3 -m http.server` y entrá a `http://localhost:8000`.
