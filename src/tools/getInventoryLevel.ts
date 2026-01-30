import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  inventoryLevelId: z.string().min(1)
});

let shopifyClient: GraphQLClient;

const getInventoryLevel = {
  name: "get-inventory-level",
  description: "Get a single inventory level by ID. Returns quantities, location, and inventory item details.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query InventoryLevel($id: ID!) {
          inventoryLevel(id: $id) {
            id
            createdAt
            updatedAt
            canDeactivate
            deactivationAlert

            item {
              id
              sku
              tracked
              unitCost { amount currencyCode }
              variant {
                id
                title
                displayName
                product { id title }
              }
            }

            location {
              id
              name
              address { address1 city province country zip }
            }

            quantities(names: ["available", "committed", "on_hand", "reserved", "incoming", "damaged", "quality_control", "safety_stock"]) {
              name
              quantity
              updatedAt
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, { id: input.inventoryLevelId })) as any;

      if (!data.inventoryLevel) {
        throw new Error(`Inventory level with ID ${input.inventoryLevelId} not found`);
      }

      return { inventoryLevel: data.inventoryLevel };
    } catch (error) {
      console.error("Error fetching inventory level:", error);
      throw new Error(`Failed to fetch inventory level: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getInventoryLevel };
