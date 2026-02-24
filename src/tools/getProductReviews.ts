import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const GetProductReviewsInputSchema = z.object({
  productId: z.string().min(1).describe("Shopify product GID (e.g. gid://shopify/Product/123)")
});

type GetProductReviewsInput = z.infer<typeof GetProductReviewsInputSchema>;

let shopifyClient: GraphQLClient;

function parseLooxReviews(html: string): Array<{author: string, text: string}> {
  const reviews: Array<{author: string, text: string}> = [];
  const reviewRegex = /<div class="review">([\s\S]*?)(?=<div class="review">|$)/g;
  let match;
  while ((match = reviewRegex.exec(html)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/<div class="name">([\s\S]*?)<\/div>/);
    const textMatch = block.match(/<div class="review_text">([\s\S]*?)<\/div>/);
    if (nameMatch && textMatch) {
      reviews.push({
        author: nameMatch[1].trim(),
        text: textMatch[1].trim()
      });
    }
  }
  return reviews;
}

const getProductReviews = {
  name: "get-product-reviews",
  description: "Get all product reviews from loox.reviews metafield. Returns up to 100 reviews sorted by most recent first, each with reviewer name and review text. Loox stores a maximum of 100 reviews in the metafield regardless of total review count. Use loox.num_reviews and loox.avg_rating from get-products or get-product-by-id for total review count and average rating.",
  schema: GetProductReviewsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetProductReviewsInput) => {
    try {
      const query = gql`
        query ProductReviews($id: ID!) {
          product(id: $id) {
            id
            metafield(namespace: "loox", key: "reviews") {
              value
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, { id: input.productId })) as { product: any };

      if (!data.product) {
        throw new Error(`Product with ID ${input.productId} not found`);
      }

      const html = data.product.metafield?.value || '';
      const reviews = parseLooxReviews(html);

      return {
        totalCount: reviews.length,
        reviews
      };
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      throw new Error(`Failed to fetch product reviews: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getProductReviews };
