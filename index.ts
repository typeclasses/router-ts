export type RequestBase = { path: string | null; method: string };

export interface RouteDefinition<Request, Response> {
	resource?: Array<{
		method: string;
		server: Server<Request, Response>;
	}>;
	staticContents?: Array<{
		name: string;
		server: Server<Request, Response>;
	}>;
	dynamicContents?: Server<Request & { parent: string }, Response>;
	status: (status: number) => Response;
}

export type Server<Request, Response> = (request: Request) => Promise<Response>;

export function router<Request extends RequestBase, Response>(
	routeDefinition: RouteDefinition<Request, Response>,
): Server<Request, Response> {
	const methodMap =
		routeDefinition.resource === undefined
			? undefined
			: new Map(
					routeDefinition.resource.map(({ method, server }) => [
						method,
						server,
					]),
				);
	const pathMap =
		routeDefinition.staticContents === undefined
			? undefined
			: new Map(
					routeDefinition.staticContents.map(({ name, server }) => [
						name,
						server,
					]),
				);
	return async (request) => {
		if (request.path === null) {
			if (methodMap === undefined) return routeDefinition.status(404);
			const { path, method } = request;
			if (path !== null) return routeDefinition.status(404);
			const handler = methodMap.get(method);
			if (handler === undefined) return routeDefinition.status(405);
			return handler(request);
		}
		const i = request.path.indexOf("/");
		const head = i === -1 ? request.path : request.path.slice(0, i);
		const tail = i === -1 ? null : request.path.slice(i + 1);
		if (pathMap !== undefined) {
			const server = pathMap.get(head);
			if (server !== undefined) return await server({ ...request, path: tail });
		}
		if (routeDefinition.dynamicContents !== undefined) {
			return routeDefinition.dynamicContents({
				...request,
				parent: head,
				path: tail,
			});
		}
		return routeDefinition.status(404);
	};
}
