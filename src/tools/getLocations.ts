import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(20),
  query: z.string().optional(),
  includeInactive: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getLocations = {
  name: "get-locations",
  description: "Get store locations with optional filtering",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Locations($first: Int!, $query: String, $includeInactive: Boolean) {
          locations(first: $first, query: $query, includeInactive: $includeInactive) {
            edges {
              node {
                id
                name
                isActive
                isFulfillmentService
                fulfillsOnlineOrders
                shipsInventory
                address {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCode
                  zip
                  phone
                  formatted
                  latitude
                  longitude
                }
                addressVerified
                localPickupSettingsV2 {
                  instructions
                  pickupTime
                }
                hasActiveInventory
                hasUnfulfilledOrders
                activatable
                deactivatable
                deletable
                createdAt
                updatedAt
                metafields(first: 10) {
                  edges {
                    node { namespace key value }
                  }
                }
              }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        query: input.query || undefined,
        includeInactive: input.includeInactive
      })) as { locations: any };

      const locations = data.locations.edges.map((edge: any) => {
        const l = edge.node;
        return {
          ...l,
          metafields: l.metafields?.edges?.map((e: any) => e.node) || []
        };
      });

      return { locations };
    } catch (error) {
      console.error("Error fetching locations:", error);
      throw new Error(`Failed to fetch locations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getLocations };
