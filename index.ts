/**
 * Parameter for the {@link Router} constructor.
 */
export type Config<Response> = {
  response: (responseOptions: { status: number }) => Response;
}

/**
 * Utilities for defining and combining request-to-response functions based on
 * the `path` and `method` attributes of the request.
 */
export class Router<Response> {
  response: (responseOptions: { status: number; }) => Response;

  constructor(config: Config<Response>) { this.response = config.response }

  /**
   * Separates the `path` into its head and tail, then looks up the head in the
   * given assocation list. If an entry is present, invokes the server with the
   * tail as the new path.
   *
   * @param entries
   *   An enumeration a directory's immediate contents.
   *   A name never contains a slash (`/`) character.
   *   The empty string `""` represents the containing directory itself.
   */
  staticDirectory<Request extends { path: string | null }>(
    ...entries: Array<{
      name: string;
      server: (request: Request) => Promise<Response>;
    }>
  ): (request: Request) => Promise<Response> {
    const map = new Map(entries.map(({ name, server }) => [name, server]));
    return async (request) => {
      const { path } = request
      if (path === null) return this.response({ status: 404 });
      const i = path.indexOf("/");
      const server = map.get(i === -1 ? path : path.slice(0, i));
      if (server === undefined) return this.response({ status: 404 });
      return await server({
        ...request,
        path: i === -1 ? null : path.slice(i + 1),
      });
    };
  }

  /**
   * Separates the `path` into its head and tail, then calls the given server with
   * the head as `parent` and tail as `path`.
   *
   * @param server
   *   Server that will handle the subdirectory within the parent.
   */
  dynamicDirectory<Request extends { path: string | null }>(
    server: (request: Request & { parent: string }) => Promise<Response>,
  ): (request: Request) => Promise<Response> {
    return async (request) => {
      const { path } = request
      if (path === null) return this.response({ status: 404 });
      const i = path.indexOf("/");
      return server({
        ...request,
        parent: i === -1 ? path : path.slice(0, i),
        path: i === -1 ? null : path.slice(i + 1),
      });
    };
  }

  /**
   * Requires `path` to be `null`, otherwise 404. Then looks up the method from the
   * given list.
   *
   * @param entries
   *   An enumeration a resource's supported operations.
   */
  resource<Request extends { path: string | null; method: string }>(
    ...entries: Array<{ method: string; server: (request: Request) => Promise<Response> }>
  ): (request: Request) => Promise<Response> {
    const map = new Map(entries.map(({ method, server }) => [method, server]));
    return async (request) => {
      const { path, method } = request
      if (path !== null) return this.response({ status: 404 });
      const handler = map.get(method);
      if (handler === undefined) return this.response({ status: 405 });
      return handler(request);
    };
  }
}
