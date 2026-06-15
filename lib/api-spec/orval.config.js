module.exports = {
  "api-client-react": {
    input: "./openapi.yaml",
    output: {
      workspace: "../api-client-react/src",
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      override: {
        fetch: { includeHttpResponseReturnType: false },
        mutator: {
          path: "../api-client-react/src/custom-fetch.ts",
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: "./openapi.yaml",
    output: {
      workspace: "../api-zod/src",
      client: "zod",
      target: "generated",
      schemas: { path: "generated/types", type: "typescript" },
      mode: "split",
      clean: true,
      override: {
        zod: {
          coerce: {
            query: ["boolean", "number", "string"],
            param: ["boolean", "number", "string"],
          },
        },
      },
    },
  },
};
