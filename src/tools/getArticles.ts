import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

function cleanBody(html: string): string {
  return html
    // srcset/data-srcset 중복 이미지 URL 제거 (동일 이미지 6~7개 사이즈)
    .replace(/\s*data-srcset="[^"]*"/g, '')
    .replace(/\s*srcset="[^"]*"/g, '')
    .replace(/\s*data-sizes="[^"]*"/g, '')
    // class, style, section-image-id 등 LLM에 무의미한 속성 제거
    .replace(/\s*class="[^"]*"/g, '')
    .replace(/\s*style="[^"]*"/g, '')
    .replace(/\s*section-image-id-\d+="[^"]*"/g, '')
    // 앵커 네비게이션 속성 제거
    .replace(/\s*anchor-section-id="[^"]*"/g, '')
    .replace(/\s*move-scroll="[^"]*"/g, '')
    .replace(/\s*move-scroll-mobile="[^"]*"/g, '')
    // 인라인 JavaScript 제거
    .replace(/var\s+\w+\s*=[\s\S]*?addEventListener\([^)]*\)/g, '')
    .replace(/window\.\w+Config\w*\s*=[\s\S]*?addEventListener\([^)]*\)/g, '')
    // img/a/video 이외의 HTML 태그 제거
    .replace(/<(?!\/?(?:img|a|video)(?:\s|>|\/|$))[^>]+>/g, '')
    // HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    // 공백 정리
    .replace(/\s+/g, ' ')
    .trim();
}

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
                image { url altText }
                tags
                metafields(first: 20) {
                  edges {
                    node {
                      namespace
                      key
                      value
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

      const baseQuery = 'published_status:published';
      const finalQuery = input.query ? `${baseQuery} ${input.query}` : baseQuery;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        query: finalQuery,
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
          body: cleanBody(a.body || ''),
          summary: a.summary,
          isPublished: a.isPublished,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          author: a.author,
          blog: a.blog,
          image: a.image,
          tags: a.tags,
          metafields: Object.fromEntries(
            (a.metafields?.edges || []).map((e: any) => {
              const m = e.node;
              const flatKey = `${m.namespace}.${m.key}`;
              if (m.reference) return [flatKey, m.reference];
              if (m.references?.edges?.length > 0) return [flatKey, m.references.edges.map((r: any) => r.node)];
              return [flatKey, m.value];
            })
          )
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
