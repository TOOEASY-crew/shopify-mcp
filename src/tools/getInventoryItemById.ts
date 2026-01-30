import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  inventoryItemId: z.string().min(1)
});

let shopifyClient: GraphQLClient;

const getInventoryItemById = {
  name: "get-inventory-item-by-id",
  description: "Get a specific inventory item by ID with inventory levels across locations",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query InventoryItem($id: ID!) {
          inventoryItem(id: $id) {
            id
            sku
            tracked
            requiresShipping
            createdAt
            updatedAt
            unitCost { amount currencyCode }
            countryCodeOfOrigin
            harmonizedSystemCode
            measurement { weight { value unit } }
            variant {
              id
              title
              displayName
              sku
              price
              product { id title handle }
            }
            inventoryLevels(first: 50) {
              edges {
                node {
                  id
                  location { id name address { city country } }
                  quantities(names: ["available", "committed", "on_hand", "reserved", "incoming", "damaged", "quality_control", "safety_stock"]) {
                    name
                    quantity
                    updatedAt
                  }
                  canDeactivate
                }
              }
            }
            locationsCount { count }
          }
        }
      `;

      const data = (await shopifyClient.request(query, { id: input.inventoryItemId })) as { inventoryItem: any };
      if (!data.inventoryItem) throw new Error(`Inventory item ${input.inventoryItemId} not found`);

      const n = data.inventoryItem;
      return {
        inventoryItem: {
          ...n,
          inventoryLevels: n.inventoryLevels?.edges?.map((e: any) => e.node) || [],
          locationsCount: n.locationsCount?.count || 0
        }
      };
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      throw new Error(`Failed to fetch inventory item: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getInventoryItemById };
