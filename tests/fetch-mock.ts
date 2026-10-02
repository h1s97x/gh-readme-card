import { vi } from "vitest";

/** What a stubbed request should answer with. */
export interface MockReply {
  status?: number;
  statusText?: string;
  /** Body to return, as JSON. */
  payload?: unknown;
  /** Reject instead of resolving, the way a transport failure would. */
  throws?: Error;
}

/** Decides what a given request should answer with. */
export type Responder = (
  url: string,
  body: { query?: string; variables?: Record<string, unknown> } | undefined,
) => MockReply | unknown;

interface Route {
  method: string;
  url: string;
  responder: Responder;
  once: boolean;
}

/**
 * A `fetch` stub for a test file.
 *
 * Routes match in registration order and the first URL hit wins, which is how
 * the `axios-mock-adapter` calls these tests used to be written read.
 */
class MockFetch {
  private routes: Route[] = [];
  private readonly original = globalThis.fetch;

  constructor() {
    globalThis.fetch = this.handler as unknown as typeof fetch;
  }

  /**
   * Route POST requests to `url` at `responder`, for every call.
   *
   * @returns This, so calls can be chained.
   */
  onPost(url: string, responder: Responder | unknown): this {
    return this.add("POST", url, responder, false);
  }

  /**
   * Route GET requests to `url` at `responder`, for every call.
   *
   * @returns This, so calls can be chained.
   */
  onGet(url: string, responder: Responder | unknown): this {
    return this.add("GET", url, responder, false);
  }

  /**
   * Route POST requests to `url` for the first call only.
   *
   * @returns This, so calls can be chained.
   */
  onPostOnce(url: string, responder: Responder | unknown): this {
    return this.add("POST", url, responder, true);
  }

  /**
   * Route GET requests to `url` for the first call only.
   *
   * @returns This, so calls can be chained.
   */
  onGetOnce(url: string, responder: Responder | unknown): this {
    return this.add("GET", url, responder, true);
  }

  /** Drop every route registered so far. */
  reset(): void {
    this.routes = [];
  }

  /** Put the real `fetch` back. */
  restore(): void {
    globalThis.fetch = this.original;
  }

  private add(
    method: string,
    url: string,
    responder: Responder | unknown,
    once: boolean,
  ): this {
    this.routes.push({ method, url, responder: responder as Responder, once });
    return this;
  }

  private readonly handler = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();

      const index = this.routes.findIndex(
        (route) => route.method === method && route.url === url,
      );
      if (index === -1) {
        throw new Error(`No mock route for ${method} ${url}`);
      }

      const route = this.routes[index];
      // A `once` route answers a single call and then steps aside, so the next
      // call falls through to whatever was registered after it.
      if (route.once) {
        this.routes.splice(index, 1);
      }

      const answer =
        typeof route.responder === "function"
          ? route.responder(
              url,
              init?.body ? JSON.parse(String(init.body)) : undefined,
            )
          : route.responder;

      const reply: MockReply =
        answer !== null &&
        typeof answer === "object" &&
        ("status" in answer || "payload" in answer || "throws" in answer)
          ? (answer as MockReply)
          : { status: 200, payload: answer };

      if (reply.throws) {
        throw reply.throws;
      }

      const status = reply.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: reply.statusText ?? "",
        json: async () => reply.payload,
        text: async () =>
          reply.payload === undefined ? "" : JSON.stringify(reply.payload),
      } as unknown as Response;
    },
  );
}

/**
 * Install a `fetch` stub for a test file.
 *
 * @returns Controls for registering routes and tearing the stub down.
 */
export const mockFetch = (): MockFetch => new MockFetch();
