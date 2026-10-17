import { gql } from "@shopify/hydrogen";

export const HOME_QUERY = gql(`
  query HomePage($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop { name }
    localization { country { isoCode currency { isoCode } } }
    collections(first: 12) {
      nodes {
        id
        title
        handle
        description
        image { url altText width height }
      }
    }
    products(first: 12) {
      nodes {
        id
        title
        handle
        vendor
        productType
        featuredImage { url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
    blog(handle: "news") {
      id
      title
      handle
      articles(first: 3, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          excerpt
          publishedAt
          image { url altText width height }
        }
      }
    }
  }
`);

export const COLLECTIONS_QUERY = gql(`
  query CollectionsPage($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    localization { country { isoCode currency { isoCode } } }
    collections(first: 48) {
      nodes {
        id
        title
        handle
        description
        image { url altText width height }
        products(first: 1) {
          nodes {
            featuredImage { url altText width height }
          }
        }
      }
    }
  }
`);

export const COLLECTION_PAGE_QUERY = gql(`
  query CollectionPage(
    $handle: String!
    $after: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    localization { country { isoCode currency { isoCode } } }
    collection(handle: $handle) {
      id
      title
      handle
      description
      products(first: 24, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        nodes {
          id
          title
          handle
          vendor
          productType
          featuredImage { url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
        filters { id label type presentation values { id label count input } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`);

export const SEARCH_QUERY = gql(`
  query SearchProducts(
    $query: String!
    $after: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    localization { country { isoCode currency { isoCode } } }
    search(query: $query, first: 24, after: $after, types: [PRODUCT]) {
      nodes {
        __typename
        ... on Product {
          id
          title
          handle
          vendor
          productType
          featuredImage { url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`);

export const VARIANT_FIELDS_FRAGMENT = gql(`
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    selectedOptions { name value }
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    image { url altText width height }
    product { title handle }
    sku
  }
`);

export const PRODUCT_QUERY = gql(
  `
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    localization { country { isoCode currency { isoCode } } }
    product(handle: $handle) {
      id
      handle
      title
      vendor
      productType
      description
      descriptionHtml
      requiresSellingPlan
      seo { title description }
      featuredImage { url altText width height }
      options {
        name
        optionValues {
          name
          firstSelectableVariant { ...VariantFields }
          swatch {
            color
            image {
              ... on MediaImage {
                image { url altText }
              }
            }
          }
        }
      }
      encodedVariantExistence
      encodedVariantAvailability
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) { ...VariantFields }
      adjacentVariants(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) { ...VariantFields }
      media(first: 8) {
        nodes {
          __typename
          id
          mediaContentType
          alt
          ... on MediaImage {
            image { url altText width height }
          }
          previewImage { url altText width height }
        }
      }
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
    }
  }
`,
  [VARIANT_FIELDS_FRAGMENT],
);

export const BLOG_QUERY = gql(`
  query BlogPage($handle: String!, $after: String, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    blog(handle: $handle) {
      id
      title
      handle
      articles(first: 24, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          excerpt
          publishedAt
          image { url altText width height }
          authorV2 { name }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`);

export const ARTICLE_QUERY = gql(`
  query BlogArticle($blogHandle: String!, $articleHandle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      id
      title
      handle
      articleByHandle(handle: $articleHandle) {
        id
        title
        handle
        excerpt
        contentHtml
        publishedAt
        image { url altText width height }
        authorV2 { name }
        seo { title description }
      }
    }
  }
`);

export const MANAGEMENT_QUERY = gql(`
  query StoreManagementSummary($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop { name }
    products(first: 100) { nodes { id title handle } }
    collections(first: 100) { nodes { id title handle } }
    blog(handle: "news") {
      id
      title
      handle
      articles(first: 100, sortKey: PUBLISHED_AT, reverse: true) { nodes { id title handle } }
    }
  }
`);
