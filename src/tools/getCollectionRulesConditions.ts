import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({});

let shopifyClient: GraphQLClient;

const getCollectionRulesConditions = {
  name: "get-collection-rules-conditions",
  description: "Get all available rules and conditions that can be used to create smart (automated) collections.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async () => {
    try {
      const query = gql`
        {
          collectionRulesConditions {
            ruleType
            defaultRelation
            allowedRelations
            ruleObject {
              ... on CollectionRuleMetafieldCondition {
                metafieldDefinition {
                  id
                  name
                  namespace
                  key
                  type { name }
                }
              }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query)) as any;
      return { conditions: data.collectionRulesConditions };
    } catch (error) {
      console.error("Error fetching collection rules conditions:", error);
      throw new Error(`Failed to fetch collection rules conditions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCollectionRulesConditions };
