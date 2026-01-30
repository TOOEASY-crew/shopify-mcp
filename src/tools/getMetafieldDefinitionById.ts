import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  ownerType: z.enum(["PRODUCT", "PRODUCTVARIANT", "CUSTOMER", "ORDER", "DRAFTORDER", "COLLECTION", "SHOP", "LOCATION", "ARTICLE", "BLOG", "PAGE", "COMPANY", "COMPANYLOCATION", "MARKET", "DISCOUNT"]),
  key: z.string().min(1),
  namespace: z.string().optional()
});

let shopifyClient: GraphQLClient;

const getMetafieldDefinitionById = {
  name: "get-metafield-definition",
  description: "Get a single metafield definition by ownerType + key (+ optional namespace). Returns type, validations, access settings, and metafield count.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query MetafieldDefinition($identifier: MetafieldDefinitionIdentifierInput!) {
          metafieldDefinition(identifier: $identifier) {
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
      `;

      const identifier: any = {
        ownerType: input.ownerType,
        key: input.key
      };
      if (input.namespace) identifier.namespace = input.namespace;

      const data = (await shopifyClient.request(query, { identifier })) as any;

      if (!data.metafieldDefinition) {
        return { definition: null, message: `Metafield definition not found for ${input.ownerType}/${input.namespace || '*'}/${input.key}` };
      }

      return { definition: data.metafieldDefinition };
    } catch (error) {
      console.error("Error fetching metafield definition:", error);
      throw new Error(`Failed to fetch metafield definition: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetafieldDefinitionById };
