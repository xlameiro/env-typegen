import { NextResponse } from "next/server";

// Used for load balancer and uptime monitor health checks only.
// Name and version are intentionally omitted from the response to reduce info disclosure.
export function GET(): NextResponse {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
