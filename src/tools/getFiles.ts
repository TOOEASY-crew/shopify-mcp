import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  first: z.number().default(10),
  after: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(["ID", "FILENAME", "ORIGINAL_UPLOAD_SIZE", "CREATED_AT", "UPDATED_AT", "RELEVANCE"]).default("ID"),
  reverse: z.boolean().default(false)
});

let shopifyClient: GraphQLClient;

const getFiles = {
  name: "get-files",
  description: "Get files uploaded to the store (images, videos, documents). Use query for filtering (e.g. 'filename:logo*', 'media_type:IMAGE', 'status:READY').",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const query = gql`
        query Files($first: Int!, $after: String, $query: String, $sortKey: FileSortKeys, $reverse: Boolean) {
          files(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              cursor
              node {
                ... on GenericFile {
                  id
                  alt
                  fileStatus
                  mimeType
                  originalFileSize
                  url
                  createdAt
                  updatedAt
                  preview { image { url altText width height } }
                }
                ... on MediaImage {
                  id
                  alt
                  fileStatus
                  mimeType
                  image { url altText width height }
                  createdAt
                  updatedAt
                }
                ... on Video {
                  id
                  alt
                  fileStatus
                  sources { url mimeType width height }
                  createdAt
                  updatedAt
                  preview { image { url altText width height } }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first,
        after: input.after || undefined,
        query: input.query || undefined,
        sortKey: input.sortKey,
        reverse: input.reverse
      })) as any;

      const files = data.files.edges.map((e: any) => ({
        cursor: e.cursor,
        ...e.node
      }));

      return { files, pageInfo: data.files.pageInfo };
    } catch (error) {
      console.error("Error fetching files:", error);
      throw new Error(`Failed to fetch files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getFiles };
