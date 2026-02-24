import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetProductByIdInputSchema = z.object({
  productId: z.string().min(1),
  country: z.string().optional()
});

type GetProductByIdInput = z.infer<typeof GetProductByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getProductById = {
  name: "get-product-by-id",
  description: "Get a specific product by ID with full details including variants, media, metafields, inventory, collections, and contextual pricing. Metafields are returned as a flat object (namespace.key: value); loox.reviews is excluded — use get-product-reviews for reviews. Variants include inventory levels, weight, and per-variant metafields (also flat). Use country (ISO 3166-1 alpha-2, e.g. 'KR') for market-specific pricing.",
  schema: GetProductByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductByIdInput) => {
    try {
      const hasCountry = !!input.country;

      const query = gql`
        query Product(
          $id: ID!
          ${hasCountry ? '$pricingContext: ContextualPricingContext!' : ''}
        ) {
          product(id: $id) {
            id
            title
            handle
            description
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

            ${hasCountry ? `
            contextualPricing(context: $pricingContext) {
              priceRange {
                minVariantPrice { amount currencyCode }
                maxVariantPrice { amount currencyCode }
              }
              maxVariantPricing {
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
              }
              minVariantPricing {
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
              }
            }
            ` : ''}

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
            variantsCount { count }
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

                  unitPriceMeasurement {
                    measuredType
                    quantityUnit
                    quantityValue
                    referenceUnit
                    referenceValue
                  }

                  ${hasCountry ? `
                  contextualPricing(context: $pricingContext) {
                    price { amount currencyCode }
                    compareAtPrice { amount currencyCode }
                  }
                  ` : ''}

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
                    measurement {
                      weight { value unit }
                    }
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
                        jsonValue
                        type
                        definition {
                          name
                        }
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
                  jsonValue
                  type
                  createdAt
                  updatedAt
                  definition {
                    id
                    name
                    description
                    pinnedPosition
                  }
                  reference {
                    ... on MediaImage {
                      id
                      image { url altText width height }
                    }
                    ... on GenericFile {
                      id
                      url
                      mimeType
                      originalFileSize
                    }
                    ... on Video {
                      id
                      sources { url mimeType width height }
                    }
                    ... on Metaobject {
                      id
                      type
                      handle
                      displayName
                      fields { key value type }
                    }
                    ... on Product {
                      id
                      title
                      handle
                    }
                    ... on ProductVariant {
                      id
                      title
                      sku
                      price
                    }
                    ... on Collection {
                      id
                      title
                      handle
                    }
                    ... on Page {
                      id
                      title
                      handle
                      body
                    }
                  }
                  references(first: 10) {
                    edges {
                      node {
                        ... on MediaImage {
                          id
                          image { url altText width height }
                        }
                        ... on GenericFile {
                          id
                          url
                          mimeType
                        }
                        ... on Video {
                          id
                          sources { url mimeType }
                        }
                        ... on Metaobject {
                          id
                          type
                          handle
                          displayName
                          fields { key value type }
                        }
                        ... on Product {
                          id
                          title
                          handle
                        }
                        ... on ProductVariant {
                          id
                          title
                          sku
                        }
                        ... on Collection {
                          id
                          title
                          handle
                        }
                        ... on Page {
                          id
                          title
                          handle
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables: Record<string, any> = { id: input.productId };

      if (hasCountry) {
        variables.pricingContext = { country: input.country };
      }

      const data = (await shopifyClient.request(query, variables)) as { product: any };

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
          ...(p.contextualPricing ? {
            contextualPricing: {
              priceRange: p.contextualPricing.priceRange,
              maxVariantPricing: p.contextualPricing.maxVariantPricing,
              minVariantPricing: p.contextualPricing.minVariantPricing
            }
          } : {}),
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
          totalVariants: p.variantsCount?.count,
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
              unitPriceMeasurement: v.unitPriceMeasurement || null,
              ...(v.contextualPricing ? {
                contextualPricing: v.contextualPricing
              } : {}),
              media: v.media?.edges?.map((me: any) => me.node) || [],
              inventoryItem: v.inventoryItem ? {
                id: v.inventoryItem.id,
                sku: v.inventoryItem.sku,
                tracked: v.inventoryItem.tracked,
                unitCost: v.inventoryItem.unitCost,
                countryCodeOfOrigin: v.inventoryItem.countryCodeOfOrigin,
                harmonizedSystemCode: v.inventoryItem.harmonizedSystemCode,
                weight: v.inventoryItem.measurement?.weight || null,
                inventoryLevels: v.inventoryItem.inventoryLevels?.edges?.map((le: any) => ({
                  id: le.node.id,
                  location: le.node.location,
                  quantities: le.node.quantities
                })) || []
              } : null,
              metafields: Object.fromEntries(
                (v.metafields?.edges || []).map((mf: any) => {
                  const m = mf.node;
                  return [`${m.namespace}.${m.key}`, m.jsonValue ?? m.value];
                })
              ),
              createdAt: v.createdAt,
              updatedAt: v.updatedAt
            };
          }) || [],
          metafields: Object.fromEntries(
            (p.metafields?.edges || [])
              .filter((e: any) => !(e.node.namespace === 'loox' && e.node.key === 'reviews'))
              .map((e: any) => {
                const node = e.node;
                const flatKey = `${node.namespace}.${node.key}`;
                if (node.reference) {
                  return [flatKey, node.reference];
                }
                if (node.references?.edges?.length > 0) {
                  return [flatKey, node.references.edges.map((re: any) => re.node)];
                }
                return [flatKey, node.jsonValue ?? node.value];
              })
          )
        }
      };
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProductById };
