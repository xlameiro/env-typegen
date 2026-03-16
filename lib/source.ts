import { docs } from "@/.source/server";
import { loader } from "fumadocs-core/source";
import "server-only";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
