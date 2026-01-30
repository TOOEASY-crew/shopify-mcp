import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID"]).default("ID"),
  reverse: z.boolean().default(false),
  includeClosed: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getFulfillmentOrders = {
  name: "get-fulfillment-orders",
  description: "Get fulfillment orders with filtering and pagination. Use query for filtering. Set includeClosed to true to include closed fulfillment orders.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query FulfillmentOrders($first: Int!, $after: String, $query: String, $sortKey: FulfillmentOrderSortKeys, $reverse: Boolean, $includeClosed: Boolean) {
          fulfillmentOrders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse, includeClosed: $includeClosed) {
            edges {
              cursor
              node {
                id
                status
                requestStatus
                createdAt
                updatedAt
                fulfillAt
                fulfillBy

                order {
                  id
                  name
                }
                orderId
                orderName

                assignedLocation {
                  name
                  address1
                  city
                  province
                  countryCode
                  zip
                  phone
                }

                destination {
                  firstName
                  lastName
                  address1
                  address2
                  city
                  province
                  countryCode
                  zip
                  phone
                  email
                }

                deliveryMethod {
                  methodType
                }

                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      productTitle
                      variantTitle
                      sku
                      totalQuantity
                      remainingQuantity
                      requiresShipping
                    }
                  }
                }

                fulfillmentHolds {
                  reason
                  reasonNotes
                }

                supportedActions {
                  action
                  externalUrl
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
        sortKey: input.sortKey,
        reverse: input.reverse,
        includeClosed: input.includeClosed
      })) as any;

      const fulfillmentOrders = data.fulfillmentOrders.edges.map((edge: any) => {
        const fo = edge.node;
        return {
          cursor: edge.cursor,
          ...fo,
          lineItems: fo.lineItems?.edges?.map((e: any) => e.node) || []
        };
      });

      return { fulfillmentOrders, pageInfo: data.fulfillmentOrders.pageInfo };
    } catch (error) {
      console.error("Error fetching fulfillment orders:", error);
      throw new Error(`Failed to fetch fulfillment orders: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getFulfillmentOrders };
