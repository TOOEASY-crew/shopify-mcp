import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetProductsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "VENDOR", "PRODUCT_TYPE", "CREATED_AT", "UPDATED_AT", "PUBLISHED_AT", "INVENTORY_TOTAL", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false)
});

type GetProductsInput = z.infer<typeof GetProductsInputSchema>;

let shopifyClient: GraphQLClient;

const getProducts = {
  name: "get-products",
  description: "Get all products with filtering, sorting, and pagination. Use query parameter for filtering (e.g. 'title:*summer*', 'tag:sale', 'status:ACTIVE', 'variants.price:>=50000', 'vendor:Nike', 'product_type:Shoes', 'inventory_total:>0').",
  schema: GetProductsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductsInput) => {
    try {
      const query = gql`
        query Products(
          $first: Int!
          $after: String
          $query: String
          $sortKey: ProductSortKeys
          $reverse: Boolean
        ) {
          products(
            first: $first
            after: $after
            query: $query
            sortKey: $sortKey
            reverse: $reverse
          ) {
            edges {
              cursor
              node {
                id
                title
                handle
                description
                descriptionHtml
                productType
                vendor
                status
                tags
                createdAt
                updatedAt
                publishedAt

                priceRangeV2 {
                  minVariantPrice { amount currencyCode }
                  maxVariantPrice { amount currencyCode }
                }
                compareAtPriceRange {
                  minVariantCompareAtPrice { amount currencyCode }
                  maxVariantCompareAtPrice { amount currencyCode }
                }

                category {
                  id
                  name
                  fullName
                  isLeaf
                }

                featuredMedia {
                  ... on MediaImage {
                    id
                    image { url altText width height }
                  }
                }
                media(first: 10) {
                  edges {
                    node {
                      ... on MediaImage {
                        id
                        image { url altText width height }
                      }
                      ... on Video {
                        id
                        sources { url mimeType }
                      }
                    }
                  }
                }

                options(first: 10) {
                  id
                  name
                  position
                  values
                }

                seo {
                  title
                  description
                }
                onlineStoreUrl
                onlineStorePreviewUrl

                collections(first: 10) {
                  edges {
                    node {
                      id
                      title
                      handle
                    }
                  }
                }

                requiresSellingPlan
                hasVariantsThatRequiresComponents
                hasOnlyDefaultVariant
                hasOutOfStockVariants
                isGiftCard
                totalVariants { count }
                tracksInventory

                metafields(first: 50) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      type
                      description
                      createdAt
                      updatedAt
                    }
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
        sortKey: input.sortKey,
        reverse: input.reverse
      };

      const data = (await shopifyClient.request(query, variables)) as { products: any };

      const products = data.products.edges.map((edge: any) => {
        const node = edge.node;
        return {
          cursor: edge.cursor,
          id: node.id,
          title: node.title,
          handle: node.handle,
          description: node.description,
          descriptionHtml: node.descriptionHtml,
          productType: node.productType,
          vendor: node.vendor,
          status: node.status,
          tags: node.tags,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          publishedAt: node.publishedAt,
          priceRange: {
            minPrice: node.priceRangeV2?.minVariantPrice,
            maxPrice: node.priceRangeV2?.maxVariantPrice
          },
          compareAtPriceRange: {
            minPrice: node.compareAtPriceRange?.minVariantCompareAtPrice,
            maxPrice: node.compareAtPriceRange?.maxVariantCompareAtPrice
          },
          category: node.category?.productTaxonomyNode,
          featuredImage: node.featuredMedia?.image,
          media: node.media?.edges?.map((e: any) => e.node) || [],
          options: node.options || [],
          seo: node.seo,
          onlineStoreUrl: node.onlineStoreUrl,
          onlineStorePreviewUrl: node.onlineStorePreviewUrl,
          collections: node.collections?.edges?.map((e: any) => e.node) || [],
          requiresSellingPlan: node.requiresSellingPlan,
          hasVariantsThatRequiresComponents: node.hasVariantsThatRequiresComponents,
          hasOnlyDefaultVariant: node.hasOnlyDefaultVariant,
          hasOutOfStockVariants: node.hasOutOfStockVariants,
          isGiftCard: node.isGiftCard,
          totalVariants: node.totalVariants?.count,
          tracksInventory: node.tracksInventory,
          metafields: node.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return {
        products,
        pageInfo: data.products.pageInfo
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProducts };
