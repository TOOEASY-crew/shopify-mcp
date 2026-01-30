import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

const schema = z.object({});

let shopifyClient: GraphQLClient;

const getShop = {
  name: "get-shop",
  description: "Get shop information including domains, currencies, timezone, policies, and features",
  schema,

  initialize(client: GraphQLClient) { shopifyClient = client; },

  execute: async () => {
    try {
      const query = gql`
        query Shop {
          shop {
            id
            name
            email
            contactEmail
            description
            primaryDomain { host url }
            myshopifyDomain
            currencyCode
            enabledPresentmentCurrencies
            currencyFormats { moneyFormat moneyWithCurrencyFormat }
            ianaTimezone
            timezoneAbbreviation
            shopAddress {
              address1
              city
              country
              countryCodeV2
              province
              zip
              formatted
            }
            shipsToCountries
            taxesIncluded
            taxShipping
            features {
              giftCards
              storefront
            }
            plan {
              publicDisplayName
              shopifyPlus
              partnerDevelopment
            }
            resourceLimits {
              maxProductVariants
              maxProductOptions
              redirectLimitReached
            }
            shopPolicies {
              type
              title
              body
              url
            }
            metafields(first: 20) {
              edges {
                node { namespace key value type }
              }
            }
            createdAt
          }
        }
      `;

      const data = (await shopifyClient.request(query)) as { shop: any };
      const s = data.shop;
      return {
        shop: {
          ...s,
          metafields: s.metafields?.edges?.map((e: any) => e.node) || []
        }
      };
    } catch (error) {
      console.error("Error fetching shop:", error);
      throw new Error(`Failed to fetch shop: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export { getShop };
