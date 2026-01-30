import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({});

let shopifyClient: GraphQLClient;

const getMetafieldDefinitionTypes = {
  name: "get-metafield-definition-types",
  description: "Get all available metafield types (e.g. single_line_text_field, number_integer, boolean, json, etc.) with their categories and supported validations.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async () => {
    try {
      const query = gql`
        {
          metafieldDefinitionTypes {
            name
            category
            supportedValidations {
              name
              type
            }
            supportsDefinitionMigrations
          }
        }
      `;

      const data = (await shopifyClient.request(query)) as any;
      return { types: data.metafieldDefinitionTypes };
    } catch (error) {
      console.error("Error fetching metafield definition types:", error);
      throw new Error(`Failed to fetch metafield definition types: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getMetafieldDefinitionTypes };
