import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({});

let shopifyClient: GraphQLClient;

const getInventoryProperties = {
  name: "get-inventory-properties",
  description: "Get general inventory properties for the shop, including all quantity names (available, committed, on_hand, reserved, etc.) and their relationships.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async () => {
    try {
      const query = gql`
        {
          inventoryProperties {
            quantityNames {
              name
              displayName
              isInUse
              belongsTo
              comprises
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query)) as any;
      return { inventoryProperties: data.inventoryProperties };
    } catch (error) {
      console.error("Error fetching inventory properties:", error);
      throw new Error(`Failed to fetch inventory properties: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getInventoryProperties };
