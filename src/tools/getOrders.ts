import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetOrdersInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["PROCESSED_AT", "TOTAL_PRICE", "ID", "CREATED_AT", "UPDATED_AT", "CUSTOMER_NAME", "FINANCIAL_STATUS", "FULFILLMENT_STATUS", "ORDER_NUMBER", "RELEVANCE"]).default("PROCESSED_AT"),
  reverse: z.boolean().default(false)
});

type GetOrdersInput = z.infer<typeof GetOrdersInputSchema>;

let shopifyClient: GraphQLClient;

const getOrders = {
  name: "get-orders",
  description: "Get orders with filtering, sorting, and pagination. Use query parameter for filtering (e.g. 'status:open', 'financial_status:paid', 'fulfillment_status:unfulfilled', 'created_at:>=2025-01-01', 'total_price:>=100000', 'tag:vip', 'email:customer@example.com', 'discount_code:SUMMER20').",
  schema: GetOrdersInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetOrdersInput) => {
    try {
      const query = gql`
        query Orders(
          $first: Int!
          $after: String
          $query: String
          $sortKey: OrderSortKeys
          $reverse: Boolean
        ) {
          orders(
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
                name
                confirmationNumber
                createdAt
                processedAt
                updatedAt
                closedAt
                cancelledAt

                displayFinancialStatus
                displayFulfillmentStatus
                confirmed
                closed
                cancelReason

                currencyCode
                currentTotalPriceSet {
                  shopMoney { amount currencyCode }
                  presentmentMoney { amount currencyCode }
                }
                currentSubtotalPriceSet {
                  shopMoney { amount currencyCode }
                }
                totalShippingPriceSet {
                  shopMoney { amount currencyCode }
                }
                currentTotalTaxSet {
                  shopMoney { amount currencyCode }
                }
                currentTotalDiscountsSet {
                  shopMoney { amount currencyCode }
                }
                totalRefundedSet {
                  shopMoney { amount currencyCode }
                }

                discountCode
                discountCodes

                customer {
                  id
                  displayName
                  email
                  phone
                  numberOfOrders
                  amountSpent { amount currencyCode }
                  tags
                }
                email
                phone

                shippingAddress {
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
                billingAddress {
                  name
                  address1
                  city
                  province
                  country
                  zip
                }

                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      title
                      name
                      quantity
                      currentQuantity
                      sku
                      vendor
                      variantTitle

                      originalTotalSet {
                        shopMoney { amount currencyCode }
                      }
                      discountedTotalSet {
                        shopMoney { amount currencyCode }
                      }

                      variant {
                        id
                        title
                        sku
                        price
                        product {
                          id
                          title
                          handle
                        }
                      }

                      image {
                        url
                        altText
                      }

                      customAttributes {
                        key
                        value
                      }
                    }
                  }
                }

                fulfillments(first: 10) {
                  id
                  status
                  displayStatus
                  createdAt
                  deliveredAt
                  estimatedDeliveryAt
                  trackingInfo(first: 5) {
                    company
                    number
                    url
                  }
                }

                shippingLine {
                  title
                  code
                  originalPriceSet {
                    shopMoney { amount currencyCode }
                  }
                }

                paymentGatewayNames

                note
                tags
                customAttributes {
                  key
                  value
                }

                risks {
                  level
                  message
                  display
                }

                returns(first: 5) {
                  edges {
                    node {
                      id
                      status
                    }
                  }
                }
                refunds(first: 5) {
                  id
                  createdAt
                  totalRefundedSet {
                    shopMoney { amount currencyCode }
                  }
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

      const data = (await shopifyClient.request(query, variables)) as { orders: any };

      const orders = data.orders.edges.map((edge: any) => {
        const o = edge.node;
        return {
          cursor: edge.cursor,
          id: o.id,
          name: o.name,
          confirmationNumber: o.confirmationNumber,
          createdAt: o.createdAt,
          processedAt: o.processedAt,
          updatedAt: o.updatedAt,
          closedAt: o.closedAt,
          cancelledAt: o.cancelledAt,
          financialStatus: o.displayFinancialStatus,
          fulfillmentStatus: o.displayFulfillmentStatus,
          confirmed: o.confirmed,
          closed: o.closed,
          cancelReason: o.cancelReason,
          currencyCode: o.currencyCode,
          totalPrice: o.currentTotalPriceSet?.shopMoney,
          subtotalPrice: o.currentSubtotalPriceSet?.shopMoney,
          totalShipping: o.totalShippingPriceSet?.shopMoney,
          totalTax: o.currentTotalTaxSet?.shopMoney,
          totalDiscounts: o.currentTotalDiscountsSet?.shopMoney,
          totalRefunded: o.totalRefundedSet?.shopMoney,
          discountCode: o.discountCode,
          discountCodes: o.discountCodes,
          customer: o.customer,
          email: o.email,
          phone: o.phone,
          shippingAddress: o.shippingAddress,
          billingAddress: o.billingAddress,
          lineItems: o.lineItems?.edges?.map((e: any) => {
            const li = e.node;
            return {
              id: li.id,
              title: li.title,
              name: li.name,
              quantity: li.quantity,
              currentQuantity: li.currentQuantity,
              sku: li.sku,
              vendor: li.vendor,
              variantTitle: li.variantTitle,
              originalTotal: li.originalTotalSet?.shopMoney,
              discountedTotal: li.discountedTotalSet?.shopMoney,
              variant: li.variant,
              image: li.image,
              customAttributes: li.customAttributes
            };
          }) || [],
          fulfillments: o.fulfillments || [],
          shippingLine: o.shippingLine,
          paymentGatewayNames: o.paymentGatewayNames,
          note: o.note,
          tags: o.tags,
          customAttributes: o.customAttributes,
          risks: o.risks,
          returns: o.returns?.edges?.map((e: any) => e.node) || [],
          refunds: o.refunds || [],
          metafields: o.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return {
        orders,
        pageInfo: data.orders.pageInfo
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error(`Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getOrders };
