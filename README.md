# 🗾 捕獲系RPG マップジェネレータ

**Link: [https://pocket-rpg-map-generator.peruki.dev](https://pocket-rpg-map-generator.peruki.dev)**

某「捕獲系RPG」にありそうなマップを自動生成します。

![chugoku](https://github.com/user-attachments/assets/8ff1de22-bacb-4962-9662-090052828adc)
![tokyo](https://github.com/user-attachments/assets/abe6b684-a907-4610-8003-114c1f2cc2b9)

## 使用データについて

[Geofabrik](https://download.geofabrik.de/asia/japan.html) より提供されている日本国内のOpenStreetMapのデータの仕様を前提としています。

実際のデータの収集内容は[データセット概要](./dataset/README.md)を参照してください。

## アルゴリズム概要

マップを生成する範囲内にある地点データをHTTP Range Requestを用いて取得します。地点データはおおよその地域の拠点性に基づいて事前に階層分けされ (具体的な基準は[データセット概要](./dataset/README.md)にて )、拠点性の高い地点のデータセットから順に、データが十分に集まるまで参照し続けることで、使用する地点を抽出しています。

抽出した地点に対して

- [ドロネー三角形分割](https://ja.wikipedia.org/wiki/%E3%83%89%E3%83%AD%E3%83%8D%E3%83%BC%E5%9B%B3) ([delaunator](https://mapbox.github.io/delaunator/)を使用) により地点間のネットワークを作成
- [クラスカル法](https://ja.wikipedia.org/wiki/%E3%82%AF%E3%83%A9%E3%82%B9%E3%82%AB%E3%83%AB%E6%B3%95) を用いて最小全域木を構築
- 最小全域木に属する辺を残し、ほかは (確率的に一部の辺を残しつつ) 切り落とす

を行うと、良い感じのどうろネットワークができます。

## フロントエンド概要および実行方法

以下コマンドにて実行します。

```
$ pnpm i
$ pnpm run dev
```

[Cloudflare Pages](https://pages.cloudflare.com/)上で動くことを想定しています。

地図タイルとして一部[MapTiler](https://www.maptiler.com/)のホストしている[OpenMapTiles](https://openmaptiles.org/)のデータを利用しています。
実行時は、環境変数として`VITE_MAPTILER_KEY` にMapTilerのアクセストークンを設定してください。
