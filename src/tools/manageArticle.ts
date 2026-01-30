import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const createSchema = z.object({
  action: z.literal("create"),
  title: z.string().min(1),
  body: z.string().min(1),
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
});

const updateSchema = z.object({
  action: z.literal("update"),
  id: z.string().min(1),
  title: z.string().optional(),
  body: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  handle: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAltText: z.string().optional()
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().min(1)
});

const schema = z.discriminatedUnion("action", [createSchema, updateSchema, deleteSchema]);

let shopifyClient: GraphQLClient;

const manageArticle = {
  name: "manage-article",
  description: "Create, update, or delete an article. For create: provide title, body, and blogId or blogTitle. For update: provide id and fields to change. For delete: provide id.",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async (input: z.infer<typeof schema>) => {
    try {
      if (input.action === "create") {
        const query = gql`
          mutation ArticleCreate($article: ArticleCreateInput!, $blog: ArticleBlogInput) {
            articleCreate(article: $article, blog: $blog) {
              article { id title handle isPublished publishedAt blog { id title } }
              userErrors { field message code }
            }
          }
        `;
        const articleInput: any = { title: input.title, body: input.body };
        if (input.authorName) articleInput.author = { name: input.authorName };
        if (input.summary) articleInput.summary = input.summary;
        if (input.tags) articleInput.tags = input.tags;
        if (input.isPublished !== undefined) articleInput.isPublished = input.isPublished;
        if (input.publishDate) articleInput.publishDate = input.publishDate;
        if (input.handle) articleInput.handle = input.handle;
        if (input.imageUrl) articleInput.image = { url: input.imageUrl, altText: input.imageAltText };

        const blogInput: any = {};
        if (input.blogId) blogInput.id = input.blogId;
        else if (input.blogTitle) blogInput.title = input.blogTitle;

        const data = (await shopifyClient.request(query, {
          article: articleInput,
          blog: Object.keys(blogInput).length > 0 ? blogInput : undefined
        })) as any;
        if (data.articleCreate.userErrors?.length > 0) {
          return { success: false, errors: data.articleCreate.userErrors };
        }
        return { success: true, article: data.articleCreate.article };
      }

      if (input.action === "update") {
        const query = gql`
          mutation ArticleUpdate($id: ID!, $article: ArticleUpdateInput!) {
            articleUpdate(id: $id, article: $article) {
              article { id title isPublished updatedAt }
              userErrors { field message }
            }
          }
        `;
        const articleInput: any = {};
        if (input.title) articleInput.title = input.title;
        if (input.body) articleInput.body = input.body;
        if (input.summary) articleInput.summary = input.summary;
        if (input.tags) articleInput.tags = input.tags;
        if (input.isPublished !== undefined) articleInput.isPublished = input.isPublished;
        if (input.handle) articleInput.handle = input.handle;
        if (input.imageUrl) articleInput.image = { url: input.imageUrl, altText: input.imageAltText };

        const data = (await shopifyClient.request(query, { id: input.id, article: articleInput })) as any;
        if (data.articleUpdate.userErrors?.length > 0) {
          return { success: false, errors: data.articleUpdate.userErrors };
        }
        return { success: true, article: data.articleUpdate.article };
      }

      if (input.action === "delete") {
        const query = gql`
          mutation ArticleDelete($id: ID!) {
            articleDelete(id: $id) {
              deletedArticleId
              userErrors { field message }
            }
          }
        `;
        const data = (await shopifyClient.request(query, { id: input.id })) as any;
        if (data.articleDelete.userErrors?.length > 0) {
          return { success: false, errors: data.articleDelete.userErrors };
        }
        return { success: true, deletedArticleId: data.articleDelete.deletedArticleId };
      }
    } catch (error) {
      console.error("Error managing article:", error);
      throw new Error(`Failed to manage article: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { manageArticle };
