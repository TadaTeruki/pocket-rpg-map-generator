# データセット概要

地点を抽出するクエリは[create.sql](./scripts/create.sql)に記載しています。

実行には、対象となるOpenStreetMapのデータをApache Parquet形式に変換して作られる`japan-latest_nofilter_noclip_compact.parquet`を`(/dataset)/files`に配置する必要があります。

## 地点の階層

地点を (拠点性が高い...と考えられる順番に) 以下のように抽出しています。

1. **places_1**: 国内の自治体 (_cities_ テーブル) の中で、中央郵便局が存在する都市

2. **places_2** : 国内の自治体 (_cities_ テーブル) の中で、地方裁判所や振興局が存在する都市

3. **places_3** : 駅名（_stations_ テーブル）の中で、operatorタグを含むもの

4. **places_4** : 郵便局名（_post_offices_ テーブル）

5. **places_5** : 地域名（_place_names_ テーブル）
