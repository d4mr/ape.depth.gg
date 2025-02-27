/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as TokensChainIdTokenIdImport } from './routes/tokens_.$chainId.$tokenId'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const TokensChainIdTokenIdRoute = TokensChainIdTokenIdImport.update({
  id: '/tokens_/$chainId/$tokenId',
  path: '/tokens/$chainId/$tokenId',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/tokens_/$chainId/$tokenId': {
      id: '/tokens_/$chainId/$tokenId'
      path: '/tokens/$chainId/$tokenId'
      fullPath: '/tokens/$chainId/$tokenId'
      preLoaderRoute: typeof TokensChainIdTokenIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/tokens/$chainId/$tokenId': typeof TokensChainIdTokenIdRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/tokens/$chainId/$tokenId': typeof TokensChainIdTokenIdRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/tokens_/$chainId/$tokenId': typeof TokensChainIdTokenIdRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/tokens/$chainId/$tokenId'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/tokens/$chainId/$tokenId'
  id: '__root__' | '/' | '/tokens_/$chainId/$tokenId'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  TokensChainIdTokenIdRoute: typeof TokensChainIdTokenIdRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  TokensChainIdTokenIdRoute: TokensChainIdTokenIdRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/tokens_/$chainId/$tokenId"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/tokens_/$chainId/$tokenId": {
      "filePath": "tokens_.$chainId.$tokenId.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
