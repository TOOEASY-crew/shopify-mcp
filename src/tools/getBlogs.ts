import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetBlogsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "HANDLE"]).default("ID")
});

type GetBlogsInput = z.infer<typeof GetBlogsInputSchema>;

let shopifyClient: GraphQLClient;

const getBlogs = {
  name: "get-blogs",
  description: "Get all blogs with filtering and pagination. Use query parameter for filtering (e.g. 'title:*News*', 'handle:company-blog').",
  schema: GetBlogsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetBlogsInput) => {
    try {
      const query = gql`
        query Blogs($first: Int!, $after: String, $query: String, $sortKey: BlogSortKeys) {
          blogs(first: $first, after: $after, query: $query, sortKey: $sortKey) {
            edges {
              cursor
              node {
                id
                title
                handle
                commentPolicy
                createdAt
                updatedAt
                templateSuffix
                tags

                feed {
                  location
                  path
                }

                articles(first: 20) {
                  edges {
                    node {
                      id
                      title
                      handle
                      isPublished
                      publishedAt
                      author { name }
                      summary
                      tags
                    }
                  }
                }
                articlesCount { count }

                metafields(first: 10) {
                  edges {
                    node { namespace key value type }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey
      };

      const data = (await shopifyClient.request(query, variables)) as { blogs: any };

      const blogs = data.blogs.edges.map((edge: any) => {
        const b = edge.node;
        return {
          cursor: edge.cursor,
          id: b.id,
          title: b.title,
          handle: b.handle,
          commentPolicy: b.commentPolicy,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          templateSuffix: b.templateSuffix,
          tags: b.tags || [],
          feed: b.feed,
          articles: b.articles?.edges?.map((e: any) => e.node) || [],
          articlesCount: b.articlesCount?.count || 0,
          metafields: b.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return {
        blogs,
        pageInfo: data.blogs.pageInfo
      };
    } catch (error) {
      console.error("Error fetching blogs:", error);
      throw new Error(`Failed to fetch blogs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getBlogs };
