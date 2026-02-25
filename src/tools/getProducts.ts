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

/** Strip HTML styling tags from metafield values, keeping only text content */
function cleanMetafieldHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GetProductsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "VENDOR", "PRODUCT_TYPE", "CREATED_AT", "UPDATED_AT", "PUBLISHED_AT", "INVENTORY_TOTAL", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false),
  country: z.string().optional(),
  minimum_review_count: z.number().optional(),
  response_mode: z.enum(["listing", "full", "essential"]).default("listing")
});

type GetProductsInput = z.infer<typeof GetProductsInputSchema>;

let shopifyClient: GraphQLClient;

const getProducts = {
  name: "get-products",
  description: `Get products list (ACTIVE only). Pagination: use first=250 (max) and pass pageInfo.endCursor as 'after' for next page. Check pageInfo.hasNextPage — if true, call again with after=endCursor. Typically 2 calls (first=250 × 2) covers all ~304 products. Stop when hasNextPage=false. IMPORTANT: when using minimum_review_count, you MUST paginate through ALL pages (until hasNextPage=false) before presenting results — the review filter is applied client-side after Shopify returns data, so stopping early will miss qualifying products from later pages. Response modes (response_mode): 'listing' (default) excludes heavy metafields (ingredients, details, faq, how-to-use, description_tag) — use for browsing, counting, filtering. 'full' includes all fields and metafields. 'essential' returns product spec fields + HTML-cleaned detail metafields — strips only status, dates, cursor, isGiftCard, totalVariants, hasOutOfStockVariants — best for product detail crawling. Filtering: minimum_review_count=N returns only products with ≥N Loox reviews (client-side filter, requires full pagination). query supports Shopify search syntax (e.g. 'title:*serum*', 'tag:sale', 'vendor:Nike'). country (ISO 3166-1 alpha-2) adds market-specific pricing. Metafields returned as flat object (namespace.key: value). loox.reviews always excluded — use get-product-reviews instead.`,
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

        // Filter metafields based on response_mode
        const metafields = Object.fromEntries(
          (node.metafields?.edges || [])
            .filter((e: any) => {
              // Always exclude loox.reviews (use get-product-reviews instead)
              if (e.node.namespace === 'loox' && e.node.key === 'reviews') return false;
              // Always keep loox.num_reviews when minimum_review_count filter is active
              if (input.minimum_review_count != null && e.node.namespace === 'loox' && e.node.key === 'num_reviews') return true;
              const flatKey = `${e.node.namespace}.${e.node.key}`;
              if (input.response_mode === 'listing') {
                // Exclude heavy detail metafields
                return !DETAIL_METAFIELD_KEYS.has(flatKey);
              }
              if (input.response_mode === 'essential') {
                // Only include detail metafields
                return DETAIL_METAFIELD_KEYS.has(flatKey);
              }
              // 'full' — include everything
              return true;
            })
            .map((e: any) => {
              const m = e.node;
              const val = m.jsonValue ?? m.value;
              return [`${m.namespace}.${m.key}`, input.response_mode === 'essential' ? cleanMetafieldHtml(val) : val];
            })
        );

        // Essential mode: product spec fields + HTML-cleaned detail metafields
        // Excluded: status (always ACTIVE), dates, cursor, isGiftCard, totalVariants, hasOutOfStockVariants
        if (input.response_mode === 'essential') {
          return {
            id: node.id,
            title: node.title,
            handle: node.handle,
            description: node.description,
            productType: node.productType,
            vendor: node.vendor,
            tags: node.tags,
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
            options: (node.options || []).map((o: any) => ({ name: o.name, values: o.values })),
            onlineStoreUrl: node.onlineStoreUrl,
            metafields
          };
        }

        // listing and full modes: return all product fields
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
          metafields
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
