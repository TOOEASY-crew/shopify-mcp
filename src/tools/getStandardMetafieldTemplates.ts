import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(50),
  after: z.string().optional(),
  excludeActivated: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getStandardMetafieldTemplates = {
  name: "get-standard-metafield-templates",
  description: "Get standard metafield definition templates (preset configurations like product subtitle, care guide, ISBN, etc.). Set excludeActivated to true to only show templates not yet enabled.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query StandardMetafieldTemplates($first: Int!, $after: String, $excludeActivated: Boolean) {
          standardMetafieldDefinitionTemplates(first: $first, after: $after, excludeActivated: $excludeActivated) {
            edges {
              cursor
              node {
                id
                name
                namespace
                key
                description
                ownerTypes
                type { name category }
                validations { name value }
                visibleToStorefrontApi
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        excludeActivated: input.excludeActivated
      })) as any;

      const templates = data.standardMetafieldDefinitionTemplates.edges.map((e: any) => ({
        cursor: e.cursor,
        ...e.node
      }));

      return { templates, pageInfo: data.standardMetafieldDefinitionTemplates.pageInfo };
    } catch (error) {
      console.error("Error fetching standard metafield templates:", error);
      throw new Error(`Failed to fetch standard metafield templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getStandardMetafieldTemplates };
