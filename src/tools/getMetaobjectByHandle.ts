import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  type: z.string().min(1),
  handle: z.string().min(1)
});

let shopifyClient: GraphQLClient;

const getMetaobjectByHandle = {
  name: "get-metaobject-by-handle",
  description: "Get a single metaobject by its type and handle.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query MetaobjectByHandle($handle: MetaobjectHandleInput!) {
          metaobjectByHandle(handle: $handle) {
            id
            type
            handle
            displayName
            createdAt
            updatedAt
            fields {
              key
              value
              type
              reference {
                ... on Product { id title }
                ... on ProductVariant { id title }
                ... on Collection { id title }
                ... on Customer { id displayName }
                ... on MediaImage { id image { url altText } }
                ... on Metaobject { id type handle }
              }
              references(first: 10) {
                edges {
                  node {
                    ... on Product { id title }
                    ... on Metaobject { id type }
                  }
                }
              }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        handle: { type: input.type, handle: input.handle }
      })) as any;

      if (!data.metaobjectByHandle) {
        return { metaobject: null, message: `Metaobject with type '${input.type}' and handle '${input.handle}' not found` };
      }

      const m = data.metaobjectByHandle;
      return {
        metaobject: {
          ...m,
          fields: m.fields?.map((f: any) => ({
            ...f,
            references: f.references?.edges?.map((e: any) => e.node) || []
          })) || []
        }
      };
    } catch (error) {
      console.error("Error fetching metaobject by handle:", error);
      throw new Error(`Failed to fetch metaobject: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetaobjectByHandle };
