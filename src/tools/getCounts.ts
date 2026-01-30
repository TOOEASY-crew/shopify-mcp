import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  resourceType: z.enum(["PRODUCTS", "PRODUCT_VARIANTS", "ORDERS", "DRAFT_ORDERS", "CUSTOMERS", "COLLECTIONS", "BLOGS", "PAGES"]),
  query: z.string().optional()
});

let shopifyClient: GraphQLClient;

const queryMap: Record<string, { queryField: string; supportsQuery: boolean }> = {
  PRODUCTS: { queryField: "productsCount", supportsQuery: true },
  PRODUCT_VARIANTS: { queryField: "productVariantsCount", supportsQuery: true },
  ORDERS: { queryField: "ordersCount", supportsQuery: true },
  DRAFT_ORDERS: { queryField: "draftOrdersCount", supportsQuery: true },
  CUSTOMERS: { queryField: "customersCount", supportsQuery: true },
  COLLECTIONS: { queryField: "collectionsCount", supportsQuery: true },
  BLOGS: { queryField: "blogsCount", supportsQuery: true },
  PAGES: { queryField: "pagesCount", supportsQuery: false }
};

const getCounts = {
  name: "get-counts",
  description: "Get count of resources (products, productVariants, orders, draftOrders, customers, collections, blogs, pages). Use query for filtering (e.g. 'status:ACTIVE' for products, 'financial_status:paid' for orders).",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const config = queryMap[input.resourceType];

      const hasQuery = config.supportsQuery && input.query;
      const queryStr = hasQuery
        ? `query ResourceCount($query: String) { ${config.queryField}(query: $query) { count precision } }`
        : `{ ${config.queryField} { count precision } }`;

      const query = gql`${queryStr}`;
      const variables: Record<string, any> = hasQuery ? { query: input.query } : {};

      const data = (await shopifyClient.request(query, variables)) as any;
      const result = data[config.queryField];

      return {
        resourceType: input.resourceType,
        count: result.count,
        precision: result.precision
      };
    } catch (error) {
      console.error("Error fetching count:", error);
      throw new Error(`Failed to fetch count: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getCounts };
