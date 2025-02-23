INSTALL spatial;
LOAD spatial;

-- osmテーブル
CREATE TABLE osm AS 
  SELECT * FROM "files/japan-latest_nofilter_noclip_compact.parquet";
  
-- routes: 国道
DROP TABLE IF EXISTS routes;
CREATE TABLE routes AS 
  WITH routes_raw AS (
    SELECT
      ST_Simplify(geometry, 1000) AS geometry,
      map_extract(tags, 'name')[1] AS name,
      string_split(map_extract(tags, 'ref')[1], ';') AS numbers
    FROM osm
    WHERE ((name LIKE '国道%') OR (name LIKE '都道%') OR (name LIKE '道道%') OR (name LIKE '府道%') OR (name LIKE '県道%'))
    AND geometry IS NOT NULL
    AND numbers IS NOT NULL
  )
  SELECT
    geometry,
    numbers
  FROM routes_raw;

-- district_courts: 地方裁判所（geometryを点に変換）
DROP TABLE IF EXISTS district_courts;
CREATE TABLE district_courts AS 
  SELECT
    ST_Centroid(geometry) AS geometry, 
    map_extract(tags, 'name')[1] AS name
  FROM osm 
  WHERE map_contains_entry(tags, 'amenity', 'courthouse')
    AND name LIKE '%地方裁判所%'
    AND geometry IS NOT NULL
    AND name IS NOT NULL;

-- subprefecture_offices: 振興局・総合振興局庁舎（geometryを点に変換）
DROP TABLE IF EXISTS subprefecture_offices;
CREATE TABLE subprefecture_offices AS 
  SELECT
    ST_Centroid(geometry) AS geometry, 
    map_extract(tags, 'name')[1] AS name
  FROM osm 
  WHERE tags['government'] = 'local_government'
    AND name LIKE '%振興局%'
    AND geometry IS NOT NULL
    AND name IS NOT NULL;
    
-- central_post_offices: 中央郵便局（geometryを点に変換）
DROP TABLE IF EXISTS central_post_offices;
CREATE TABLE central_post_offices AS 
  SELECT
    ST_Centroid(geometry) AS geometry, 
    map_extract(tags, 'name')[1] AS name
  FROM osm 
  WHERE tags['amenity'] = 'post_office'
    AND ((name LIKE '%中央郵便局'))
    AND geometry IS NOT NULL
    AND name IS NOT NULL;

-- city_boundaries: 都市の境界（boundary=administrative, admin_level=7）※geometryはそのまま利用
DROP TABLE IF EXISTS city_boundaries;
CREATE TABLE city_boundaries AS
  SELECT
    geometry,
    REGEXP_REPLACE(
      COALESCE(
        map_extract(tags, 'name:ja_kana')[1],
        map_extract(tags, 'name:ja-Hira')[1]
      ),
        '(し|く|まち|ちょう|むら|そん)$',
      '') AS name,
    ST_Centroid(geometry) as centroid
  FROM osm
  WHERE tags['boundary'] = 'administrative'
    AND tags['admin_level'] = '7'
    AND NOT ((name LIKE '%かわ') OR (name LIKE '%がわ')) 
    AND geometry IS NOT NULL
    AND centroid IS NOT NULL
    AND name IS NOT NULL
    AND name ~ '^[ぁ-ん]+$';
  
-- post_offices: 郵便局（amenity=post_office、geometryを点に変換）
DROP TABLE IF EXISTS post_offices;
CREATE TABLE post_offices AS
WITH p1 AS (
  SELECT
    ST_Centroid(geometry) AS geometry,
    REGEXP_REPLACE(
      COALESCE(
        map_extract(tags, 'name:ja_kana')[1],
        map_extract(tags, 'name:ja-Hira')[1]
      ),
        '(ゆうびんきょく|かんいゆうびんきょく)$',
      '') AS name,
  FROM osm
  WHERE map_contains_entry(tags, 'amenity', 'post_office')
    AND geometry IS NOT NULL
    AND name IS NOT NULL
    AND NOT ((name LIKE '%にし%') OR (name LIKE '%ひがし%') OR (name LIKE '%きた%') OR (name LIKE '%みなみ%') OR (name LIKE '%ちゅうおう%') OR (name LIKE '%びょういん%') OR (name LIKE '%ない') OR (name LIKE '%まえ'))
    AND name ~ '^[ぁ-ん]+$'
),
p2 AS ( 
  SELECT
    geometry,
    name,
    (
      SELECT b.name
      FROM city_boundaries AS b
      WHERE ST_Within(p1.geometry, b.geometry)
      ORDER BY ST_Distance(p1.geometry, b.centroid)
      LIMIT 1
    ) AS city_name
  FROM p1
  WHERE city_name IS NOT NULL
)
  SELECT
    p2.geometry, 
    CASE
      WHEN (p2.name = p2.city_name)
      THEN p2.name 
      ELSE REPLACE(p2.name, p2.city_name, '') 
    END AS name,
    -- p2.name as original_name,
    -- p2.city_name
  FROM p2;

-- stations: 駅名（public_transport=station、geometryを点に変換）
DROP TABLE IF EXISTS stations;
CREATE TABLE stations AS
  SELECT 
    ST_Centroid(geometry) AS geometry,
    REGEXP_REPLACE(
      COALESCE(
        map_extract(tags, 'name:ja_kana')[1],
        map_extract(tags, 'name:ja-Hira')[1]
      ),
      '(いっちょうめ|にちょうめ|さんちょうめ|よんちょうめ|ごちょうめ|ろくちょうめ|ななちょうめ|はちちょうめ|きゅうちょうめ|[1-9]ちょうめ|ちょう)$',
      '') AS name
  FROM osm
  WHERE tags['public_transport'] = 'station'
    AND tags['operator'] IS NOT NULL
    AND geometry IS NOT NULL
    AND name IS NOT NULL
    AND NOT ((name LIKE '%にし%') OR (name LIKE '%ひがし%') OR (name LIKE '%きた%') OR (name LIKE '%みなみ%') OR (name LIKE '%ちゅうおう%') OR (name LIKE '%びょういん%') OR (name LIKE '%ない') OR (name LIKE '%まえ'))
    AND name ~ '^[ぁ-ん]+$';
    
-- place_names: placeタグが quarter, suburb, neighbourhood のいずれかで、geometryを点に変換
DROP TABLE IF EXISTS place_names;
CREATE TABLE place_names AS
SELECT 
  ST_Centroid(geometry) AS geometry,
    REGEXP_REPLACE(
      COALESCE(
        map_extract(tags, 'name:ja_kana')[1],
        map_extract(tags, 'name:ja-Hira')[1]
      ),
      '(いっちょうめ|にちょうめ|さんちょうめ|よんちょうめ|ごちょうめ|ろくちょうめ|ななちょうめ|はちちょうめ|きゅうちょうめ|[1-9]ちょうめ|ちょう)$',
      '') AS name
FROM osm
WHERE tags['place'] IN ('quarter', 'suburb', 'neighbourhood')
  AND geometry IS NOT NULL
  AND name IS NOT NULL;

-- nodes_on_land: 陸上にある何らかの地点
DROP TABLE IF EXISTS nodes_on_land;
CREATE TABLE nodes_on_land AS
SELECT 
  ST_Centroid(geometry) AS geometry
FROM osm
WHERE map_contains_entry(tags, 'amenity', 'post_office') OR (tags['place'] IN ('quarter', 'suburb', 'neighbourhood')) OR (tags['public_transport'] = 'station');

-- cities: 都市の情報
DROP TABLE IF EXISTS cities_raw;
CREATE TABLE cities_raw AS
WITH city_info AS (
  SELECT
    name,
    geometry,
    centroid
  FROM city_boundaries
)
SELECT
  ci.name AS name,
  (
    SELECT p.geometry
    FROM nodes_on_land AS p
    WHERE ST_Within(p.geometry, ci.geometry)
    ORDER BY ST_Distance(
      p.geometry,
      (
        SELECT ST_Centroid(ST_Collect(list(p2.geometry)))
        FROM nodes_on_land AS p2
        WHERE ST_Within(p2.geometry, ci.geometry)
      )
    )
    LIMIT 1
  ) AS geometry,
  ST_Buffer(ci.geometry, 1000) AS buffer,
  (
    SELECT cp.name
    FROM central_post_offices AS cp
    WHERE ST_Within(cp.geometry, ci.geometry)
    LIMIT 1
  ) IS NOT NULL AS is_first_prior,
  (
    (
      SELECT dc.name
      FROM district_courts AS dc
      WHERE ST_Within(dc.geometry, ci.geometry)
      LIMIT 1
    ) IS NOT NULL
    OR (
      SELECT so.name
      FROM subprefecture_offices AS so
      WHERE ST_Within(so.geometry, ci.geometry)
      LIMIT 1
    ) IS NOT NULL
  ) AS is_second_prior
FROM city_info AS ci;

DROP TABLE IF EXISTS cities;
CREATE TABLE cities AS
SELECT
  c.name,
  c.geometry,
  c.is_first_prior,
  c.is_second_prior,
  -- future work: routes
FROM cities_raw c;

CREATE TABLE places_1 AS SELECT name, geometry FROM cities WHERE is_first_prior;
CREATE TABLE places_2 AS SELECT name, geometry FROM cities WHERE is_second_prior;
CREATE TABLE places_3 AS SELECT name, geometry FROM stations;
CREATE TABLE places_4 AS SELECT name, geometry FROM post_offices;
CREATE TABLE places_5 AS SELECT name, geometry FROM place_names;

COPY (SELECT * FROM places_1) TO 'out/places_1.csv';
COPY (SELECT * FROM places_2) TO 'out/places_2.csv';
COPY (SELECT * FROM places_3) TO 'out/places_3.csv';
COPY (SELECT * FROM places_4) TO 'out/places_4.csv';
COPY (SELECT * FROM places_5) TO 'out/places_5.csv';
COPY (SELECT * FROM routes) TO 'out/routes.csv';
