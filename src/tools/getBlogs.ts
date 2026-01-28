import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getBlogs
const GetBlogsInputSchema = z.object({
  limit: z.number().default(10)
});

type GetBlogsInput = z.infer<typeof GetBlogsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const getBlogs = {
  name: "get-blogs",
  description: "Get all blogs from the store",
  schema: GetBlogsInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetBlogsInput) => {
    try {
      const { limit } = input;

      const query = gql`
        query GetBlogs($first: Int!) {
          blogs(first: $first) {
            nodes {
              id
              title
              handle
              commentPolicy
              createdAt
              updatedAt
              articlesCount {
                count
              }
              tags
            }
          }
        }
      `;

      const variables = {
        first: limit
      };

      const data = (await shopifyClient.request(query, variables)) as {
        blogs: any;
      };

      // Extract and format blog data
      const blogs = data.blogs.nodes.map((blog: any) => ({
        id: blog.id,
        title: blog.title,
        handle: blog.handle,
        commentPolicy: blog.commentPolicy,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        articlesCount: blog.articlesCount?.count || 0,
        tags: blog.tags || []
      }));

      return { blogs };
    } catch (error) {
      console.error("Error fetching blogs:", error);
      throw new Error(
        `Failed to fetch blogs: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getBlogs };
