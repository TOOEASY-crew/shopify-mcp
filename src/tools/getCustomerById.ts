import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  customerId: z.string().min(1)
});

let shopifyClient: GraphQLClient;

const getCustomerById = {
  name: "get-customer-by-id",
  description: "Get a specific customer by ID with full details including order history and customer journey",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Customer($id: ID!) {
          customer(id: $id) {
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
              totalPriceSet { shopMoney { amount currencyCode } }
              customerJourneySummary {
                customerOrderIndex
                daysToConversion
                firstVisit {
                  landingPage
                  referrerUrl
                  source
                  utmParameters { source medium campaign }
                }
                lastVisit {
                  landingPage
                  referrerUrl
                }
              }
            }
            orders(first: 50, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  id
                  name
                  createdAt
                  displayFinancialStatus
                  displayFulfillmentStatus
                  currentTotalPriceSet { shopMoney { amount currencyCode } }
                  lineItems(first: 5) {
                    edges {
                      node { title quantity }
                    }
                  }
                }
              }
            }
            productSubscriberStatus
            image { url altText }
            metafields(first: 20) {
              edges {
                node { namespace key value type }
              }
            }
            statistics { predictedSpendTier }
            canDelete
            legacyResourceId
          }
        }
      `;

      const data = (await shopifyClient.request(query, { id: input.customerId })) as { customer: any };
      if (!data.customer) throw new Error(`Customer ${input.customerId} not found`);

      const c = data.customer;
      return {
        customer: {
          ...c,
          orders: c.orders?.edges?.map((e: any) => {
            const o = e.node;
            return {
              ...o,
              lineItems: o.lineItems?.edges?.map((le: any) => le.node) || []
            };
          }) || [],
          metafields: c.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching customer:", error);
      throw new Error(`Failed to fetch customer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCustomerById };
