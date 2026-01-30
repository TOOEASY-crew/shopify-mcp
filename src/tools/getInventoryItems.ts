import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetInventoryItemsInputSchema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional()
});

type GetInventoryItemsInput = z.infer<typeof GetInventoryItemsInputSchema>;

let shopifyClient: GraphQLClient;

const getInventoryItems = {
  name: "get-inventory-items",
  description: "Get inventory items with filtering and pagination. Use query for filtering (e.g. 'sku:ABC*', 'tracked:true').",
  schema: GetInventoryItemsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetInventoryItemsInput) => {
    try {
      const query = gql`
        query InventoryItems($first: Int!, $after: String, $query: String) {
          inventoryItems(first: $first, after: $after, query: $query) {
            edges {
              cursor
              node {
                id
                sku
                tracked
                requiresShipping
                createdAt
                updatedAt

                unitCost { amount currencyCode }
                countryCodeOfOrigin
                provinceCodeOfOrigin
                harmonizedSystemCode

                measurement {
                  weight { value unit }
                }

                variant {
                  id
                  title
                  displayName
                  sku
                  price
                  product {
                    id
                    title
                    handle
                  }
                }

                inventoryLevels(first: 20) {
                  edges {
                    node {
                      id
                      location {
                        id
                        name
                        address { city country }
                      }
                      quantities(names: ["available", "committed", "on_hand", "reserved", "incoming", "damaged", "quality_control", "safety_stock"]) {
                        name
                        quantity
                        updatedAt
                      }
                      canDeactivate
                      createdAt
                      updatedAt
                    }
                  }
                }

                locationsCount { count }
                duplicateSkuCount
                legacyResourceId
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const variables = {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined
      };

      const data = (await shopifyClient.request(query, variables)) as { inventoryItems: any };

      const items = data.inventoryItems.edges.map((edge: any) => {
        const n = edge.node;
        return {
          cursor: edge.cursor,
          id: n.id,
          sku: n.sku,
          tracked: n.tracked,
          requiresShipping: n.requiresShipping,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          unitCost: n.unitCost,
          countryCodeOfOrigin: n.countryCodeOfOrigin,
          provinceCodeOfOrigin: n.provinceCodeOfOrigin,
          harmonizedSystemCode: n.harmonizedSystemCode,
          measurement: n.measurement,
          variant: n.variant,
          inventoryLevels: n.inventoryLevels?.edges?.map((e: any) => e.node) || [],
          locationsCount: n.locationsCount?.count || 0,
          duplicateSkuCount: n.duplicateSkuCount,
          legacyResourceId: n.legacyResourceId
        };
      });

      return { inventoryItems: items, pageInfo: data.inventoryItems.pageInfo };
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      throw new Error(`Failed to fetch inventory items: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getInventoryItems };
