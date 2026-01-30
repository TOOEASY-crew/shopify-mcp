import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "CREATED_AT", "UPDATED_AT"]).default("ID"),
  reverse: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getInventoryTransfers = {
  name: "get-inventory-transfers",
  description: "Get inventory transfers with filtering and pagination. Use query for filtering (e.g. 'status:pending').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query InventoryTransfers($first: Int!, $after: String, $query: String, $sortKey: TransferSortKeys, $reverse: Boolean) {
          inventoryTransfers(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                name
                status
                note
                referenceName
                tags
                dateCreated
                totalQuantity
                receivedQuantity

                origin {
                  name
                  address { address1 city province country }
                  location { id name }
                }
                destination {
                  name
                  address { address1 city province country }
                  location { id name }
                }

                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      title
                      totalQuantity
                      shippedQuantity
                      shippableQuantity
                      inventoryItem {
                        id
                        sku
                      }
                    }
                  }
                }
                lineItemsCount { count }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey,
        reverse: input.reverse
      })) as any;

      const transfers = data.inventoryTransfers.edges.map((edge: any) => {
        const t = edge.node;
        return {
          cursor: edge.cursor,
          ...t,
          lineItems: t.lineItems?.edges?.map((e: any) => e.node) || [],
          lineItemsCount: t.lineItemsCount?.count || 0
        };
      });

      return { transfers, pageInfo: data.inventoryTransfers.pageInfo };
    } catch (error) {
      console.error("Error fetching inventory transfers:", error);
      throw new Error(`Failed to fetch inventory transfers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getInventoryTransfers };
