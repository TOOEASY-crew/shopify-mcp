import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  type: z.string().min(1),
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.string().optional(),
  reverse: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getMetaobjects = {
  name: "get-metaobjects",
  description: "Get metaobjects by type with filtering and pagination. Use query for filtering (e.g. 'fields.status:approved', 'fields.rating:>=4').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Metaobjects($type: String!, $first: Int!, $after: String, $query: String, $sortKey: String, $reverse: Boolean) {
          metaobjects(type: $type, first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
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
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        type: input.type,
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey || undefined,
        reverse: input.reverse
      })) as { metaobjects: any };

      const metaobjects = data.metaobjects.edges.map((edge: any) => {
        const m = edge.node;
        return {
          cursor: edge.cursor,
          id: m.id,
          type: m.type,
          handle: m.handle,
          displayName: m.displayName,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          fields: m.fields?.map((f: any) => ({
            key: f.key,
            value: f.value,
            type: f.type,
            reference: f.reference,
            references: f.references?.edges?.map((e: any) => e.node) || []
          })) || []
        };
      });

      return { metaobjects, pageInfo: data.metaobjects.pageInfo };
    } catch (error) {
      console.error("Error fetching metaobjects:", error);
      throw new Error(`Failed to fetch metaobjects: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetaobjects };
