

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'GET') {
			const { pathname } = new URL(request.url);
			if (pathname === '/') {
				return new Response("Hello!", {
					headers: { "Content-Type": "text/plain" }
				});
			} else if (pathname === '/route') {
				// const assetRequest = new Request(
				// 	new URL('/hello.json', request.url).toString(),
				// 	request
				// );
				// return await env.ASSETS.fetch(assetRequest);

				// read flatgeobuf /routes.fgb and return it
				// the range is: 141.0384245646615, 42.99901496213454, 141.74803414470085, 43.34973488325653
			}
		}
		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
