import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "spam", "not_spam", "delete"]),
  id: z.string().min(1)
});

let shopifyClient: GraphQLClient;

const manageComment = {
  name: "manage-comment",
  description: "Approve, mark as spam, unmark spam, or delete a comment. Actions: 'approve', 'spam', 'not_spam', 'delete'.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      const mutations: Record<string, string> = {
        approve: `mutation($id: ID!) { commentApprove(id: $id) { comment { id status isPublished } userErrors { field message } } }`,
        spam: `mutation($id: ID!) { commentSpam(id: $id) { comment { id status } userErrors { field message } } }`,
        not_spam: `mutation($id: ID!) { commentNotSpam(id: $id) { comment { id status } userErrors { field message } } }`,
        delete: `mutation($id: ID!) { commentDelete(id: $id) { deletedCommentId userErrors { field message } } }`
      };

      const data = (await shopifyClient.request(gql`${mutations[input.action]}`, { id: input.id })) as any;
      const result = Object.values(data)[0] as any;

      if (result.userErrors?.length > 0) {
        return { success: false, errors: result.userErrors };
      }
      return { success: true, ...result };
    } catch (error) {
      console.error("Error managing comment:", error);
      throw new Error(`Failed to manage comment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { manageComment };
