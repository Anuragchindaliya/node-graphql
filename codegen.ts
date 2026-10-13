import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/graphql/schema/**/*.graphql",
  generates: {
    "./src/graphql/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../context/context.js#GraphQLContext",
        scalars: {
          DateTime: "string",
        },
      },
    },
  },
};

export default config;
