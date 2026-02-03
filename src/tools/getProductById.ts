import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetProductByIdInputSchema = z.object({
  productId: z.string().min(1)
});

type GetProductByIdInput = z.infer<typeof GetProductByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getProductById = {
  name: "get-product-by-id",
  description: "Get a specific product by ID with full details including variants, media, metafields, inventory, and collections",
  schema: GetProductByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductByIdInput) => {
    try {
      const query = gql`
        query Product($id: ID!) {
          product(id: $id) {
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
            sellingPlanGroupsCount { count }
            sellingPlanGroups(first: 5) {
              edges {
                node {
                  id
                  name
                  summary
                }
              }
            }

            hasVariantsThatRequiresComponents
            hasOnlyDefaultVariant
            hasOutOfStockVariants
            isGiftCard
            totalVariants
            tracksInventory

            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  displayName
                  sku
                  barcode
                  price
                  compareAtPrice
                  position
                  availableForSale
                  inventoryQuantity
                  inventoryPolicy
                  taxable

                  selectedOptions {
                    name
                    value
                  }

                  media(first: 5) {
                    edges {
                      node {
                        ... on MediaImage {
                          image { url altText }
                        }
                      }
                    }
                  }

                  inventoryItem {
                    id
                    sku
                    tracked
                    unitCost { amount currencyCode }
                    countryCodeOfOrigin
                    harmonizedSystemCode
                    inventoryLevels(first: 10) {
                      edges {
                        node {
                          id
                          location { id name }
                          quantities(names: ["available", "committed", "on_hand", "reserved"]) {
                            name
                            quantity
                          }
                        }
                      }
                    }
                  }

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

                  createdAt
                  updatedAt
                }
              }
            }

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
      `;

      const data = (await shopifyClient.request(query, { id: input.productId })) as { product: any };

      if (!data.product) {
        throw new Error(`Product with ID ${input.productId} not found`);
      }

      const p = data.product;
      return {
        product: {
          id: p.id,
          title: p.title,
          handle: p.handle,
          description: p.description,
          descriptionHtml: p.descriptionHtml,
          productType: p.productType,
          vendor: p.vendor,
          status: p.status,
          tags: p.tags,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          publishedAt: p.publishedAt,
          priceRange: {
            minPrice: p.priceRangeV2?.minVariantPrice,
            maxPrice: p.priceRangeV2?.maxVariantPrice
          },
          compareAtPriceRange: {
            minPrice: p.compareAtPriceRange?.minVariantCompareAtPrice,
            maxPrice: p.compareAtPriceRange?.maxVariantCompareAtPrice
          },
          category: p.category,
          featuredImage: p.featuredMedia?.image,
          media: p.media?.edges?.map((e: any) => e.node) || [],
          options: p.options || [],
          seo: p.seo,
          onlineStoreUrl: p.onlineStoreUrl,
          onlineStorePreviewUrl: p.onlineStorePreviewUrl,
          collections: p.collections?.edges?.map((e: any) => e.node) || [],
          requiresSellingPlan: p.requiresSellingPlan,
          sellingPlanGroupsCount: p.sellingPlanGroupsCount?.count,
          sellingPlanGroups: p.sellingPlanGroups?.edges?.map((e: any) => e.node) || [],
          hasVariantsThatRequiresComponents: p.hasVariantsThatRequiresComponents,
          hasOnlyDefaultVariant: p.hasOnlyDefaultVariant,
          hasOutOfStockVariants: p.hasOutOfStockVariants,
          isGiftCard: p.isGiftCard,
          totalVariants: p.totalVariants,
          tracksInventory: p.tracksInventory,
          variants: p.variants?.edges?.map((e: any) => {
            const v = e.node;
            return {
              id: v.id,
              title: v.title,
              displayName: v.displayName,
              sku: v.sku,
              barcode: v.barcode,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              position: v.position,
              availableForSale: v.availableForSale,
              inventoryQuantity: v.inventoryQuantity,
              inventoryPolicy: v.inventoryPolicy,
              taxable: v.taxable,
              selectedOptions: v.selectedOptions,
              media: v.media?.edges?.map((me: any) => me.node) || [],
              inventoryItem: v.inventoryItem ? {
                id: v.inventoryItem.id,
                sku: v.inventoryItem.sku,
                tracked: v.inventoryItem.tracked,
                unitCost: v.inventoryItem.unitCost,
                countryCodeOfOrigin: v.inventoryItem.countryCodeOfOrigin,
                harmonizedSystemCode: v.inventoryItem.harmonizedSystemCode,
                inventoryLevels: v.inventoryItem.inventoryLevels?.edges?.map((le: any) => ({
                  id: le.node.id,
                  location: le.node.location,
                  quantities: le.node.quantities
                })) || []
              } : null,
              metafields: v.metafields?.edges?.map((mf: any) => mf.node) || [],
              createdAt: v.createdAt,
              updatedAt: v.updatedAt
            };
          }) || [],
          metafields: p.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProductById };
