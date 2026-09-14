# Graph Report - backend  (2026-08-18)

## Corpus Check
- 69 files · ~18,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 686 nodes · 1371 edges · 24 communities (23 shown, 1 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ea58bc1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PropertiesService
- Public
- ConversationsService
- AgentService
- LeasesService
- dependencies
- app.module.ts
- devDependencies
- CheckoutService
- NotificationsService
- FavoritesService
- OwnerUpgradeService
- PayoutsService
- compilerOptions
- PrismaService
- PaymentService
- StripeService
- payment.module.ts
- nest-cli.json
- bench-db.js
- test-pooler.js
- bench-net.js
- .stripeWebhook
- PrismaModule

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 35 edges
2. `PropertiesService` - 33 edges
3. `ConversationsService` - 26 edges
4. `PaymentService` - 26 edges
5. `AgentService` - 21 edges
6. `Public()` - 19 edges
7. `compilerOptions` - 19 edges
8. `UsersService` - 18 edges
9. `AuthService` - 17 edges
10. `LeasesService` - 17 edges

## Surprising Connections (you probably didn't know these)
- `AgentController` --references--> `Roles()`  [EXTRACTED]
  src/agent/agent.controller.ts → src/auth/decorators/roles.decorator.ts
- `OwnerLeasesController` --references--> `Roles()`  [EXTRACTED]
  src/leases/owner-leases.controller.ts → src/auth/decorators/roles.decorator.ts
- `PayoutsController` --references--> `Roles()`  [EXTRACTED]
  src/payouts/payouts.controller.ts → src/auth/decorators/roles.decorator.ts
- `OwnerPropertiesController` --references--> `Roles()`  [EXTRACTED]
  src/properties/owner-properties.controller.ts → src/auth/decorators/roles.decorator.ts

## Import Cycles
- None detected.

## Communities (24 total, 1 thin omitted)

### Community 0 - "PropertiesService"
Cohesion: 0.05
Nodes (39): IsNumber, Roles(), CreatePropertyDto, PresignUploadDto, PropertyQueryDto, ArrayMaxSize, IsArray, IsInt (+31 more)

### Community 1 - "Public"
Cohesion: 0.05
Nodes (32): IsEmail, AuthController, Body, Controller, Get, HttpCode, Patch, Post (+24 more)

### Community 2 - "ConversationsService"
Cohesion: 0.07
Nodes (25): ConversationsController, Body, Controller, Delete, Get, HttpCode, Param, Patch (+17 more)

### Community 3 - "AgentService"
Cohesion: 0.08
Nodes (27): ArrayMinSize, AgentController, Body, Controller, Get, Post, Req, ChatDto (+19 more)

### Community 4 - "LeasesService"
Cohesion: 0.08
Nodes (25): Matches, CreateLeaseDto, RenewLeaseDto, IsInt, IsOptional, IsString, Max, Min (+17 more)

### Community 5 - "dependencies"
Cohesion: 0.04
Nodes (49): bcrypt, class-transformer, class-validator, cookie-parser, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/jwt (+41 more)

### Community 6 - "app.module.ts"
Cohesion: 0.07
Nodes (23): AppModule, Module, AuthModule, Module, IS_PUBLIC_KEY, ROLES_KEY, JwtAuthGuard, Injectable (+15 more)

### Community 7 - "devDependencies"
Cohesion: 0.06
Nodes (31): @nestjs/cli, @nestjs/schematics, description, devDependencies, @nestjs/cli, @nestjs/schematics, prisma, ts-node (+23 more)

### Community 8 - "CheckoutService"
Cohesion: 0.11
Nodes (12): CheckoutController, Body, Controller, Get, Post, Query, Req, Res (+4 more)

### Community 9 - "NotificationsService"
Cohesion: 0.11
Nodes (13): NotificationsController, Controller, Get, HttpCode, Param, Post, Query, Req (+5 more)

### Community 10 - "FavoritesService"
Cohesion: 0.11
Nodes (14): FavoritesController, Controller, Delete, Get, HttpCode, Param, Post, Req (+6 more)

### Community 11 - "OwnerUpgradeService"
Cohesion: 0.11
Nodes (14): IsNotEmpty, BecomeOwnerRequestDto, IsString, OwnerUpgradeController, Body, Controller, Get, HttpCode (+6 more)

### Community 12 - "PayoutsService"
Cohesion: 0.14
Nodes (11): PayoutsController, Controller, Get, Post, Query, Req, PayoutsModule, Module (+3 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+11 more)

### Community 14 - "PrismaService"
Cohesion: 0.18
Nodes (5): PrismaKeepAliveService, Cron, Injectable, PrismaService, Injectable

### Community 15 - "PaymentService"
Cohesion: 0.26
Nodes (3): PaymentService, Cron, Injectable

### Community 16 - "StripeService"
Cohesion: 0.20
Nodes (5): StripeModule, Global, Module, StripeService, Injectable

### Community 17 - "payment.module.ts"
Cohesion: 0.32
Nodes (4): PaymentController, Controller, PaymentModule, Module

### Community 18 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 19 - "bench-db.js"
Cohesion: 0.50
Nodes (4): bench(), main(), prisma, { PrismaClient }

### Community 20 - "test-pooler.js"
Cohesion: 0.50
Nodes (4): net, regions, run(), testHost()

### Community 22 - ".stripeWebhook"
Cohesion: 0.50
Nodes (3): Headers, Post, Req

### Community 23 - "PrismaModule"
Cohesion: 0.67
Nodes (3): PrismaModule, Global, Module

## Knowledge Gaps
- **75 isolated node(s):** `{ PrismaClient }`, `prisma`, `net`, `hosts`, `$schema` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `PrismaService` to `PropertiesService`, `Public`, `ConversationsService`, `AgentService`, `LeasesService`, `CheckoutService`, `NotificationsService`, `FavoritesService`, `PayoutsService`, `StripeService`, `payment.module.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `PropertiesService` connect `PropertiesService` to `StripeService`, `Public`, `FavoritesService`, `AgentService`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `Public()` connect `Public` to `PropertiesService`, `app.module.ts`, `CheckoutService`, `OwnerUpgradeService`, `payment.module.ts`, `.stripeWebhook`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `{ PrismaClient }`, `prisma`, `net` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PropertiesService` be split into smaller, more focused modules?**
  _Cohesion score 0.052659716653301256 - nodes in this community are weakly interconnected._
- **Should `Public` be split into smaller, more focused modules?**
  _Cohesion score 0.05450372920252438 - nodes in this community are weakly interconnected._
- **Should `ConversationsService` be split into smaller, more focused modules?**
  _Cohesion score 0.0741745816372682 - nodes in this community are weakly interconnected._