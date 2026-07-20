# 🚀 Studio Galaxie

Une app **mobile, ultra-visuelle et sans code** pour faire de la musique avec
[Strudel](https://strudel.cc/) — pensée pour qu'un enfant de 10 ans compose un
morceau cool en quelques touches. Tout se fait aux **boutons** ; l'app génère le
code Strudel en coulisses et le joue via `@strudel/web`.

## Ce que ça fait

Au lancement, on choisit **une façon de jouer** et **un niveau** :

**3 modes**
- 🎛️ **Séquenceur** — une grille par instrument (batterie, mélodie, basse). On
  allume les cases au doigt, le curseur de lecture suit la musique.
- 🟪 **Pads** — des pads colorés type Launchpad : on tape pour lancer des
  boucles qui se superposent.
- 🧩 **Blocs** — on empile des blocs façon Scratch : un SON, un RYTHME, puis des
  EFFETS enchaînés.

**2 niveaux**
- 😀 **Simple** — 8 pas, gros boutons, kits prêts à l'emploi, l'essentiel.
- 🧠 **Expert** — 16 pas, tous les effets par piste (filtre, réverb, écho,
  crush, disto…), choix de la gamme, ajout d'instruments, mute, etc.

**Bibliothèque de sons** bien présentée (batterie, percussions, basses, synthés,
ambiances) + **import de tes propres sons** (ta voix, un bruit… en mp3/wav).

**Ambiance galaxie** : fond spatial animé, étoiles et nébuleuses qui **réagissent
au son** (analyse audio réelle branchée sur la sortie).

## Lancer en local

C'est une app **100 % statique** (aucune dépendance à installer, aucun build).
Il suffit de la servir sur un petit serveur HTTP (le service worker et les
modules ES nécessitent `http://`, pas `file://`) :

```bash
npx serve .            # ou : python3 -m http.server 8080
```

Puis ouvre l'URL affichée sur ton téléphone (même réseau Wi-Fi) ou sur
l'ordinateur. **Au premier lancement, les sons se chargent depuis Internet**
(banques de samples Strudel) — quelques secondes ; ensuite ça marche hors ligne
grâce au cache (sauf les samples distants).

> ℹ️ L'audio ne peut démarrer qu'après un **appui** (politique navigateur). Le
> premier clic sur un mode initialise le moteur et débloque le son.

## Installer comme une app (PWA)

Sur smartphone, ouvre le site dans le navigateur puis **« Ajouter à l'écran
d'accueil »**. L'app s'installe avec son icône et s'ouvre en plein écran.

## Déployer

N'importe quel hébergeur de fichiers statiques convient (GitHub Pages, Netlify,
Vercel, Cloudflare Pages, un simple bucket). Publie le contenu du dépôt tel quel
(rien à builder). Pour GitHub Pages : Settings → Pages → source « root ».

## Sous le capot

| Fichier | Rôle |
| --- | --- |
| `index.html` | Coque de l'app + chargement de `@strudel/web` (CDN). |
| `js/app.js` | Contrôleur : accueil, transport, montage des modes, curseur de lecture synchronisé sur l'horloge audio. |
| `js/strudel-engine.js` | Pont vers Strudel (`initStrudel`/`evaluate`/`hush`) + tap audio pour les visuels. |
| `js/music.js` | Génération du code Strudel (mini-notation, effets, gammes) à partir de l'état des boutons. |
| `js/sounds.js` | Bibliothèque de sons + import de fichiers. |
| `js/modes/*.js` | Les 3 modes (séquenceur, pads, blocs). |
| `js/visuals.js` | Fond galaxie audio-réactif (canvas). |
| `js/ui.js` | Composants réutilisables (sliders, modale bibliothèque, toasts). |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA (installation + offline). |

Le principe clé : **aucune ligne de code n'est visible**. Chaque case, pad,
bloc ou curseur met à jour un état, et `music.js` le transforme en une chaîne
Strudel du type :

```js
setcpm(27.5)
stack(
  s("bd ~ ~ ~ bd ~ ~ ~").gain(0.9),
  s("hh*8").gain(0.5),
  note("c3 eb3 g3 bb3").s("sawtooth").room(0.3)
)
```

…envoyée à `evaluate()` pour être jouée en direct.

## Régénérer les icônes

```bash
node icons/gen-icons.mjs
```
