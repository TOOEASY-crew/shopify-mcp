import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "UPDATED_AT", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getPages = {
  name: "get-pages",
  description: "Get pages with filtering, sorting, and pagination. Use query for filtering (e.g. 'title:*About*', 'handle:contact', 'published_status:published').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Pages($first: Int!, $after: String, $query: String, $sortKey: PageSortKeys, $reverse: Boolean) {
          pages(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                title
                handle
                body
                bodySummary
                isPublished
                publishedAt
                createdAt
                updatedAt
                templateSuffix
                metafields(first: 20) {
                  edges {
                    node {
                      namespace
                      key
                      value
                      type
                      reference {
                        ... on MediaImage { image { url } }
                        ... on Metaobject { id type handle }
                      }
                    }
                  }
                }
              }
            }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey,
        reverse: input.reverse
      })) as { pages: any };

      const pages = data.pages.edges.map((edge: any) => {
        const p = edge.node;
        return {
          cursor: edge.cursor,
          id: p.id,
          title: p.title,
          handle: p.handle,
          body: p.body,
          bodySummary: p.bodySummary,
          isPublished: p.isPublished,
          publishedAt: p.publishedAt,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          templateSuffix: p.templateSuffix,
          metafields: p.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return { pages, pageInfo: data.pages.pageInfo };
    } catch (error) {
      console.error("Error fetching pages:", error);
      throw new Error(`Failed to fetch pages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getPages };
