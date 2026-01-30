import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  email: z.string().optional(),
  phone: z.string().optional()
});

let shopifyClient: GraphQLClient;

const getCustomerByIdentifier = {
  name: "get-customer-by-identifier",
  description: "Find a customer by email or phone number. Provide either email or phone (not both).",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      if (!input.email && !input.phone) {
        throw new Error("Either email or phone must be provided");
      }

      const query = gql`
        query CustomerByIdentifier($identifier: CustomerIdentifierInput!) {
          customerByIdentifier(identifier: $identifier) {
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
            numberOfOrders
            amountSpent { amount currencyCode }
            tags
            note
            defaultAddress {
              id
              name
              address1
              address2
              city
              province
              country
              zip
              phone
              formatted
            }
            lastOrder {
              id
              name
              createdAt
              totalPriceSet { shopMoney { amount currencyCode } }
            }
            metafields(first: 20) {
              edges {
                node { namespace key value type }
              }
            }
          }
        }
      `;

      const identifier: any = {};
      if (input.email) identifier.emailAddress = input.email;
      if (input.phone) identifier.phoneNumber = input.phone;

      const data = (await shopifyClient.request(query, { identifier })) as any;

      if (!data.customerByIdentifier) {
        return { customer: null, message: "Customer not found" };
      }

      const c = data.customerByIdentifier;
      return {
        customer: {
          ...c,
          metafields: c.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching customer by identifier:", error);
      throw new Error(`Failed to fetch customer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCustomerByIdentifier };
