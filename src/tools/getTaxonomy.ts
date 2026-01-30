import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  search: z.string().optional(),
  childrenOf: z.string().optional(),
  siblingsOf: z.string().optional(),
  descendantsOf: z.string().optional(),
  first: z.number().default(50)
});

let shopifyClient: GraphQLClient;

const getTaxonomy = {
  name: "get-taxonomy",
  description: "Get Shopify product taxonomy categories. Without arguments returns top-level categories. Use search for text search, childrenOf/siblingsOf/descendantsOf with category ID for tree navigation.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Taxonomy($first: Int!, $search: String, $childrenOf: ID, $siblingsOf: ID, $descendantsOf: ID) {
          taxonomy {
            categories(first: $first, search: $search, childrenOf: $childrenOf, siblingsOf: $siblingsOf, descendantsOf: $descendantsOf) {
              edges {
                cursor
                node {
                  id
                  name
                  fullName
                  isLeaf
                  isRoot
                  level
                  parentId
                  ancestorIds
                  childrenIds
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        search: input.search || undefined,
        childrenOf: input.childrenOf || undefined,
        siblingsOf: input.siblingsOf || undefined,
        descendantsOf: input.descendantsOf || undefined
      })) as any;

      const categories = data.taxonomy.categories.edges.map((e: any) => ({
        cursor: e.cursor,
        ...e.node
      }));

      return { categories, pageInfo: data.taxonomy.categories.pageInfo };
    } catch (error) {
      console.error("Error fetching taxonomy:", error);
      throw new Error(`Failed to fetch taxonomy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getTaxonomy };
