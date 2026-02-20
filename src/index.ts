#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import minimist from "minimist";
import { z } from "zod";

// Import tools
import { getProducts } from "./tools/getProducts.js";
import { getProductById } from "./tools/getProductById.js";
import { getProductVariants } from "./tools/getProductVariants.js";
import { getCustomers } from "./tools/getCustomers.js";
import { getCustomerById } from "./tools/getCustomerById.js";
import { getCustomerOrders } from "./tools/getCustomerOrders.js";

import { getOrders } from "./tools/getOrders.js";
import { getOrderById } from "./tools/getOrderById.js";

import { getDraftOrders } from "./tools/getDraftOrders.js";
import { getCollections } from "./tools/getCollections.js";
import { getCollectionById } from "./tools/getCollectionById.js";
import { getInventoryItems } from "./tools/getInventoryItems.js";
import { getInventoryItemById } from "./tools/getInventoryItemById.js";
import { getLocations } from "./tools/getLocations.js";
import { getShop } from "./tools/getShop.js";

import { getBlogs } from "./tools/getBlogs.js";
import { getArticles } from "./tools/getArticles.js";
import { getPages } from "./tools/getPages.js";
import { getComments } from "./tools/getComments.js";
import { manageBlog } from "./tools/manageBlog.js";
import { manageArticle } from "./tools/manageArticle.js";
import { managePage } from "./tools/managePage.js";
import { manageComment } from "./tools/manageComment.js";
import { getMetaobjects } from "./tools/getMetaobjects.js";
import { getMetafieldDefinitions } from "./tools/getMetafieldDefinitions.js";
import { getPriceLists } from "./tools/getPriceLists.js";
import { getCounts } from "./tools/getCounts.js";
import { getProductAttributes } from "./tools/getProductAttributes.js";
import { getTaxonomy } from "./tools/getTaxonomy.js";
import { getFulfillmentOrders } from "./tools/getFulfillmentOrders.js";
import { getCustomerByIdentifier } from "./tools/getCustomerByIdentifier.js";
import { getCustomerSavedSearches } from "./tools/getCustomerSavedSearches.js";
import { getInventoryLevel } from "./tools/getInventoryLevel.js";
import { getInventoryTransfers } from "./tools/getInventoryTransfers.js";
import { getInventoryProperties } from "./tools/getInventoryProperties.js";
import { getCollectionByIdentifier } from "./tools/getCollectionByIdentifier.js";
import { getCollectionRulesConditions } from "./tools/getCollectionRulesConditions.js";
import { getPriceListById } from "./tools/getPriceListById.js";
import { getMetaobjectDefinitions } from "./tools/getMetaobjectDefinitions.js";
import { getFiles } from "./tools/getFiles.js";
import { getMetafieldDefinitionById } from "./tools/getMetafieldDefinitionById.js";
import { getMetafieldDefinitionTypes } from "./tools/getMetafieldDefinitionTypes.js";
import { getStandardMetafieldTemplates } from "./tools/getStandardMetafieldTemplates.js";
import { getMetaobjectById } from "./tools/getMetaobjectById.js";
import { getMetaobjectByHandle } from "./tools/getMetaobjectByHandle.js";
import { getShopifyqlAnalytics } from "./tools/getShopifyqlAnalytics.js";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Load environment variables from .env file (if it exists)
dotenv.config();

// Define environment variables - from command line or .env file
const SHOPIFY_ACCESS_TOKEN =
  argv.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = argv.domain || process.env.SHOPIFY_DOMAIN;

// Store in process.env for backwards compatibility
process.env.SHOPIFY_ACCESS_TOKEN = SHOPIFY_ACCESS_TOKEN;
process.env.SHOPIFY_DOMAIN = SHOPIFY_DOMAIN;

// Validate required environment variables
if (!SHOPIFY_ACCESS_TOKEN) {
  console.error("Error: SHOPIFY_ACCESS_TOKEN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --accessToken=your_token");
  process.exit(1);
}

if (!SHOPIFY_DOMAIN) {
  console.error("Error: SHOPIFY_DOMAIN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --domain=your-store.myshopify.com");
  process.exit(1);
}

// Create Shopify GraphQL client
const shopifyClient = new GraphQLClient(
  `https://${SHOPIFY_DOMAIN}/admin/api/2026-01/graphql.json`,
  {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json"
    }
  }
);

// Initialize all tools
const allTools = [
  getProducts, getProductById, getProductVariants,
  getCustomers, getCustomerById, getCustomerOrders,
  getOrders, getOrderById, getDraftOrders,
  getCollections, getCollectionById,
  getInventoryItems, getInventoryItemById, getLocations, getShop,
  getBlogs, getArticles, getPages, getComments,
  manageBlog, manageArticle, managePage, manageComment,
  getMetaobjects, getMetafieldDefinitions, getPriceLists,
  getCounts, getProductAttributes, getTaxonomy, getFulfillmentOrders,
  getCustomerByIdentifier, getCustomerSavedSearches,
  getInventoryLevel, getInventoryTransfers, getInventoryProperties,
  getCollectionByIdentifier, getCollectionRulesConditions,
  getPriceListById, getMetaobjectDefinitions, getFiles,
  getMetafieldDefinitionById, getMetafieldDefinitionTypes, getStandardMetafieldTemplates,
  getMetaobjectById, getMetaobjectByHandle,
  getShopifyqlAnalytics
];

allTools.forEach(tool => tool.initialize(shopifyClient));

// Set up MCP server
const server = new McpServer({
  name: "shopify",
  version: "1.0.0",
  description:
    "MCP Server for Shopify API, enabling interaction with store data through GraphQL API"
});

// === PRODUCT TOOLS ===

server.tool(
  "get-products",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "TITLE", "VENDOR", "PRODUCT_TYPE", "CREATED_AT", "UPDATED_AT", "PUBLISHED_AT", "INVENTORY_TOTAL", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false),
    country: z.string().optional().describe("ISO 3166-1 alpha-2 country code (e.g. 'KR', 'US', 'JP') for contextual pricing in that market's currency")
  },
  async (args) => {
    const result = await getProducts.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-product-by-id",
  {
    productId: z.string().min(1),
    country: z.string().optional().describe("ISO 3166-1 alpha-2 country code (e.g. 'KR', 'US', 'JP') for contextual pricing in that market's currency")
  },
  async (args) => {
    const result = await getProductById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-product-variants",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "TITLE", "SKU", "POSITION", "INVENTORY_QUANTITY", "RELEVANCE"]).default("ID"),
    country: z.string().optional().describe("ISO 3166-1 alpha-2 country code (e.g. 'KR', 'US', 'JP') for contextual pricing in that market's currency")
  },
  async (args) => {
    const result = await getProductVariants.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === CUSTOMER TOOLS ===

server.tool(
  "get-customers",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "NAME", "LOCATION", "ORDER_COUNT", "LAST_ORDER_DATE", "TOTAL_SPENT", "UPDATED_AT", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getCustomers.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-customer-by-id",
  { customerId: z.string().min(1) },
  async (args) => {
    const result = await getCustomerById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-customer-orders",
  {
    customerId: z.string().regex(/^\d+$/, "Customer ID must be numeric").describe("Shopify customer ID, numeric excluding gid prefix"),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getCustomerOrders.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === ORDER TOOLS ===

server.tool(
  "get-orders",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["PROCESSED_AT", "TOTAL_PRICE", "ID", "CREATED_AT", "UPDATED_AT", "CUSTOMER_NAME", "FINANCIAL_STATUS", "FULFILLMENT_STATUS", "ORDER_NUMBER", "RELEVANCE"]).default("PROCESSED_AT"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getOrders.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-order-by-id",
  { orderId: z.string().min(1) },
  async (args) => {
    const result = await getOrderById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-draft-orders",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "STATUS", "TOTAL_PRICE", "UPDATED_AT", "CREATED_AT", "CUSTOMER_NAME", "NUMBER", "RELEVANCE"]).default("ID")
  },
  async (args) => {
    const result = await getDraftOrders.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === COLLECTION TOOLS ===

server.tool(
  "get-collections",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "TITLE", "UPDATED_AT", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getCollections.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-collection-by-id",
  {
    collectionId: z.string().min(1),
    productSortKey: z.enum(["COLLECTION_DEFAULT", "BEST_SELLING", "CREATED", "PRICE_ASC", "PRICE_DESC", "TITLE", "MANUAL", "RELEVANCE"]).default("COLLECTION_DEFAULT"),
    productsFirst: z.number().default(50)
  },
  async (args) => {
    const result = await getCollectionById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === INVENTORY & LOCATION TOOLS ===

server.tool(
  "get-inventory-items",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional()
  },
  async (args) => {
    const result = await getInventoryItems.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-inventory-item-by-id",
  { inventoryItemId: z.string().min(1) },
  async (args) => {
    const result = await getInventoryItemById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-locations",
  {
    first: z.number().default(20),
    query: z.string().optional(),
    includeInactive: z.boolean().default(false)
  },
  async (args) => {
    const result = await getLocations.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-shop",
  {},
  async () => {
    const result = await getShop.execute();
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === CONTENT TOOLS ===

server.tool(
  "get-blogs",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "TITLE", "HANDLE"]).default("ID")
  },
  async (args) => {
    const result = await getBlogs.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-articles",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "TITLE", "BLOG_TITLE", "AUTHOR", "UPDATED_AT", "PUBLISHED_AT", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getArticles.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-pages",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "TITLE", "UPDATED_AT", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getPages.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-comments",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "CREATED_AT"]).default("ID")
  },
  async (args) => {
    const result = await getComments.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === MUTATION 도구 (비활성화) ===
// 명세서 원칙: 읽기 전용 도구만 노출, mutation 도구는 추후 필요시 활성화
/*
server.tool(
  "manage-blog",
  {
    action: z.enum(["create", "update", "delete"]),
    id: z.string().optional(),
    title: z.string().optional(),
    handle: z.string().optional(),
    commentPolicy: z.enum(["CLOSED", "MODERATE", "OPEN"]).optional()
  },
  async (args) => {
    const result = await manageBlog.execute(args as any);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "manage-article",
  {
    action: z.enum(["create", "update", "delete"]),
    id: z.string().optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    blogId: z.string().optional(),
    blogTitle: z.string().optional(),
    authorName: z.string().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublished: z.boolean().optional(),
    publishDate: z.string().optional(),
    handle: z.string().optional(),
    imageUrl: z.string().optional(),
    imageAltText: z.string().optional()
  },
  async (args) => {
    const result = await manageArticle.execute(args as any);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "manage-page",
  {
    action: z.enum(["create", "update", "delete"]),
    id: z.string().optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    handle: z.string().optional(),
    isPublished: z.boolean().optional()
  },
  async (args) => {
    const result = await managePage.execute(args as any);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "manage-comment",
  {
    action: z.enum(["approve", "spam", "not_spam", "delete"]),
    id: z.string().min(1)
  },
  async (args) => {
    const result = await manageComment.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);
*/

// === METAFIELD / METAOBJECT TOOLS ===

server.tool(
  "get-metaobjects",
  {
    type: z.string().min(1),
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.string().optional(),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getMetaobjects.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-metafield-definitions",
  {
    ownerType: z.enum(["PRODUCT", "PRODUCTVARIANT", "CUSTOMER", "ORDER", "DRAFTORDER", "COLLECTION", "SHOP", "LOCATION", "ARTICLE", "BLOG", "PAGE", "COMPANY", "COMPANYLOCATION", "MARKET", "DISCOUNT"]),
    namespace: z.string().optional(),
    first: z.number().default(50)
  },
  async (args) => {
    const result = await getMetafieldDefinitions.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === PRICE LIST TOOLS ===

server.tool(
  "get-price-lists",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    sortKey: z.enum(["ID", "NAME"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getPriceLists.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === COUNT TOOLS ===

server.tool(
  "get-counts",
  {
    resourceType: z.enum(["PRODUCTS", "PRODUCT_VARIANTS", "ORDERS", "DRAFT_ORDERS", "CUSTOMERS", "COLLECTIONS", "BLOGS", "PAGES"]),
    query: z.string().optional()
  },
  async (args) => {
    const result = await getCounts.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === PRODUCT ATTRIBUTE TOOLS ===

server.tool(
  "get-product-attributes",
  {
    attributeType: z.enum(["TAGS", "TYPES", "VENDORS"]),
    first: z.number().default(250)
  },
  async (args) => {
    const result = await getProductAttributes.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === TAXONOMY TOOLS ===

server.tool(
  "get-taxonomy",
  {
    search: z.string().optional(),
    childrenOf: z.string().optional(),
    siblingsOf: z.string().optional(),
    descendantsOf: z.string().optional(),
    first: z.number().default(50)
  },
  async (args) => {
    const result = await getTaxonomy.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === FULFILLMENT ORDER TOOLS ===

server.tool(
  "get-fulfillment-orders",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID"]).default("ID"),
    reverse: z.boolean().default(false),
    includeClosed: z.boolean().default(false)
  },
  async (args) => {
    const result = await getFulfillmentOrders.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === CUSTOMER IDENTIFIER & SAVED SEARCH TOOLS ===

server.tool(
  "get-customer-by-identifier",
  {
    email: z.string().optional(),
    phone: z.string().optional()
  },
  async (args) => {
    const result = await getCustomerByIdentifier.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-customer-saved-searches",
  {
    first: z.number().default(20),
    after: z.string().optional(),
    sortKey: z.enum(["ID", "NAME", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false),
    query: z.string().optional()
  },
  async (args) => {
    const result = await getCustomerSavedSearches.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === INVENTORY LEVEL, TRANSFER & PROPERTIES TOOLS ===

server.tool(
  "get-inventory-level",
  { inventoryLevelId: z.string().min(1) },
  async (args) => {
    const result = await getInventoryLevel.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-inventory-transfers",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "CREATED_AT", "UPDATED_AT"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getInventoryTransfers.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-inventory-properties",
  {},
  async () => {
    const result = await getInventoryProperties.execute();
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === COLLECTION IDENTIFIER & RULES TOOLS ===

server.tool(
  "get-collection-by-handle",
  {
    handle: z.string().min(1),
    productsFirst: z.number().default(50)
  },
  async (args) => {
    const result = await getCollectionByIdentifier.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-collection-rules-conditions",
  {},
  async () => {
    const result = await getCollectionRulesConditions.execute();
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === PRICE LIST BY ID ===

server.tool(
  "get-price-list-by-id",
  {
    priceListId: z.string().min(1),
    pricesFirst: z.number().default(50)
  },
  async (args) => {
    const result = await getPriceListById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === METAOBJECT DEFINITIONS ===

server.tool(
  "get-metaobject-definitions",
  {
    type: z.string().optional(),
    first: z.number().default(20),
    after: z.string().optional()
  },
  async (args) => {
    const result = await getMetaobjectDefinitions.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === METAFIELD DEFINITION DETAIL TOOLS ===

server.tool(
  "get-metafield-definition",
  {
    ownerType: z.enum(["PRODUCT", "PRODUCTVARIANT", "CUSTOMER", "ORDER", "DRAFTORDER", "COLLECTION", "SHOP", "LOCATION", "ARTICLE", "BLOG", "PAGE", "COMPANY", "COMPANYLOCATION", "MARKET", "DISCOUNT"]),
    key: z.string().min(1),
    namespace: z.string().optional()
  },
  async (args) => {
    const result = await getMetafieldDefinitionById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-metafield-definition-types",
  {},
  async () => {
    const result = await getMetafieldDefinitionTypes.execute();
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-standard-metafield-templates",
  {
    first: z.number().default(50),
    after: z.string().optional(),
    excludeActivated: z.boolean().default(false)
  },
  async (args) => {
    const result = await getStandardMetafieldTemplates.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === METAOBJECT SINGLE ITEM TOOLS ===

server.tool(
  "get-metaobject-by-id",
  { metaobjectId: z.string().min(1) },
  async (args) => {
    const result = await getMetaobjectById.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get-metaobject-by-handle",
  {
    type: z.string().min(1),
    handle: z.string().min(1)
  },
  async (args) => {
    const result = await getMetaobjectByHandle.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === FILE TOOLS ===

server.tool(
  "get-files",
  {
    first: z.number().default(10),
    after: z.string().optional(),
    query: z.string().optional(),
    sortKey: z.enum(["ID", "FILENAME", "ORIGINAL_UPLOAD_SIZE", "CREATED_AT", "UPDATED_AT", "RELEVANCE"]).default("ID"),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getFiles.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === SHOPIFYQL ANALYTICS ===

server.tool(
  "get-shopifyql-analytics",
  {
    query: z.string().min(1).describe("ShopifyQL query string")
  },
  async (args) => {
    const result = await getShopifyqlAnalytics.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// Start the server
const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => {})
  .catch((error: unknown) => {
    console.error("Failed to start Shopify MCP Server:", error);
  });
