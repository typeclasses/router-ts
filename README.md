# router

A typical web server looks like a function of type

```ts
(request: Request) => Promise<Response>
```

for some types `Request` and `Response`.

This is a minimal set of tools for defining and combining such functions.

The three operations provided are:

* `staticDirectory`
* `dynamicDirectory`
* `resource`

See `readme.test.ts` for an example application that demonstrates the use of all three.

## Request

The `Request` type can be any record, but this library assumes a few special attributes:

* `method`: `string` - The HTTP request method.

* `path`: `string | null` - A relative URL pathname constructed from the request path,
  (e.g. as `new URL(request.url).pathname.slice(1)` to remove the leading slash but
  perhaps modified by intermediate processing before reaching the server).

* `parent`: `string` - When descending into a `dynamicDirectory`, the segment that was
  popped off the front of the URL path.

## Response

The `Response` type can be anything. The only requirement is that the `router` library
be configured with a function of type

```ts
(responseOptions: { status: number }) => Response
```

which can be used to construct a `Response` given an HTTP status code.
