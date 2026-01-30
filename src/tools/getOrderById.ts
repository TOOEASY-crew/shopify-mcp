import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetOrderByIdInputSchema = z.object({
  orderId: z.string().min(1)
});

type GetOrderByIdInput = z.infer<typeof GetOrderByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getOrderById = {
  name: "get-order-by-id",
  description: "Get a specific order by ID with full details including line items, fulfillments, events, and metafields",
  schema: GetOrderByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetOrderByIdInput) => {
    try {
      const query = gql`
        query Order($id: ID!) {
          order(id: $id) {
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
            discountApplications(first: 10) {
              edges {
                node {
                  ... on DiscountCodeApplication {
                    code
                    value {
                      ... on MoneyV2 { amount currencyCode }
                      ... on PricingPercentageValue { percentage }
                    }
                  }
                  ... on AutomaticDiscountApplication {
                    title
                  }
                }
              }
            }

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
                      featuredMedia {
                        ... on MediaImage {
                          image { url altText }
                        }
                      }
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
              fulfillmentLineItems(first: 20) {
                edges {
                  node {
                    lineItem { id title quantity }
                    quantity
                  }
                }
              }
            }

            fulfillmentOrders(first: 10) {
              edges {
                node {
                  id
                  status
                  requestStatus
                  fulfillAt
                  assignedLocation {
                    name
                  }
                  lineItems(first: 20) {
                    edges {
                      node {
                        id
                        totalQuantity
                        remainingQuantity
                        lineItem { title sku }
                      }
                    }
                  }
                }
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
            transactions(first: 10) {
              id
              kind
              status
              amountSet {
                shopMoney { amount currencyCode }
              }
              gateway
              createdAt
            }

            note
            tags
            customAttributes {
              key
              value
            }

            app {
              name
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

            events(first: 20, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  ... on BasicEvent {
                    message
                    createdAt
                  }
                }
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
      `;

      const data = (await shopifyClient.request(query, { id: input.orderId })) as { order: any };

      if (!data.order) {
        throw new Error(`Order with ID ${input.orderId} not found`);
      }

      const o = data.order;
      return {
        order: {
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
          discountApplications: o.discountApplications?.edges?.map((e: any) => e.node) || [],
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
          fulfillmentOrders: o.fulfillmentOrders?.edges?.map((e: any) => e.node) || [],
          shippingLine: o.shippingLine,
          paymentGatewayNames: o.paymentGatewayNames,
          transactions: o.transactions || [],
          note: o.note,
          tags: o.tags,
          customAttributes: o.customAttributes,
          app: o.app,
          risks: o.risks,
          returns: o.returns?.edges?.map((e: any) => e.node) || [],
          refunds: o.refunds || [],
          events: o.events?.edges?.map((e: any) => e.node) || [],
          metafields: o.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching order by ID:", error);
      throw new Error(`Failed to fetch order: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getOrderById };
