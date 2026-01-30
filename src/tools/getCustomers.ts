import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetCustomersInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "NAME", "LOCATION", "ORDER_COUNT", "LAST_ORDER_DATE", "TOTAL_SPENT", "UPDATED_AT", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false)
});

type GetCustomersInput = z.infer<typeof GetCustomersInputSchema>;

let shopifyClient: GraphQLClient;

const getCustomers = {
  name: "get-customers",
  description: "Get customers with filtering, sorting, and pagination. Use query parameter for filtering (e.g. 'email:*@example.com', 'tag:vip', 'orders_count:>=5', 'total_spent:>=500000', 'state:enabled', 'country:KR', 'created_at:>=2025-01-01').",
  schema: GetCustomersInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetCustomersInput) => {
    try {
      const query = gql`
        query Customers(
          $first: Int!
          $after: String
          $query: String
          $sortKey: CustomerSortKeys
          $reverse: Boolean
        ) {
          customers(
            first: $first
            after: $after
            query: $query
            sortKey: $sortKey
            reverse: $reverse
          ) {
            edges {
              cursor
              node {
                id
                displayName
                firstName
                lastName
                email
                phone
                locale
                createdAt
                updatedAt

                state
                verifiedEmail
                taxExempt
                taxExemptions

                numberOfOrders
                amountSpent { amount currencyCode }
                lifetimeDuration

                tags
                note

                defaultAddress {
                  id
                  name
                  firstName
                  lastName
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                  phone
                  company
                  formatted
                }
                addresses(first: 10) {
                  id
                  address1
                  city
                  country
                  zip
                  formatted
                }

                defaultEmailAddress {
                  emailAddress
                  marketingState
                }

                defaultPhoneNumber {
                  phoneNumber
                  marketingState
                }

                lastOrder {
                  id
                  name
                  createdAt
                  totalPriceSet {
                    shopMoney { amount currencyCode }
                  }
                }

                orders(first: 10, sortKey: CREATED_AT, reverse: true) {
                  edges {
                    node {
                      id
                      name
                      createdAt
                      displayFinancialStatus
                      displayFulfillmentStatus
                      currentTotalPriceSet {
                        shopMoney { amount currencyCode }
                      }
                    }
                  }
                }

                productSubscriberStatus

                image {
                  url
                  altText
                }

                metafields(first: 20) {
                  edges {
                    node {
                      namespace
                      key
                      value
                      type
                    }
                  }
                }

                statistics {
                  predictedSpendTier
                }

                canDelete
                legacyResourceId
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey,
        reverse: input.reverse
      };

      const data = (await shopifyClient.request(query, variables)) as { customers: any };

      const customers = data.customers.edges.map((edge: any) => {
        const c = edge.node;
        return {
          cursor: edge.cursor,
          id: c.id,
          displayName: c.displayName,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          locale: c.locale,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          state: c.state,
          verifiedEmail: c.verifiedEmail,
          taxExempt: c.taxExempt,
          taxExemptions: c.taxExemptions,
          numberOfOrders: c.numberOfOrders,
          amountSpent: c.amountSpent,
          lifetimeDuration: c.lifetimeDuration,
          tags: c.tags,
          note: c.note,
          defaultAddress: c.defaultAddress,
          addresses: c.addresses || [],
          defaultEmailAddress: c.defaultEmailAddress,
          defaultPhoneNumber: c.defaultPhoneNumber,
          lastOrder: c.lastOrder,
          recentOrders: c.orders?.edges?.map((e: any) => e.node) || [],
          productSubscriberStatus: c.productSubscriberStatus,
          image: c.image,
          metafields: c.metafields?.edges?.map((e: any) => e.node) || [],
          statistics: c.statistics,
          canDelete: c.canDelete,
          legacyResourceId: c.legacyResourceId
        };
      });

      return {
        customers,
        pageInfo: data.customers.pageInfo
      };
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw new Error(`Failed to fetch customers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCustomers };
