import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const DETAIL_METAFIELD_KEYS = new Set([
  "details.details",
  "ingredients.ingredients",
  "faq.faq",
  "how-to-use.how-to-use",
  "global.description_tag",
]);

const GetProductsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "VENDOR", "PRODUCT_TYPE", "CREATED_AT", "UPDATED_AT", "PUBLISHED_AT", "INVENTORY_TOTAL", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false),
  country: z.string().optional(),
  minimum_review_count: z.number().optional(),
  contain_product_detail: z.boolean().default(false)
});

type GetProductsInput = z.infer<typeof GetProductsInputSchema>;

let shopifyClient: GraphQLClient;

const getProducts = {
  name: "get-products",
  description: "Get products list (ACTIVE only). Returns lightweight data by default for efficient listing/filtering. Set contain_product_detail=true to include heavy metafields (ingredients, details, faq, how-to-use, description_tag) — use this only when you need to crawl or display full product content. Use minimum_review_count to return only products with at least N Loox reviews (e.g. minimum_review_count=50 keeps only products with ≥50 reviews). Use query for Shopify search syntax (e.g. 'title:*serum*', 'tag:sale', 'vendor:Nike'). Use country (ISO 3166-1 alpha-2, e.g. 'KR') for market-specific pricing. Metafields returned as flat object (namespace.key: value). loox.reviews excluded — use get-product-reviews instead.",
  schema: GetProductsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductsInput) => {
    try {
      const hasCountry = !!input.country;

      const query = gql`
        query Products(
          $first: Int!
          $after: String
          $query: String
          $sortKey: ProductSortKeys
          $reverse: Boolean
          ${hasCountry ? '$pricingContext: ContextualPricingContext!' : ''}
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

                options(first: 10) {
                  id
                  name
                  position
                  values
                }

                onlineStoreUrl

                hasOutOfStockVariants
                isGiftCard
                variantsCount { count }

                metafields(first: 20) {
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
                        name
                        description
                      }
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

      const baseFilter = "status:active";
      const finalQuery = input.query ? `${baseFilter} AND ${input.query}` : baseFilter;

      const variables: Record<string, any> = {
        first: input.first,
        after: input.after || undefined,
        query: finalQuery,
        sortKey: input.sortKey,
        reverse: input.reverse
      };

      if (hasCountry) {
        variables.pricingContext = { country: input.country };
      }

      const data = (await shopifyClient.request(query, variables)) as { products: any };

      const products = data.products.edges.map((edge: any) => {
        const node = edge.node;
        return {
          cursor: edge.cursor,
          id: node.id,
          title: node.title,
          handle: node.handle,
          description: node.description,
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
          ...(node.contextualPricing ? {
            contextualPricing: {
              priceRange: node.contextualPricing.priceRange,
              maxVariantPricing: node.contextualPricing.maxVariantPricing,
              minVariantPricing: node.contextualPricing.minVariantPricing
            }
          } : {}),
          category: node.category,
          featuredImage: node.featuredMedia?.image,
          options: node.options || [],
          onlineStoreUrl: node.onlineStoreUrl,
          hasOutOfStockVariants: node.hasOutOfStockVariants,
          isGiftCard: node.isGiftCard,
          totalVariants: node.variantsCount?.count,
          metafields: Object.fromEntries(
            (node.metafields?.edges || [])
              .filter((e: any) => {
                if (e.node.namespace === 'loox' && e.node.key === 'reviews') return false;
                if (!input.contain_product_detail) {
                  const flatKey = `${e.node.namespace}.${e.node.key}`;
                  if (DETAIL_METAFIELD_KEYS.has(flatKey)) return false;
                }
                return true;
              })
              .map((e: any) => {
                const m = e.node;
                return [`${m.namespace}.${m.key}`, m.jsonValue ?? m.value];
              })
          )
        };
      });

      const filtered = input.minimum_review_count != null
        ? products.filter((p: any) => {
            const numReviews = Number(p.metafields?.["loox.num_reviews"] ?? 0);
            return numReviews >= input.minimum_review_count!;
          })
        : products;

      return {
        products: filtered,
        pageInfo: data.products.pageInfo
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProducts };
