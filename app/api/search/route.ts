import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

const MAX_SEARCH_QUERY_LENGTH = 200;
const MAX_SEARCH_LIMIT = 20;

const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(MAX_SEARCH_QUERY_LENGTH),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
  tag: z.string().optional(),
  locale: z.string().optional(),
  mode: z.enum(["full", "vector"]).optional(),
});

const { GET: sourceSearchGet } = createFromSource(source);

function invalidSearchResponse(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

function normalizeSearchRequest(
  requestUrl: URL,
):
  | { kind: "empty" }
  | { kind: "invalid"; response: Response }
  | { kind: "valid"; requestUrl: URL } {
  const query = requestUrl.searchParams.get("query");
  if (query === null || query.trim().length === 0) {
    return { kind: "empty" };
  }

  const parsedSearchRequest = searchRequestSchema.safeParse({
    query,
    limit: requestUrl.searchParams.get("limit") ?? undefined,
    tag: requestUrl.searchParams.get("tag") ?? undefined,
    locale: requestUrl.searchParams.get("locale") ?? undefined,
    mode: requestUrl.searchParams.get("mode") ?? undefined,
  });

  if (!parsedSearchRequest.success) {
    const firstIssue = parsedSearchRequest.error.issues[0];
    const message =
      firstIssue?.message ??
      "Invalid search request. Verify query and limit parameters.";
    return { kind: "invalid", response: invalidSearchResponse(message) };
  }

  const normalizedRequestUrl = new URL(requestUrl);
  normalizedRequestUrl.searchParams.set(
    "query",
    parsedSearchRequest.data.query,
  );

  if (parsedSearchRequest.data.limit === undefined) {
    normalizedRequestUrl.searchParams.delete("limit");
  } else {
    normalizedRequestUrl.searchParams.set(
      "limit",
      String(parsedSearchRequest.data.limit),
    );
  }

  return { kind: "valid", requestUrl: normalizedRequestUrl };
}

export async function GET(request: NextRequest): Promise<Response> {
  const requestUrl = new URL(request.url);
  const normalizedRequest = normalizeSearchRequest(requestUrl);

  if (normalizedRequest.kind === "empty") {
    return Response.json([]);
  }

  if (normalizedRequest.kind === "invalid") {
    return normalizedRequest.response;
  }

  const sourceRequest = new Request(
    normalizedRequest.requestUrl.toString(),
    request,
  );
  return sourceSearchGet(sourceRequest);
}
