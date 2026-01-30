import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetCollectionByIdInputSchema = z.object({
  collectionId: z.string().min(1),
  productSortKey: z.enum(["COLLECTION_DEFAULT", "BEST_SELLING", "CREATED", "PRICE_ASC", "PRICE_DESC", "TITLE", "MANUAL", "RELEVANCE"]).default("COLLECTION_DEFAULT"),
  productsFirst: z.number().default(50)
});

type GetCollectionByIdInput = z.infer<typeof GetCollectionByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getCollectionById = {
  name: "get-collection-by-id",
  description: "Get a specific collection by ID with its products. Use productSortKey to sort products (e.g. BEST_SELLING, PRICE_ASC, CREATED).",
  schema: GetCollectionByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetCollectionByIdInput) => {
    try {
      const query = gql`
        query Collection($id: ID!, $productsFirst: Int!, $productSortKey: ProductCollectionSortKeys) {
          collection(id: $id) {
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

            products(first: $productsFirst, sortKey: $productSortKey) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  vendor
                  productType
                  tags

                  priceRangeV2 {
                    minVariantPrice { amount currencyCode }
                    maxVariantPrice { amount currencyCode }
                  }

                  featuredMedia {
                    ... on MediaImage {
                      image { url altText }
                    }
                  }

                  variants(first: 5) {
                    edges {
                      node {
                        id
                        title
                        price
                        inventoryQuantity
                        availableForSale
                      }
                    }
                  }

                  metafields(first: 10) {
                    edges {
                      node { namespace key value type }
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
        id: input.collectionId,
        productsFirst: input.productsFirst,
        productSortKey: input.productSortKey
      })) as { collection: any };

      if (!data.collection) {
        throw new Error(`Collection with ID ${input.collectionId} not found`);
      }

      const c = data.collection;
      return {
        collection: {
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
          products: c.products?.edges?.map((e: any) => {
            const p = e.node;
            return {
              ...p,
              variants: p.variants?.edges?.map((ve: any) => ve.node) || [],
              metafields: p.metafields?.edges?.map((me: any) => me.node) || []
            };
          }) || [],
          productsCount: c.productsCount?.count || 0,
          productsPageInfo: c.products?.pageInfo,
          metafields: c.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching collection by ID:", error);
      throw new Error(`Failed to fetch collection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCollectionById };
