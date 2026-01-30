import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  type: z.string().optional(),
  first: z.number().default(20),
  after: z.string().optional()
});

let shopifyClient: GraphQLClient;

const getMetaobjectDefinitions = {
  name: "get-metaobject-definitions",
  description: "Get metaobject definitions. If type is provided, returns a single definition by type. Otherwise returns all definitions.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      if (input.type) {
        const query = gql`
          query MetaobjectDefinitionByType($type: String!) {
            metaobjectDefinitionByType(type: $type) {
              id
              name
              type
              description
              displayNameKey
              hasThumbnailField
              metaobjectsCount
              access { admin storefront }
              capabilities {
                publishable { enabled }
                translatable { enabled }
              }
              fieldDefinitions {
                key
                name
                description
                required
                type { name }
                validations { name value }
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, { type: input.type })) as any;

        if (!data.metaobjectDefinitionByType) {
          return { definition: null, message: `Metaobject definition with type '${input.type}' not found` };
        }

        return { definition: data.metaobjectDefinitionByType };
      }

      const query = gql`
        query MetaobjectDefinitions($first: Int!, $after: String) {
          metaobjectDefinitions(first: $first, after: $after) {
            edges {
              cursor
              node {
                id
                name
                type
                description
                displayNameKey
                metaobjectsCount
                access { admin storefront }
                capabilities {
                  publishable { enabled }
                  translatable { enabled }
                }
                fieldDefinitions {
                  key
                  name
                  type { name }
                  required
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined
      })) as any;

      const definitions = data.metaobjectDefinitions.edges.map((e: any) => ({
        cursor: e.cursor,
        ...e.node
      }));

      return { definitions, pageInfo: data.metaobjectDefinitions.pageInfo };
    } catch (error) {
      console.error("Error fetching metaobject definitions:", error);
      throw new Error(`Failed to fetch metaobject definitions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetaobjectDefinitions };
