import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  ownerType: z.enum(["PRODUCT", "PRODUCTVARIANT", "CUSTOMER", "ORDER", "DRAFTORDER", "COLLECTION", "SHOP", "LOCATION", "ARTICLE", "BLOG", "PAGE", "COMPANY", "COMPANYLOCATION", "MARKET", "DISCOUNT"]),
  namespace: z.string().optional(),
  first: z.number().default(50)
});

let shopifyClient: GraphQLClient;

const getMetafieldDefinitions = {
  name: "get-metafield-definitions",
  description: "Get metafield definitions for a specific owner type (e.g. PRODUCT, CUSTOMER, ORDER). Optionally filter by namespace.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query MetafieldDefinitions($ownerType: MetafieldOwnerType!, $namespace: String, $first: Int!) {
          metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, first: $first) {
            edges {
              node {
                id
                name
                namespace
                key
                description
                type { name }
                validations { name value }
                access {
                  admin
                  storefront
                }
                pinnedPosition
                useAsCollectionCondition
                ownerType
                metafieldsCount
              }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        ownerType: input.ownerType,
        namespace: input.namespace || undefined,
        first: input.first
      })) as { metafieldDefinitions: any };

      const definitions = data.metafieldDefinitions.edges.map((e: any) => e.node);
      return { definitions };
    } catch (error) {
      console.error("Error fetching metafield definitions:", error);
      throw new Error(`Failed to fetch metafield definitions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetafieldDefinitions };
