import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const createSchema = z.object({
  action: z.literal("create"),
  title: z.string().min(1),
  handle: z.string().optional(),
  commentPolicy: z.enum(["CLOSED", "MODERATE", "OPEN"]).optional()
});

const updateSchema = z.object({
  action: z.literal("update"),
  id: z.string().min(1),
  title: z.string().optional(),
  handle: z.string().optional(),
  commentPolicy: z.enum(["CLOSED", "MODERATE", "OPEN"]).optional()
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1)
});

const schema = z.discriminatedUnion("action", [createSchema, updateSchema, deleteSchema]);

let shopifyClient: GraphQLClient;

const manageBlog = {
  name: "manage-blog",
  description: "Create, update, or delete a blog. Set action to 'create', 'update', or 'delete'.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      if (input.action === "create") {
        const query = gql`
          mutation BlogCreate($blog: BlogCreateInput!) {
            blogCreate(blog: $blog) {
              blog { id title handle }
              userErrors { field message code }
            }
          }
        `;
        const data = (await shopifyClient.request(query, {
          blog: { title: input.title, handle: input.handle, commentPolicy: input.commentPolicy }
        })) as any;
        if (data.blogCreate.userErrors?.length > 0) {
          return { success: false, errors: data.blogCreate.userErrors };
        }
        return { success: true, blog: data.blogCreate.blog };
      }

      if (input.action === "update") {
        const query = gql`
          mutation BlogUpdate($id: ID!, $blog: BlogUpdateInput!) {
            blogUpdate(id: $id, blog: $blog) {
              blog { id title handle commentPolicy }
              userErrors { field message }
            }
          }
        `;
        const blogInput: any = {};
        if (input.title) blogInput.title = input.title;
        if (input.handle) blogInput.handle = input.handle;
        if (input.commentPolicy) blogInput.commentPolicy = input.commentPolicy;
        const data = (await shopifyClient.request(query, { id: input.id, blog: blogInput })) as any;
        if (data.blogUpdate.userErrors?.length > 0) {
          return { success: false, errors: data.blogUpdate.userErrors };
        }
        return { success: true, blog: data.blogUpdate.blog };
      }

      if (input.action === "delete") {
        const query = gql`
          mutation BlogDelete($id: ID!) {
            blogDelete(id: $id) {
              deletedBlogId
              userErrors { field message }
            }
          }
        `;
        const data = (await shopifyClient.request(query, { id: input.id })) as any;
        if (data.blogDelete.userErrors?.length > 0) {
          return { success: false, errors: data.blogDelete.userErrors };
        }
        return { success: true, deletedBlogId: data.blogDelete.deletedBlogId };
      }
    } catch (error) {
      console.error("Error managing blog:", error);
      throw new Error(`Failed to manage blog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { manageBlog };
