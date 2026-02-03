# Shopify MCP Server

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides read-only tools for querying products, customers, orders, and more.

**📦 Package Name: `@junis/shopify-mcp`**
**🚀 Command: `@junis/shopify-mcp`**

Fork of [GeLi2001/shopify-mcp](https://github.com/GeLi2001/shopify-mcp)

## Features

- **Product Queries**: Search and retrieve product information
- **Customer Queries**: Load customer data and order history
- **Order Queries**: Advanced order querying and filtering
- **GraphQL Integration**: Direct integration with Shopify's GraphQL Admin API
- **Comprehensive Error Handling**: Clear error messages for API and authentication issues

## Prerequisites

1. Node.js (version 16 or higher)
2. Shopify Custom App Access Token (see setup instructions below)

## Setup

### Shopify Access Token

To use this MCP server, you'll need to create a custom app in your Shopify store:

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** (you may need to enable developer preview first)
3. Click **Create an app**
4. Set a name for your app (e.g., "Shopify MCP Server")
5. Click **Configure Admin API scopes**
6. Select the following scopes:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
7. Click **Save**
8. Click **Install app**
9. Click **Install** to give the app access to your store data
10. After installation, you'll see your **Admin API access token**
11. Copy this token - you'll need it for configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": [
        "@junis/shopify-mcp",
        "--accessToken",
        "<YOUR_ACCESS_TOKEN>",
        "--domain",
        "<YOUR_SHOP>.myshopify.com"
      ]
    }
  }
}
```

Locations for the Claude Desktop config file:

- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

### Alternative: Run Locally with Environment Variables

If you prefer to use environment variables instead of command-line arguments:

1. Create a `.env` file with your Shopify credentials:

   ```
   SHOPIFY_ACCESS_TOKEN=your_access_token
   MYSHOPIFY_DOMAIN=your-store.myshopify.com
   ```

2. Run the server with npx:
   ```
   npx @junis/shopify-mcp
   ```

### Direct Installation (Optional)

If you want to install the package globally:

```
npm install -g @junis/shopify-mcp
```

Then run it:

```
shopify-mcp --accessToken=<YOUR_ACCESS_TOKEN> --domain=<YOUR_SHOP>.myshopify.com
```

## Available Tools

### Product Management

1. `get-products`

   - Get all products or search by title
   - Inputs:
     - `searchTitle` (optional string): Filter products by title
     - `limit` (number): Maximum number of products to return

2. `get-product-by-id`
   - Get a specific product by ID
   - Inputs:
     - `productId` (string): ID of the product to retrieve


### Customer Management
1. `get-customers`

   - Get customers or search by name/email
   - Inputs:
     - `searchQuery` (optional string): Filter customers by name or email
     - `limit` (optional number, default: 10): Maximum number of customers to return

2. `get-customer-orders`
   - Get orders for a specific customer
   - Inputs:
     - `customerId` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `limit` (optional number, default: 10): Maximum number of orders to return

### Order Management

1. `get-orders`

   - Get orders with optional filtering
   - Inputs:
     - `status` (optional string): Filter by order status
     - `limit` (optional number, default: 10): Maximum number of orders to return

2. `get-order-by-id`

   - Get a specific order by ID
   - Inputs:
     - `orderId` (string, required): Full Shopify order ID (e.g., "gid://shopify/Order/6090960994370")


## Debugging

If you encounter issues, check Claude Desktop's MCP logs:

```
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## License

MIT
