import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  handle: z.string().min(1),
  productsFirst: z.number().default(50)
});

let shopifyClient: GraphQLClient;

const getCollectionByIdentifier = {
  name: "get-collection-by-handle",
  description: "Get a collection by its handle (URL slug). Returns collection details with products.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query CollectionByIdentifier($identifier: CollectionIdentifierInput!, $productsFirst: Int!) {
          collectionByIdentifier(identifier: $identifier) {
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

            products(first: $productsFirst) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  vendor
                  productType
                  priceRangeV2 {
                    minVariantPrice { amount currencyCode }
                    maxVariantPrice { amount currencyCode }
                  }
                  featuredMedia {
                    ... on MediaImage {
                      image { url altText }
                    }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
            productsCount { count }

            metafields(first: 20) {
              edges {
                node { namespace key value type }
              }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        identifier: { handle: input.handle },
        productsFirst: input.productsFirst
      })) as any;

      if (!data.collectionByIdentifier) {
        return { collection: null, message: `Collection with handle '${input.handle}' not found` };
      }

      const c = data.collectionByIdentifier;
      return {
        collection: {
          ...c,
          products: c.products?.edges?.map((e: any) => e.node) || [],
          productsCount: c.productsCount?.count || 0,
          productsPageInfo: c.products?.pageInfo,
          metafields: c.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching collection by handle:", error);
      throw new Error(`Failed to fetch collection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCollectionByIdentifier };
