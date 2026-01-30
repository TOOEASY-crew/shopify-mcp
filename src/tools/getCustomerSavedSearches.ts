import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(20),
  after: z.string().optional(),
  sortKey: z.enum(["ID", "NAME", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false),
  query: z.string().optional()
});

let shopifyClient: GraphQLClient;

const getCustomerSavedSearches = {
  name: "get-customer-saved-searches",
  description: "Get customer saved searches (segments). Returns saved search queries that can be used to filter customers.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query CustomerSavedSearches($first: Int!, $after: String, $sortKey: CustomerSavedSearchSortKeys, $reverse: Boolean, $query: String) {
          customerSavedSearches(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
            edges {
              cursor
              node {
                id
                name
                query
                filters {
                  key
                  value
                }
                searchTerms
                resourceType
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        sortKey: input.sortKey,
        reverse: input.reverse,
        query: input.query || undefined
      })) as any;

      const savedSearches = data.customerSavedSearches.edges.map((e: any) => ({
        cursor: e.cursor,
        ...e.node
      }));

      return { savedSearches, pageInfo: data.customerSavedSearches.pageInfo };
    } catch (error) {
      console.error("Error fetching customer saved searches:", error);
      throw new Error(`Failed to fetch customer saved searches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCustomerSavedSearches };
