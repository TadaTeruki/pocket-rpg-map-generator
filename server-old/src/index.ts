// import { Rect } from 'flatgeobuf'
// import { deserialize } from 'flatgeobuf/lib/mjs/geojson'
// import { Context, Hono } from 'hono'
// import { serveStatic } from 'hono/serve-static'

// const app = new Hono()

// app.get('/', (c) => {
//   return c.text('Hello Hono!')
// })

// app.use('/aaa', serveStatic({ path: './static/places_1.fgb' }))

// app
// .get('/features', async (c: Context) => {
//   // example：/featuress?minLon=139.0&minLat=35.0&maxLon=140.0&maxLat=36.0

//   const minLonQuery = c.req.query('minLon');
//   const minLatQuery = c.req.query('minLat');
//   const maxLonQuery = c.req.query('maxLon');
//   const maxLatQuery = c.req.query('maxLat');
//   if (!minLonQuery || !minLatQuery || !maxLonQuery || !maxLatQuery) {
//     return c.json({ error: 'Invalid query parameters' }, 400);
//   }

//   const minLon = parseFloat(minLonQuery);
//   const minLat = parseFloat(minLatQuery);
//   const maxLon = parseFloat(maxLonQuery);
//   const maxLat = parseFloat(maxLatQuery);
//   if ([minLon, minLat, maxLon, maxLat].some(isNaN)) {
//     return c.json({ error: 'Invalid query parameters' }, 400);
//   }
//   console.log("minLon: ", minLon);
//   await fetch('/static/places_1.fgb').then(() => console.log("0")).catch(async (err) => {
//     console.log("err: ", err);
//     await fetch('/places_1.fgb').then(() => console.log("1")).catch(async (err) => {
//       console.log("err: ", err);
//       await fetch('localhost:8787/places_1.fgb').then(() => console.log("2")).catch(async (err) => {
//         console.log("err: ", err);
//         await fetch('localhost:8787/static/places_1.fgb').then(() => console.log("3")).catch(async (err) => {
//           console.log("err: ", err);
//           return c.json({ error: 'Failed to fetch the file' }, 500);
//         });
//       });
//     });
//   });

//   // const arrayBuffer = await fetch('/static/places_1.fgb')
//   // .then(res => res.arrayBuffer())
//   // .then(data => data);


//   // const bbox: Rect = {
//   //     minX: minLon,
//   //     minY: minLat,
//   //     maxX: maxLon,
//   //     maxY: maxLat,
//   // };
//   // const features: any[] = [];

//   // for await (const feature of deserialize(new Uint8Array(arrayBuffer), bbox)) {
//   //   features.push(feature);
//   // }

//   //return c.json({ features });
// });


// export default app

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)

  if (pathname === '/') {
    // ルートパスにアクセスされた場合は "Hello!" を返す
    return new Response("Hello!", {
      headers: { "Content-Type": "text/plain" }
    })
  } else if (pathname === '/route') {
    // /route にアクセスされた場合、/static/resp.json のアセットを返す
    // ※このとき、wrangler.toml の [site] 設定で ASSETS バインディングが必要です。
    const assetRequest = new Request(
      new URL('/static/resp.json', request.url).toString(),
      request
    )
    return await ASSETS.fetch(assetRequest)
  }
  
  return new Response("Not Found", { status: 404 })
}