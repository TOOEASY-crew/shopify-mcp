import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "CREATED_AT"]).default("ID")
});

let shopifyClient: GraphQLClient;

const getComments = {
  name: "get-comments",
  description: "Get comments with filtering and pagination. Use query for filtering (e.g. 'status:pending', 'article_id:gid://shopify/Article/123').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Comments($first: Int!, $after: String, $query: String, $sortKey: CommentSortKeys) {
          comments(first: $first, after: $after, query: $query, sortKey: $sortKey) {
            edges {
              cursor
              node {
                id
                body
                bodyHtml
                isPublished
                publishedAt
                status
                createdAt
                updatedAt
                author { name email }
                article {
                  id
                  title
                  handle
                  blog { id title }
                }
                ip
                userAgent
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey
      })) as { comments: any };

      const comments = data.comments.edges.map((edge: any) => ({
        cursor: edge.cursor,
        ...edge.node
      }));

      return { comments, pageInfo: data.comments.pageInfo };
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw new Error(`Failed to fetch comments: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getComments };
