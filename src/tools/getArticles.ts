import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "BLOG_TITLE", "AUTHOR", "UPDATED_AT", "PUBLISHED_AT", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getArticles = {
  name: "get-articles",
  description: "Get articles with filtering, sorting, and pagination. Use query for filtering (e.g. 'tag:announcement', 'author:Marketing', 'blog_id:gid://shopify/Blog/123', 'published_status:published').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Articles($first: Int!, $after: String, $query: String, $sortKey: ArticleSortKeys, $reverse: Boolean) {
          articles(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                title
                handle
                body
                summary
                isPublished
                publishedAt
                createdAt
                updatedAt
                author { name }
                blog { id title handle }
                image { url altText width height }
                tags
                templateSuffix
                comments(first: 20) {
                  edges {
                    node {
                      id
                      author { name email }
                      body
                      bodyHtml
                      isPublished
                      publishedAt
                      status
                      createdAt
                    }
                  }
                }
                commentsCount { count }
                metafields(first: 20) {
                  edges {
                    node {
                      namespace
                      key
                      value
                      type
                      reference {
                        ... on Product { id title handle }
                        ... on Collection { id title handle }
                        ... on Metaobject { id type handle }
                        ... on MediaImage { id image { url altText } }
                      }
                      references(first: 10) {
                        edges {
                          node {
                            ... on Product { id title handle }
                            ... on Collection { id title handle }
                            ... on Metaobject { id type handle }
                          }
                        }
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
      })) as { articles: any };

      const articles = data.articles.edges.map((edge: any) => {
        const a = edge.node;
        return {
          cursor: edge.cursor,
          id: a.id,
          title: a.title,
          handle: a.handle,
          body: a.body,
          summary: a.summary,
          isPublished: a.isPublished,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          author: a.author,
          blog: a.blog,
          image: a.image,
          tags: a.tags,
          templateSuffix: a.templateSuffix,
          comments: a.comments?.edges?.map((e: any) => e.node) || [],
          commentsCount: a.commentsCount?.count || 0,
          metafields: a.metafields?.edges?.map((e: any) => ({
            ...e.node,
            references: e.node.references?.edges?.map((r: any) => r.node) || []
          })) || []
        };
      });

      return { articles, pageInfo: data.articles.pageInfo };
    } catch (error) {
      console.error("Error fetching articles:", error);
      throw new Error(`Failed to fetch articles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getArticles };
