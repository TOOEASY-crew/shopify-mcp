import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  metaobjectId: z.string().min(1)
});

let shopifyClient: GraphQLClient;

const getMetaobjectById = {
  name: "get-metaobject-by-id",
  description: "Get a single metaobject by its global ID.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Metaobject($id: ID!) {
          metaobject(id: $id) {
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

      const data = (await shopifyClient.request(query, { id: input.metaobjectId })) as any;

      if (!data.metaobject) {
        throw new Error(`Metaobject with ID ${input.metaobjectId} not found`);
      }

      const m = data.metaobject;
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
      console.error("Error fetching metaobject:", error);
      throw new Error(`Failed to fetch metaobject: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetaobjectById };
