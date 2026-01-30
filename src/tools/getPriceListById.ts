import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  priceListId: z.string().min(1),
  pricesFirst: z.number().default(50)
});

let shopifyClient: GraphQLClient;

const getPriceListById = {
  name: "get-price-list-by-id",
  description: "Get a single price list by ID with its prices.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query PriceList($id: ID!, $pricesFirst: Int!) {
          priceList(id: $id) {
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
            prices(first: $pricesFirst) {
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
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        id: input.priceListId,
        pricesFirst: input.pricesFirst
      })) as any;

      if (!data.priceList) {
        throw new Error(`Price list with ID ${input.priceListId} not found`);
      }

      const p = data.priceList;
      return {
        priceList: {
          ...p,
          prices: p.prices?.edges?.map((e: any) => e.node) || [],
          pricesPageInfo: p.prices?.pageInfo
        }
      };
    } catch (error) {
      console.error("Error fetching price list:", error);
      throw new Error(`Failed to fetch price list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getPriceListById };
