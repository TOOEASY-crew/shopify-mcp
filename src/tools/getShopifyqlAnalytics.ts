import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1).describe("ShopifyQL query string (e.g. FROM sales SHOW SUM(gross_sales) SINCE -30d)")
});

let shopifyClient: GraphQLClient;

const getShopifyqlAnalytics = {
  name: "get-shopifyql-analytics",
  description: "Execute a ShopifyQL query to analyze store data (sales, orders, customers, products). Returns tabular data with columns and rows. Supports FROM sales/orders/customers/products with SHOW, SINCE, UNTIL, BY, GROUP BY, ORDER BY, LIMIT clauses.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query ShopifyqlAnalytics($query: String!) {
          shopifyqlQuery(query: $query) {
            parseErrors
            tableData {
              columns {
                name
                dataType
                displayName
              }
              rows
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, { query: input.query })) as any;
      const result = data.shopifyqlQuery;

      if (result.parseErrors && result.parseErrors.length > 0) {
        return { success: false, parseErrors: result.parseErrors, tableData: null };
      }

      return {
        success: true,
        parseErrors: [],
        tableData: result.tableData
      };
    } catch (error) {
      console.error("Error executing ShopifyQL query:", error);
      throw new Error(`Failed to execute ShopifyQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getShopifyqlAnalytics };
