import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadGraphQL(filename: string): string {
  return fs.readFileSync(path.join(__dirname, filename), "utf-8");
}

export const rootTypeDefs = loadGraphQL("root.graphql");
export const organizationTypeDefs = loadGraphQL("organization.graphql");
export const userTypeDefs = loadGraphQL("user.graphql");

export const typeDefs = [rootTypeDefs, organizationTypeDefs, userTypeDefs];
