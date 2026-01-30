import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const createSchema = z.object({
  action: z.literal("create"),
  title: z.string().min(1),
  body: z.string().min(1),
  handle: z.string().optional(),
  isPublished: z.boolean().optional()
});

const updateSchema = z.object({
  action: z.literal("update"),
  id: z.string().min(1),
  title: z.string().optional(),
  body: z.string().optional(),
  handle: z.string().optional(),
  isPublished: z.boolean().optional()
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1)
});

const schema = z.discriminatedUnion("action", [createSchema, updateSchema, deleteSchema]);

let shopifyClient: GraphQLClient;

const managePage = {
  name: "manage-page",
  description: "Create, update, or delete a page. Set action to 'create', 'update', or 'delete'.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      if (input.action === "create") {
        const query = gql`
          mutation PageCreate($page: PageCreateInput!) {
            pageCreate(page: $page) {
              page { id title handle isPublished }
              userErrors { field message code }
            }
          }
        `;
        const data = (await shopifyClient.request(query, {
          page: { title: input.title, body: input.body, handle: input.handle, isPublished: input.isPublished }
        })) as any;
        if (data.pageCreate.userErrors?.length > 0) {
          return { success: false, errors: data.pageCreate.userErrors };
        }
        return { success: true, page: data.pageCreate.page };
      }

      if (input.action === "update") {
        const query = gql`
          mutation PageUpdate($id: ID!, $page: PageUpdateInput!) {
            pageUpdate(id: $id, page: $page) {
              page { id title handle updatedAt }
              userErrors { field message }
            }
          }
        `;
        const pageInput: any = {};
        if (input.title) pageInput.title = input.title;
        if (input.body) pageInput.body = input.body;
        if (input.handle) pageInput.handle = input.handle;
        if (input.isPublished !== undefined) pageInput.isPublished = input.isPublished;

        const data = (await shopifyClient.request(query, { id: input.id, page: pageInput })) as any;
        if (data.pageUpdate.userErrors?.length > 0) {
          return { success: false, errors: data.pageUpdate.userErrors };
        }
        return { success: true, page: data.pageUpdate.page };
      }

      if (input.action === "delete") {
        const query = gql`
          mutation PageDelete($id: ID!) {
            pageDelete(id: $id) {
              deletedPageId
              userErrors { field message }
            }
          }
        `;
        const data = (await shopifyClient.request(query, { id: input.id })) as any;
        if (data.pageDelete.userErrors?.length > 0) {
          return { success: false, errors: data.pageDelete.userErrors };
        }
        return { success: true, deletedPageId: data.pageDelete.deletedPageId };
      }
    } catch (error) {
      console.error("Error managing page:", error);
      throw new Error(`Failed to manage page: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { managePage };
