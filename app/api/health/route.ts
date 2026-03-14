import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";

// Shape of the JSON body returned by the health endpoint.
export type HealthResponse = {
  status: string;
  timestamp: string;
};

// Used for load balancer and uptime monitor health checks only.
// Name and version are intentionally omitted from the response to reduce info disclosure.
export function GET(): NextResponse<HealthResponse> {
  return NextResponse.json({
    status: "ok",
    timestamp: Temporal.Now.instant().toString(),
  });
}
