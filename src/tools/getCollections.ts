import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetCollectionsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "UPDATED_AT", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false)
});

type GetCollectionsInput = z.infer<typeof GetCollectionsInputSchema>;

let shopifyClient: GraphQLClient;

const getCollections = {
  name: "get-collections",
  description: "Get collections with filtering, sorting, and pagination. Use query for filtering (e.g. 'title:*Summer*', 'collection_type:smart', 'published_status:published').",
  schema: GetCollectionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetCollectionsInput) => {
    try {
      const query = gql`
        query Collections($first: Int!, $after: String, $query: String, $sortKey: CollectionSortKeys, $reverse: Boolean) {
          collections(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                id
                title
                handle
                description
                descriptionHtml
                updatedAt

                image {
                  url
                  altText
                  width
                  height
                }

                sortOrder

                ruleSet {
                  appliedDisjunctively
                  rules {
                    column
                    relation
                    condition
                  }
                }

                seo {
                  title
                  description
                }

                templateSuffix

                products(first: 20, sortKey: COLLECTION_DEFAULT) {
                  edges {
                    node {
                      id
                      title
                      handle
                      status
                      featuredMedia {
                        ... on MediaImage {
                          image { url altText }
                        }
                      }
                      priceRangeV2 {
                        minVariantPrice { amount currencyCode }
                      }
                    }
                  }
                }
                productsCount { count }

                publishedOnCurrentPublication

                metafields(first: 20) {
                  edges {
                    node {
                      namespace
                      key
                      value
                      type
                    }
                  }
                }

                legacyResourceId
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
        sortKey: input.sortKey,
        reverse: input.reverse
      };

      const data = (await shopifyClient.request(query, variables)) as { collections: any };

      const collections = data.collections.edges.map((edge: any) => {
        const c = edge.node;
        return {
          cursor: edge.cursor,
          id: c.id,
          title: c.title,
          handle: c.handle,
          description: c.description,
          descriptionHtml: c.descriptionHtml,
          updatedAt: c.updatedAt,
          image: c.image,
          sortOrder: c.sortOrder,
          ruleSet: c.ruleSet,
          seo: c.seo,
          templateSuffix: c.templateSuffix,
          products: c.products?.edges?.map((e: any) => e.node) || [],
          productsCount: c.productsCount?.count || 0,
          publishedOnCurrentPublication: c.publishedOnCurrentPublication,
          metafields: c.metafields?.edges?.map((e: any) => e.node) || [],
          legacyResourceId: c.legacyResourceId
        };
      });

      return { collections, pageInfo: data.collections.pageInfo };
    } catch (error) {
      console.error("Error fetching collections:", error);
      throw new Error(`Failed to fetch collections: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCollections };
