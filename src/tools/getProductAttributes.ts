import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  attributeType: z.enum(["TAGS", "TYPES", "VENDORS"]),
  first: z.number().default(250)
});

let shopifyClient: GraphQLClient;

const queryFieldMap: Record<string, string> = {
  TAGS: "productTags",
  TYPES: "productTypes",
  VENDORS: "productVendors"
};

const getProductAttributes = {
  name: "get-product-attributes",
  description: "Get product tags, types, or vendors list. Returns all unique values used across products.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const field = queryFieldMap[input.attributeType];
      const query = gql`
        query ProductAttributes($first: Int!) {
          ${field}(first: $first) {
            edges {
              cursor
              node
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, { first: input.first })) as any;
      const connection = data[field];

      return {
        attributeType: input.attributeType,
        values: connection.edges.map((e: any) => e.node),
        pageInfo: connection.pageInfo
      };
    } catch (error) {
      console.error("Error fetching product attributes:", error);
      throw new Error(`Failed to fetch product attributes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProductAttributes };
