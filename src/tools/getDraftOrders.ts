import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "STATUS", "TOTAL_PRICE", "UPDATED_AT", "CREATED_AT", "CUSTOMER_NAME", "NUMBER", "RELEVANCE"]).default("ID")
});

let shopifyClient: GraphQLClient;

const getDraftOrders = {
  name: "get-draft-orders",
  description: "Get draft orders with filtering and pagination. Use query for filtering (e.g. 'status:open', 'status:invoice_sent').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query DraftOrders($first: Int!, $after: String, $query: String, $sortKey: DraftOrderSortKeys) {
          draftOrders(first: $first, after: $after, query: $query, sortKey: $sortKey) {
            edges {
              cursor
              node {
                id
                name
                status
                createdAt
                updatedAt
                completedAt
                invoiceSentAt
                invoiceUrl
                customer { id displayName email }
                email
                totalPriceSet { shopMoney { amount currencyCode } }
                subtotalPriceSet { shopMoney { amount currencyCode } }
                lineItems(first: 20) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant { id title sku }
                      originalTotalSet { shopMoney { amount currencyCode } }
                    }
                  }
                }
                shippingAddress { formatted }
                billingAddress { formatted }
                note2
                tags
                order { id name }
                metafields(first: 10) {
                  edges {
                    node { namespace key value }
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
        query: input.query || undefined,
        sortKey: input.sortKey
      })) as { draftOrders: any };

      const draftOrders = data.draftOrders.edges.map((edge: any) => {
        const d = edge.node;
        return {
          cursor: edge.cursor,
          ...d,
          lineItems: d.lineItems?.edges?.map((e: any) => e.node) || [],
          metafields: d.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return { draftOrders, pageInfo: data.draftOrders.pageInfo };
    } catch (error) {
      console.error("Error fetching draft orders:", error);
      throw new Error(`Failed to fetch draft orders: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getDraftOrders };
