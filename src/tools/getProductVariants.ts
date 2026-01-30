import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetProductVariantsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "TITLE", "SKU", "POSITION", "INVENTORY_QUANTITY", "RELEVANCE"]).default("ID")
});

type GetProductVariantsInput = z.infer<typeof GetProductVariantsInputSchema>;

let shopifyClient: GraphQLClient;

const getProductVariants = {
  name: "get-product-variants",
  description: "Get product variants with filtering and pagination. Use query for filtering (e.g. 'inventory_quantity:<=10', 'sku:ABC*').",
  schema: GetProductVariantsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductVariantsInput) => {
    try {
      const query = gql`
        query ProductVariants($first: Int!, $after: String, $query: String, $sortKey: ProductVariantSortKeys) {
          productVariants(first: $first, after: $after, query: $query, sortKey: $sortKey) {
            edges {
              cursor
              node {
                id
                title
                displayName
                sku
                barcode
                price
                compareAtPrice
                availableForSale
                inventoryQuantity

                product {
                  id
                  title
                  handle
                  status
                }

                selectedOptions {
                  name
                  value
                }

                inventoryItem {
                  id
                  tracked
                  unitCost { amount currencyCode }
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
        }
      `;

      const variables = {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey
      };

      const data = (await shopifyClient.request(query, variables)) as { productVariants: any };

      const variants = data.productVariants.edges.map((edge: any) => {
        const v = edge.node;
        return {
          cursor: edge.cursor,
          id: v.id,
          title: v.title,
          displayName: v.displayName,
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          availableForSale: v.availableForSale,
          inventoryQuantity: v.inventoryQuantity,
          product: v.product,
          selectedOptions: v.selectedOptions,
          inventoryItem: v.inventoryItem,
          metafields: v.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return { variants, pageInfo: data.productVariants.pageInfo };
    } catch (error) {
      console.error("Error fetching product variants:", error);
      throw new Error(`Failed to fetch product variants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProductVariants };
