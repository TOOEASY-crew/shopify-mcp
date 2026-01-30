import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  sortKey: z.enum(["ID", "NAME"]).default("ID"),
  reverse: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getPriceLists = {
  name: "get-price-lists",
  description: "Get price lists with pagination",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query PriceLists($first: Int!, $after: String, $sortKey: PriceListSortKeys, $reverse: Boolean) {
          priceLists(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                name
                currency
                fixedPricesCount
                parent {
                  adjustment {
                    type
                    value
                  }
                }
                catalog {
                  id
                  title
                  status
                }
                prices(first: 50) {
                  edges {
                    node {
                      variant {
                        id
                        title
                        displayName
                        sku
                        product { id title }
                      }
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      originType
                    }
                  }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        sortKey: input.sortKey,
        reverse: input.reverse
      })) as { priceLists: any };

      const priceLists = data.priceLists.edges.map((edge: any) => {
        const p = edge.node;
        return {
          cursor: edge.cursor,
          ...p,
          prices: p.prices?.edges?.map((e: any) => e.node) || []
        };
      });

      return { priceLists, pageInfo: data.priceLists.pageInfo };
    } catch (error) {
      console.error("Error fetching price lists:", error);
      throw new Error(`Failed to fetch price lists: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getPriceLists };
