# Serene Park - A TextAlive Lyric App

A lyric app created for the Hatsune Miku "Magical Mirai 2026" Programming Contest.

[![Type-check & build](https://github.com/Antasma245/Serene-Park/actions/workflows/check-build.yml/badge.svg)](https://github.com/Antasma245/Serene-Park/actions/workflows/check-build.yml) [![Release](https://github.com/Antasma245/Serene-Park/actions/workflows/release.yml/badge.svg)](https://github.com/Antasma245/Serene-Park/actions/workflows/release.yml)

![thumbnail](https://github.com/user-attachments/assets/6d622e5c-b1fb-4d59-88f2-70ca4914e291)

**日本語版は [`README.ja.md`](README.ja.md) をご覧ください。**

<details>

<summary>About TextAlive</summary>

> "TextAlive App API" is a JavaScript library for developing web applications to animate lyrics that synchronize with the music playback. It uses features from "TextAlive," a web based creativity support tool for authoring "lyric videos," videos in which lyrics of musical pieces are animated as kinetic typography. It helps developers unleash their creativity through programming; it can be used with your favorite creative coding libraries such as Three.js, PixiJS, p5.js, etc.
> 
> *TextAlive and TextAlive App API are researched and developed by the National Institute of Advanced Industrial Science and Technology (AIST) and are publicly available on the web.

Source: https://magicalmirai.com/2026/procon/index_en.html

</details>

## Usage & Features

Select one of this year's 6 contest songs from the menu and press play. Then, click on the lyric cards drifting on the water to "inspire" more people to join the fun. The more cards you click, the more the progress bar gets filled. Something interesting might happen once the bar is full.

Special features include:
* Water displacement effect when clicking lyrics
* Crowd animation (blinking and cheering to the beat)
* Day-night cycle (alternating during verse and chorus) with pulsing sun and moon
* Dynamic light intensity for skyline windows (sound visualizer)
* Multi-platform (PC/smartphone/tablet) and multi-language (EN/JA)

## Building from Source

Follow the steps below if you want to build Serene Park from scratch on your own machine. If you just want to run the app, you can get a pre-built static bundle from the [Releases](https://github.com/Antasma245/Serene-Park/releases) tab and serve it from the HTTP server of your choice.

### Step 1: Install Node.js

To build Serene Park locally, you will need [Node.js](https://nodejs.org/en/download) installed on your computer. You can check for an existing installation by running the following command in a terminal:
```sh
node --version
```

> [!IMPORTANT]
> One of the app's build dependencies, Vite, requires `v20.19+` or `v22.12+` of Node.js (Serene Park was developed and tested on `v24.14.1` of Node.js).

### Step 2: Download the latest version of the app's code

Here, you can choose between two methods:

1. If you have [Git](https://www.git-scm.com/) installed on your computer, you can clone this repository by running `git clone https://github.com/Antasma245/Serene-Park.git` in the folder where you want the code to be stored.

2. On the main page of the repository, go to `Code` and press `Download ZIP` (or click [here](https://github.com/Antasma245/Serene-Park/archive/refs/heads/main.zip)). Then, extract the downloaded ZIP archive where you want the code to be stored.

### Step 3: Install requirements

In the folder where you extracted the app's code, open a terminal and run the following command:
```sh
npm install
```

### Step 4: Build the app

In the same terminal, run:
```sh
npm run build
```

This will create a static bundle in the `dist/` folder of the app. You can then collect its content and serve it on the HTTP server of your choice.

Optionally, you can preview the production build locally by running:
```sh
npm run preview
```

## Assets & Third-Party Licenses

Here are all the tools and assets used in Serene Park and their associated license, if applicable.

### Libraries

| Name | License | Source |
|---|---|---|
| TextAlive App API | TextAlive App API Terms of Use | https://developer.textalive.jp/ |
| PixiJS | MIT | https://pixijs.com/ |
| GSAP | Standard "No Charge" GSAP License | https://gsap.com/ |
| Vite (build only) | MIT | https://vite.dev/ |
| TypeScript (build only) | Apache-2.0 | https://www.typescriptlang.org/ |

### Fonts & Icons

| Name | License | Source |
|---|---|---|
| DotGothic16 | SIL Open Font License 1.1 | https://fonts.google.com/specimen/DotGothic16 |
| Material Symbols Outlined | Apache-2.0 | https://fonts.google.com/icons |

### Characters & Backgrounds

| Name | License | Source |
|---|---|---|
| Ninja Adventure Asset Pack | Creative Commons Zero (CC0) | https://pixel-boy.itch.io/ninja-adventure-asset-pack |

### Music & Lyrics

Audio and text data are provided at runtime by the TextAlive App API. No song media is included in this repository.

---

**Special thanks to Procyon for the Japanese translation.**
