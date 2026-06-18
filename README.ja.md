# Serene Park - TextAlive リリックアプリ

初音ミク「マジカルミライ 2026」プログラミング・コンテスト応募作品のリリックアプリ『Serene Park』です。

[![Type-check & build](https://github.com/Antasma245/Serene-Park/actions/workflows/check-build.yml/badge.svg)](https://github.com/Antasma245/Serene-Park/actions/workflows/check-build.yml) [![Release](https://github.com/Antasma245/Serene-Park/actions/workflows/draft-release.yml/badge.svg)](https://github.com/Antasma245/Serene-Park/actions/workflows/draft-release.yml)

![thumbnail](https://github.com/user-attachments/assets/6d622e5c-b1fb-4d59-88f2-70ca4914e291)

**English version available in [`README.md`](README.md).**

<details>

<summary>TextAlive について</summary>

> 楽曲中の歌声に合わせて歌詞をアニメーションさせるリリックビデオの制作支援サービス「TextAlive（テキストアライブ）」の機能を使って、歌詞が音楽に合わせてタイミングよく動くWebアプリケーション（リリックアプリ）を開発できるJavaScript用のライブラリです。一般的なWebアプリケーション用の開発環境で、必要に応じて three.js, PixiJS, p5.js など好みのライブラリと組み合わせながら、自由な映像表現をプログラミングできます。
> 
> ※ TextAlive および TextAlive App API は、産業技術総合研究所が研究開発をして一般公開しています。

出典：https://magicalmirai.com/2026/procon/

</details>

## 機能と遊び方

メニューから今年のコンテスト課題曲（全6曲）のうち1曲を選び、再生ボタンを押してください。水面を漂う歌詞をタップして、より多くの人を惹きつけましょう！タップするごとにゲージがたまり、満タンになると特別な演出が始まります。

主な実装機能：
* 歌詞をタップすると水面に波紋が広がるインタラクティブなエフェクト
* 音楽のビートに合わせて瞬きしたり応援したりする、観客のアニメーション
* 曲の展開（Aメロ・Bメロ・サビ）に応じた昼夜の移り変わりと、ビートに合わせて脈打つ太陽と月
* 音の強弱に合わせて街の窓明かりが明滅するサウンドビジュアライザー
* マルチデバイス（パソコン / スマホ / タブレット）および多言語（日本語 / 英語）対応

## ローカルでのビルド手順

Serene Parkをソースコードからビルドする場合は、以下の手順に従ってください。なお、ビルドせずにアプリを動かしたい場合は、[Releases](https://github.com/Antasma245/Serene-Park/releases) タブからビルド済みファイルをダウンロードし、任意のHTTPサーバーに配置するだけで実行可能です。

### 1. 前提条件 (Node.js)

ビルドには [Node.js](https://nodejs.org/ja/download) が必要です。以下のコマンドでインストールされていることを確認してください。
```sh
node --version
```

> [!IMPORTANT]
> 本プロジェクトで利用しているビルドツール（Vite）は、Node.js `v20.19+` または `v22.12+` 以上を必要とします（本アプリの開発・テスト環境：Node.js `v24.14.1`）。

### 2. リポジトリの取得

以下のいずれかの方法でソースコードを取得します。

**[Git](https://www.git-scm.com/) を使用する場合（推奨）:**
```sh
git clone https://github.com/Antasma245/Serene-Park.git
```

**ZIP でダウンロードする場合:**
リポジトリ右上の `Code` > `Download ZIP` を選択（または [こちら](https://github.com/Antasma245/Serene-Park/archive/refs/heads/main.zip) をクリック）し、任意のディレクトリに展開してください。

### 3. 依存関係のインストール

プロジェクトのルートディレクトリに移動し、以下のコマンドを実行してパッケージをインストールします。
```sh
npm install
```

### 4. ビルドと実行

以下のコマンドを実行して、本番用ビルドを作成します。
```sh
npm run build
```

ビルドが完了すると、`dist/` ディレクトリに静的ファイル一式が生成されます。これらを任意のHTTPサーバーに配置してご利用ください。

また、以下のコマンドで本番用ビルドのローカルプレビューを確認できます。
```sh
npm run preview
```

## 使用アセットとライセンス

本プロジェクトで使用しているライブラリおよびアセットのライセンス情報は以下の通りです。

### ライブラリ

| 名前 | ライセンス | ソース |
|---|---|---|
| TextAlive App API | TextAlive App API Terms of Use | https://developer.textalive.jp/ |
| PixiJS | MIT | https://pixijs.com/ |
| GSAP | Standard "No Charge" GSAP License | https://gsap.com/ |
| Vite (build only) | MIT | https://vite.dev/ |
| TypeScript (build only) | Apache-2.0 | https://www.typescriptlang.org/ |

### フォント・アイコン

| 名前 | ライセンス | ソース |
|---|---|---|
| DotGothic16 | SIL Open Font License 1.1 | https://fonts.google.com/specimen/DotGothic16 |
| Material Symbols Outlined | Apache-2.0 | https://fonts.google.com/icons |

### キャラクター・背景

| 名前 | ライセンス | ソース |
|---|---|---|
| Ninja Adventure Asset Pack | Creative Commons Zero (CC0) | https://pixel-boy.itch.io/ninja-adventure-asset-pack |

### 楽曲および歌詞データについて

楽曲の音声および歌詞データは、実行時にTextAlive App APIを通じて提供されます。
本リポジトリ内に楽曲のメディアファイルは含まれていません。

---

**翻訳：Procyon**
