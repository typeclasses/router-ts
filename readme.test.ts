import { describe, expect, test } from "bun:test";
import { router } from ".";

// Oversimplified model of a request and response; use whatever definition is appropriate
// for your application and platform, but the `method`, `path`, and `status` attributes
// are required for routing.
type Request = { method: string; path: string | null; body?: string };
type Response = { status: number; body?: string };

// A typical sort of HTTP application server
class Server {
	// The constituent parts of the server: The website and API
	website = new Website();
	api = new Api();

	// The server's main entry point (called by the tests below). The website gets to live
	// the top level for vanity, and the API is relegated to a subdirectory.
	fetch: (request: Request) => Promise<Response> = router({
		status: (status: number) => ({ status }),
		staticContents: [
			...this.website.routes,
			{ name: "api", server: this.api.fetch },
		],
	});
}

class Website {
	// The "cart" pages are a subsite, defined below.
	cart = new CartWebsite();

	// A static list of three routes: The empty string is the home page, "about" is another
	// page at the top level, and "cart" routes to a subsite.
	get routes(): Array<{
		name: string;
		server: (request: Request) => Promise<Response>;
	}> {
		return [
			{
				name: "",
				server: router({
					status: (status: number) => ({ status }),
					resource: [{ method: "GET", server: this.getHome }],
				}),
			},
			{
				name: "about",
				server: router({
					status: (status: number) => ({ status }),
					resource: [{ method: "GET", server: this.getAbout }],
				}),
			},
			{ name: "cart", server: this.cart.fetch },
		];
	}

	// Trivial values representing web pages in this example application
	async getHome() {
		return { status: 200, body: "Home" };
	}
	async getAbout() {
		return { status: 200, body: "About" };
	}
}

// Pages that Website nests within the "cart" directory
class CartWebsite {
	fetch: (request: Request) => Promise<Response> = router({
		status: (status: number) => ({ status }),
		staticContents: [
			{
				name: "view",
				server: router({
					status: (status: number) => ({ status }),
					resource: [{ method: "GET", server: this.getView }],
				}),
			},
			{
				name: "checkout",
				server: router({
					status: (status: number) => ({ status }),
					resource: [{ method: "GET", server: this.getCheckout }],
				}),
			},
		],
	});

	async getView() {
		return { status: 200, body: "Cart" };
	}
	async getCheckout() {
		return { status: 200, body: "Checkout" };
	}
}

class Api {
	book = new BookApi();

	fetch: (request: Request) => Promise<Response> = router({
		status: (status: number) => ({ status }),
		staticContents: [
			{
				name: "v1",
				server: router({
					status: (status: number) => ({ status }),
					staticContents: [
						{
							name: "books-by-id",
							// books-by-id is a *dynamic* directory; its contents are not statically enumerated.
							server: router({
								status: (status: number) => ({ status }),
								dynamicContents: async ({ path, method, parent, body }) =>
									// We would at this point insert some check that the requested book ID exists
									// before handing off the control flow to BookApi. This would also be a reasonable
									// place to insert authorization for this resource, or perhaps fetch some
									// additional information about the book.
									this.book.fetch({ path, method, body, bookId: parent }),
							}),
						},
					],
				}),
			},
		],
	});
}

class BookApi {
	fetch: (request: Request & { bookId: string }) => Promise<Response> = router({
		status: (status: number) => ({ status }),
		staticContents: [
			{
				name: "synopsis",
				server: router({
					status: (status: number) => ({ status }),
					resource: [
						{ method: "GET", server: this.getSynopsis },
						{ method: "POST", server: this.postSynopsis },
					],
				}),
			},
		],
	});

	async getSynopsis(request: Request & { bookId: string }): Promise<Response> {
		// This would pull from a database or something
		return { status: 200, body: `Synopsis of book ${request.bookId}` };
	}

	async postSynopsis(request: Request & { bookId: string }): Promise<Response> {
		// This would write to a database or something
		return {
			status: 200,
			body: `Synopsis of book ${request.bookId}:\n${request.body ?? ""}`,
		};
	}
}

describe("Server example", () => {
	const server = new Server();

	test("root path", async () => {
		expect(await server.fetch({ method: "GET", path: "" })).toEqual({
			status: 200,
			body: "Home",
		});
	});

	test("top level path", async () => {
		expect(await server.fetch({ method: "GET", path: "about" })).toEqual({
			status: 200,
			body: "About",
		});
	});

	test("unsupported method", async () => {
		expect(await server.fetch({ method: "POST", path: "about" })).toEqual({
			status: 405,
		});
	});

	test("not found", async () => {
		expect(await server.fetch({ method: "GET", path: "teapot" })).toEqual({
			status: 404,
		});
	});

	test("nested paths", async () => {
		expect(await server.fetch({ method: "GET", path: "cart/view" })).toEqual({
			status: 200,
			body: "Cart",
		});
		expect(
			await server.fetch({ method: "GET", path: "cart/checkout" }),
		).toEqual({ status: 200, body: "Checkout" });
	});

	test("dynamic directory", async () => {
		expect(
			await server.fetch({
				method: "GET",
				path: "api/v1/books-by-id/4/synopsis",
			}),
		).toEqual({ status: 200, body: "Synopsis of book 4" });
	});

	test("post", async () => {
		expect(
			await server.fetch({
				method: "POST",
				path: "api/v1/books-by-id/5/synopsis",
				body: "abc",
			}),
		).toEqual({ status: 200, body: "Synopsis of book 5:\nabc" });
	});
});
