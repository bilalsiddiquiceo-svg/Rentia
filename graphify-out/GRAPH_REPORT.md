# Graph Report - rental saas  (2026-08-18)

## Corpus Check
- 247 files · ~151,656 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2318 nodes · 3994 edges · 173 communities (124 shown, 49 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 206 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ea58bc1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Design Skill
- gray
- search
- devDependencies
- useAuth
- slide_search_core.py
- Graphify knowledge graph pipeline
- property/[id]/page.tsx
- messages.ts
- spacing
- Rental SaaS Development Plan
- apiFetch
- TestTailwindConfigGenerator
- NotificationsService
- compilerOptions
- design_system.py
- app.module.ts
- html-token-validator.py
- AuthService
- AgentService
- PaymentService
- FavoritesService
- DashboardClient.tsx
- BM25
- search
- ConversationsController
- ConversationsService
- owner-upgrade.controller.ts
- Copywriting Formulas
- Public
- TailwindConfigGenerator
- DesignSystemGenerator
- dependencies
- devDependencies
- Roles
- shadcn/ui Component Reference
- Workflow
- AgentChat.tsx
- compilerOptions
- properties.ts
- AvailabilityCalendar.tsx
- generate-slide.py
- PrismaService
- color
- test_design_system_mode.py
- Skeleton.tsx
- CheckoutService
- PropertiesService
- realtime-context.tsx
- fetch-background.py
- button
- BM25
- LeasesController
- icon/generate.py
- MailService
- TestShadcnInstaller
- Design System Skill
- 3
- LeasesService
- _palette_is_dark
- 4
- extract-colors.cjs
- validate-asset.cjs
- Color Palette Management
- conversations.service.ts
- 5
- 8
- .test_add_components_no_components
- validate-tokens.cjs
- ShadcnInstaller
- .check_shadcn_config
- .generate_config_string
- Brand Skill
- scripts
- radius
- auth.controller.ts
- inject-brand-context.cjs
- embed-tokens.cjs
- primitive
- patch
- test_tailwind_config_gen.py
- Canvas Design System
- ._base_config
- logo/generate.py
- generate-tokens.cjs
- UsersService
- _run
- mock-properties.ts
- sync-brand-to-tokens.cjs
- UI Styling Skill
- main.ts
- public.decorator.ts
- shadow
- fontSize
- ui-ux-pro-max Skill
- Tailwind CSS Responsive Design
- AppLayout.tsx
- @prisma/client
- ConversationsGateway
- detect_domain
- _select_palette_for_mode
- Asset Approval Checklist
- Logo Usage Rules
- shadcn/ui Theming & Customization
- Tailwind CSS Customization
- pytest
- nest-cli.json
- StripeService
- Headroom Skill
- bench-db.js
- test-pooler.js
- lg
- Tailwind Integration
- bench-net.js
- Vercel Deployment Platform
- Window Icon (window.svg)
- mint.tmp.js
- xl
- validate_data.py
- Messaging Framework
- Brand Voice Framework
- .temp_project
- Next.js agent rules (breaking changes)
- File / Document Concept
- Globe / World Concept
- test_sync_brand_to_tokens.py
- main
- none
- .__init__
- scripts/cip/core.py (BM25)
- class-validator
- @nestjs/core
- @nestjs/passport
- @nestjs/platform-socket.io
- @nestjs/schedule
- @nestjs/websockets
- nodemailer
- passport-jwt
- @nestjs/jwt
- reflect-metadata
- rxjs
- socket.io
- @supabase/supabase-js
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Next.js Framework
- supabase.ts
- .test_add_components_dry_run
- .test_init_default_project_root
- .test_init_custom_project_root
- .test_check_shadcn_config_exists
- .test_get_installed_components_no_config
- .test_add_fonts
- .test_recommend_plugins
- .test_generate_typescript_config
- .test_generate_config_with_colors
- .test_generate_config_with_plugins
- .test_validate_config_no_content
- .test_validate_config_empty_theme
- .test_write_config
- .test_init_javascript
- .test_write_config_creates_content
- .test_write_config_invalid_path
- .test_full_configuration_javascript
- .test_default_output_path_typescript
- .test_base_config_structure
- .test_default_content_paths_vue
- .test_add_colors
- .test_check_shadcn_config_not_exists

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 70 edges
2. `TailwindConfigGenerator` - 58 edges
3. `TestTailwindConfigGenerator` - 35 edges
4. `PrismaService` - 35 edges
5. `ShadcnInstaller` - 34 edges
6. `PropertiesService` - 33 edges
7. `useAuth()` - 30 edges
8. `useToast()` - 29 edges
9. `Design Skill` - 29 edges
10. `TestShadcnInstaller` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Hold & auto-release payouts (period_start + 3 days)` --semantically_similar_to--> `Daily hold-release cron (initiates transfers)`  [INFERRED] [semantically similar]
  PLAN.md → payment_plan.md
- `Fixed 30-day block booking rule` --semantically_similar_to--> `Dynamic subscription at lease start (inline price_data)`  [INFERRED] [semantically similar]
  PLAN.md → payment_plan.md
- `Rental SaaS Development Plan` --conceptually_related_to--> `Next.js frontend README`  [INFERRED]
  PLAN.md → frontend/README.md
- `Tailwind CSS Customization` --semantically_similar_to--> `oklch Color Space`  [INFERRED] [semantically similar]
  .kilo/skills/ui-styling/references/tailwind-customization.md → .kilo/skills/ui-styling/references/canvas-design-system.md
- `"Conversation"` --references--> `Property`  [EXTRACTED]
  database-setup-phase8.sql → frontend/src/types/property.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Brand Sync Flow** — _kilo_skills_brand_references_update_brand_guidelines_md, _kilo_skills_brand_references_update_design_tokens_json, _kilo_skills_brand_references_update_design_tokens_css, _kilo_skills_brand_skill_sync_brand_to_tokens_cjs, _kilo_skills_brand_skill_brand_sync_workflow [EXTRACTED 1.00]
- **Complete Brand Package Workflow** — _kilo_skills_design_skill_logo_design, _kilo_skills_design_skill_cip_design, _kilo_skills_design_skill_slides [EXTRACTED 1.00]
- **Slides Knowledge Base** — _kilo_skills_design_references_slides_document, _kilo_skills_design_references_slides_create_document, _kilo_skills_design_references_slides_layout_patterns_document, _kilo_skills_design_references_slides_html_template_document, _kilo_skills_design_references_slides_copywriting_formulas_document, _kilo_skills_design_references_slides_strategies_document [EXTRACTED 1.00]
- **Three-Layer Token System** — _kilo_skills_design_system_references_primitive_tokens_doc, _kilo_skills_design_system_references_semantic_tokens_doc, _kilo_skills_design_system_references_component_tokens_doc, _kilo_skills_design_system_skill_three_layer_tokens [EXTRACTED 1.00]
- **Window Icon Depicts Browser Window with Title-Bar Controls** — frontend_public_window_window_icon, frontend_public_window_browser_window, frontend_public_window_app_window_controls [INFERRED 0.75]
- **Held rent release to owners flow** — plan_hold_release_payouts, payment_plan_daily_release_cron, payment_plan_webhook_source_of_truth [INFERRED 0.75]
- **Vercel and Next.js Ecosystem** — frontend_public_vercel_vercel_logo, frontend_public_vercel_platform, nextjs_framework [INFERRED 0.75]
- **Brand Visual Identity System** — _kilo_skills_brand_references_color_palette_management_doc, _kilo_skills_brand_references_typography_specifications_doc, _kilo_skills_brand_references_logo_usage_rules_doc, _kilo_skills_brand_references_visual_identity_doc, _kilo_skills_brand_templates_brand_guidelines_starter_doc [INFERRED 0.85]
- **Color Psychology Knowledge** — _kilo_skills_design_references_logo_color_psychology_color_psychology, _kilo_skills_design_references_cip_style_guide_document, _kilo_skills_design_references_logo_design_document [INFERRED 0.85]
- **File Icon Represents a Generic File/Document Placeholder** — frontend_public_file_file_icon, frontend_public_file_file_document_concept, frontend_public_file_placeholder_asset_concept [INFERRED 0.85]
- **Graphify extraction pipeline (AST + semantic)** — _kilo_skills_graphify_skill_graphify, _kilo_skills_graphify_skill_ast_structural_extraction, _kilo_skills_graphify_skill_semantic_extraction, _kilo_skills_graphify_references_extraction_spec_extraction_spec [INFERRED 0.85]
- **shadcn/ui Accessibility Foundation** — _kilo_skills_ui_styling_skill_shadcn_ui, _kilo_skills_ui_styling_skill_radix_ui, _kilo_skills_ui_styling_references_shadcn_accessibility_wai_aria, _kilo_skills_ui_styling_references_shadcn_accessibility_wcag [INFERRED 0.85]
- **Slides Deck Generation Stack** — _kilo_skills_slides_skill_slides, _kilo_skills_slides_references_html_template_html_template, _kilo_skills_slides_references_layout_patterns_layout_patterns, _kilo_skills_slides_references_copywriting_formulas_copywriting_formulas, _kilo_skills_slides_references_slide_strategies_slide_strategies [INFERRED 0.85]
- **UI Styling Core Stack** — _kilo_skills_ui_styling_skill_uistyling_skill, _kilo_skills_ui_styling_skill_shadcn_ui, _kilo_skills_ui_styling_skill_tailwind_css, _kilo_skills_ui_styling_skill_canvas [INFERRED 0.85]

## Communities (173 total, 49 thin omitted)

### Community 0 - "Design Skill"
Cohesion: 0.05
Nodes (68): Banner Sizes & Styles Reference (banner-design), Art Direction Styles (22), Banner Design Rules, Banner Design Skill, gemini-2.5-flash-image (banner-design), gemini-3-pro-image-preview (banner-design), Banner Design Principles (3-Zone, Safe Zones, CTA), Banner Sizes & Styles Reference (+60 more)

### Community 1 - "gray"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 2 - "search"
Cohesion: 0.07
Nodes (42): BM25, detect_domain(), get_cip_brief(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection (+34 more)

### Community 3 - "devDependencies"
Cohesion: 0.04
Nodes (44): babel-plugin-react-compiler, eslint, eslint-config-next, dependencies, leaflet, next, react, react-dom (+36 more)

### Community 4 - "useAuth"
Cohesion: 0.07
Nodes (32): BecomeOwnerPage(), PERKS, LoginForm(), SignUpPage(), cinzel, josefin, metadata, FEATURED_PROPERTIES (+24 more)

### Community 5 - "slide_search_core.py"
Cohesion: 0.08
Nodes (36): format_context(), format_result(), main(), Format a single search result for display, Format contextual recommendations for display., BM25, calculate_pattern_break(), detect_domain() (+28 more)

### Community 6 - "Graphify knowledge graph pipeline"
Cohesion: 0.06
Nodes (41): Add URL & watch folder reference, Folder watcher (--watch), URL ingest (graphify.ingest), Extra exports & benchmark reference, FalkorDB export, MCP stdio server (graphify.serve), Neo4j export (Cypher), Token-reduction benchmark (+33 more)

### Community 7 - "property/[id]/page.tsx"
Cohesion: 0.10
Nodes (31): FavoritesPage(), toCard(), AppBrowsePage(), BEDS, toCard(), formatDate(), getNextAvailableLabel(), LeafletMap (+23 more)

### Community 8 - "messages.ts"
Cohesion: 0.14
Nodes (21): ChatPage(), ChatWindow(), ChatWindowProps, formatTime(), MessageBubble(), MessageBubbleProps, ChatSkeleton(), TypingIndicator() (+13 more)

### Community 9 - "spacing"
Cohesion: 0.09
Nodes (22): $type, $value, $type, $value, $type, $value, $type, $value (+14 more)

### Community 10 - "Rental SaaS Development Plan"
Cohesion: 0.13
Nodes (21): Next.js frontend README, Daily hold-release cron (initiates transfers), Dynamic subscription at lease start (inline price_data), Lazy Stripe customer creation, No platform commission (100% rent minus Stripe fees), Replace existing payment code (authoritative design), Stripe Connect payment integration plan, Required Stripe webhook event set (+13 more)

### Community 11 - "apiFetch"
Cohesion: 0.14
Nodes (24): formatDate(), formatMoney(), MyLeasesPage(), STATUS_STYLES, ForgotPasswordForm(), BookingPage(), formatDate(), formatMoney() (+16 more)

### Community 12 - "TestTailwindConfigGenerator"
Cohesion: 0.06
Nodes (16): Test adding colors multiple times., Test adding full color palette., Test adding custom breakpoints., Test TailwindConfigGenerator class., Test that adding same plugin twice doesn't duplicate., Test plugin recommendations for Next.js., Test initialization with default settings., Test generating JavaScript configuration. (+8 more)

### Community 13 - "NotificationsService"
Cohesion: 0.11
Nodes (13): NotificationsController, Controller, Get, HttpCode, Param, Post, Query, Req (+5 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 15 - "design_system.py"
Cohesion: 0.11
Nodes (25): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+17 more)

### Community 16 - "app.module.ts"
Cohesion: 0.10
Nodes (23): AgentModule, Module, AuthModule, Module, ConversationsModule, Module, MailModule, Global (+15 more)

### Community 17 - "html-token-validator.py"
Cohesion: 0.13
Nodes (24): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+16 more)

### Community 19 - "AgentService"
Cohesion: 0.07
Nodes (28): ArrayMinSize, AgentController, Body, Controller, Get, Post, Req, ChatDto (+20 more)

### Community 20 - "PaymentService"
Cohesion: 0.14
Nodes (8): PaymentController, Controller, Post, Req, PaymentService, Cron, Injectable, Headers

### Community 21 - "FavoritesService"
Cohesion: 0.13
Nodes (12): FavoritesController, Controller, Delete, Get, HttpCode, Param, Post, Req (+4 more)

### Community 22 - "DashboardClient.tsx"
Cohesion: 0.18
Nodes (21): DashboardClient(), DashboardInitialData, formatDate(), formatMoney(), STATUS_LABEL, SWR_CONFIG, OwnerDashboardPage(), fetchOwnerProperties() (+13 more)

### Community 23 - "BM25"
Cohesion: 0.11
Nodes (19): BM25, detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search across all domains and combine results (+11 more)

### Community 24 - "search"
Cohesion: 0.12
Nodes (18): _domain_keywords(), _get_bm25(), _load_csv(), _load_product_keywords(), Load CSV and return list of dicts, with mtime-based caching., Fitted BM25 index for this file+columns, with mtime-based caching., Core search function using BM25. Returns (results, bm25_or_none)., Nearest known vocabulary terms for a query that returned 0 hits, so the caller… (+10 more)

### Community 25 - "ConversationsController"
Cohesion: 0.20
Nodes (11): ConversationsController, Body, Controller, Delete, Get, HttpCode, Param, Patch (+3 more)

### Community 26 - "ConversationsService"
Cohesion: 0.18
Nodes (3): ConversationsService, Injectable, SubscribeMessage

### Community 27 - "owner-upgrade.controller.ts"
Cohesion: 0.16
Nodes (10): BecomeOwnerRequestDto, IsString, OwnerUpgradeController, Body, Controller, HttpCode, Post, Req (+2 more)

### Community 28 - "Copywriting Formulas"
Cohesion: 0.11
Nodes (22): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Copywriting Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), PAS (Problem-Agitate-Solution), search-slides.py, Slides Create Subcommand (+14 more)

### Community 29 - "Public"
Cohesion: 0.16
Nodes (13): AuthController, Body, Controller, Get, HttpCode, Patch, Post, Req (+5 more)

### Community 30 - "TailwindConfigGenerator"
Cohesion: 0.10
Nodes (12): main(), Add custom font families. Args: fonts: Dict of font_type: [font_names] e.g.,…, Add custom spacing values. Args: spacing: Dict of name: value e.g., {'18':…, Add custom breakpoints. Args: breakpoints: Dict of name: width e.g., {'3xl':…, Add plugin requirements. Args: plugins: List of plugin names e.g.,…, Get plugin recommendations based on configuration. Returns: List of recommended…, Generate Tailwind CSS configuration files., Validate configuration. Returns: Tuple of (valid, message) (+4 more)

### Community 31 - "DesignSystemGenerator"
Cohesion: 0.13
Nodes (12): DesignSystemGenerator, Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., Execute searches across multiple domains., Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict. (+4 more)

### Community 32 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, bcrypt, class-transformer, cookie-parser, @nestjs/common, @nestjs/config, @nestjs/platform-express, @nestjs/throttler (+13 more)

### Community 33 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, @nestjs/cli, @nestjs/schematics, prisma, ts-node, @types/bcrypt, @types/cookie-parser, @types/express (+13 more)

### Community 34 - "Roles"
Cohesion: 0.10
Nodes (13): Roles(), ROLES_KEY, RolesGuard, Injectable, PayoutsController, Controller, Get, Post (+5 more)

### Community 35 - "shadcn/ui Component Reference"
Cohesion: 0.14
Nodes (20): axe-core, Live Regions, shadcn/ui Accessibility Patterns, WAI-ARIA, WCAG, shadcn/ui Accordion, shadcn/ui Alert, shadcn/ui Card (+12 more)

### Community 36 - "Workflow"
Cohesion: 0.08
Nodes (23): Art Direction Styles (Reuse from Banner), Color & Contrast, Design Best Practices, HTML Design Rules, HTML Template Structure, Option A: Chrome Headless CLI (Recommended — zero dependencies), Option B: chrome-devtools skill, Option C: Playwright script (+15 more)

### Community 37 - "AgentChat.tsx"
Cohesion: 0.07
Nodes (35): AgentContent(), FEATURES, AgentChat(), ChatMessage, getAudioContext(), getSpeechRecognition(), mapHistoryItem(), playCue() (+27 more)

### Community 38 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+11 more)

### Community 39 - "properties.ts"
Cohesion: 0.24
Nodes (13): EditPropertyPage(), NewPropertyPage(), EMPTY, PropertyForm(), PropertyFormData, PropertyFormProps, createProperty(), deleteProperty() (+5 more)

### Community 40 - "AvailabilityCalendar.tsx"
Cohesion: 0.29
Nodes (10): AvailabilityCalendar(), AvailabilityCalendarProps, DAY_LABELS, daysInMonth(), isDateBooked(), isPast(), isToday(), MONTH_NAMES (+2 more)

### Community 41 - "generate-slide.py"
Cohesion: 0.15
Nodes (19): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+11 more)

### Community 42 - "PrismaService"
Cohesion: 0.10
Nodes (10): PrismaKeepAliveService, Cron, Injectable, PrismaService, Injectable, SessionsModule, Module, SessionsService (+2 more)

### Community 43 - "color"
Cohesion: 0.04
Nodes (46): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+38 more)

### Community 44 - "test_design_system_mode.py"
Cohesion: 0.16
Nodes (10): _filter_anti_patterns_for_mode(), _query_wants_dark(), True when a styles.csv row describes itself as dark-first., True when the query explicitly asks for a dark theme., Resolve the mode the rest of the output has to agree with., Drop "avoid dark mode" advice once dark mode is the resolved answer., _resolve_color_mode(), _style_is_dark_primary() (+2 more)

### Community 45 - "Skeleton.tsx"
Cohesion: 0.15
Nodes (7): ConfirmContent(), ResetPasswordForm(), BookingPageSkeleton(), DashboardSkeleton(), PropertyRowSkeleton(), Skeleton(), SkeletonProps

### Community 46 - "CheckoutService"
Cohesion: 0.12
Nodes (12): CheckoutController, Body, Controller, Get, Post, Query, Req, Res (+4 more)

### Community 47 - "PropertiesService"
Cohesion: 0.05
Nodes (35): CreatePropertyDto, PresignUploadDto, PropertyQueryDto, ArrayMaxSize, IsArray, IsInt, IsNumber, IsOptional (+27 more)

### Community 48 - "realtime-context.tsx"
Cohesion: 0.13
Nodes (22): MessagesPage(), ConversationList(), ConversationListProps, timeAgo(), Header(), NotificationBell(), timeAgo(), RealtimeContext (+14 more)

### Community 49 - "fetch-background.py"
Cohesion: 0.17
Nodes (17): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+9 more)

### Community 50 - "button"
Cohesion: 0.06
Nodes (45): $type, $value, $type, $value, bg, fg, font-size, hover-bg (+37 more)

### Community 51 - "BM25"
Cohesion: 0.15
Nodes (9): BM25, _normalize(), Apply synonym substitution before tokenizing., BM25 ranking algorithm for text search, Lowercase, normalize synonyms, split, remove punctuation, filter stopwords, Build BM25 index from documents, Score all documents against query, All indexed terms, for suggestion/typo-recovery purposes. (+1 more)

### Community 52 - "LeasesController"
Cohesion: 0.21
Nodes (8): LeasesController, Body, Controller, Get, Param, Patch, Post, Req

### Community 53 - "icon/generate.py"
Cohesion: 0.20
Nodes (15): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+7 more)

### Community 54 - "MailService"
Cohesion: 0.15
Nodes (4): MailService, Injectable, OwnerUpgradeService, Injectable

### Community 55 - "TestShadcnInstaller"
Cohesion: 0.12
Nodes (9): Test adding components without shadcn config., Test adding components that are already installed., Test ShadcnInstaller class., Test adding all components in dry run mode., Test listing installed components without config., Test listing installed components when none exist., Test listing installed components when they exist., Test getting installed components when files exist. (+1 more)

### Community 56 - "Design System Skill"
Cohesion: 0.16
Nodes (15): Component Spec Definitions, Component Specifications, Component Token Definitions, Component Tokens, States and Variants, Interactive State Definitions, Variant Patterns, Dark Mode Overrides (+7 more)

### Community 57 - "3"
Cohesion: 0.67
Nodes (3): $type, $value, 3

### Community 58 - "LeasesService"
Cohesion: 0.11
Nodes (17): CreateLeaseDto, RenewLeaseDto, IsInt, IsOptional, IsString, Max, Min, LeasesModule (+9 more)

### Community 59 - "_palette_is_dark"
Cohesion: 0.18
Nodes (7): _palette_is_dark(), WCAG relative luminance of a #RRGGBB string, or None if unparseable., True when a colors.csv row's Background is a dark surface., _relative_luminance(), The exact reproduction from issue #428., TestEndToEndCoherence, TestLuminance

### Community 60 - "4"
Cohesion: 0.67
Nodes (3): $type, $value, 4

### Community 61 - "extract-colors.cjs"
Cohesion: 0.22
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 62 - "validate-asset.cjs"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 63 - "Color Palette Management"
Cohesion: 0.19
Nodes (13): Color Hierarchy, Brand Compliance Validation, Color Palette Management, WCAG Contrast Requirements, Typography Specifications, Type Scale, extract-colors.cjs, AI Image Generation Prompt Template (+5 more)

### Community 64 - "conversations.service.ts"
Cohesion: 0.35
Nodes (8): CreateConversationDto, EditMessageDto, PresignChatUploadDto, SendMessageDto, IsArray, IsOptional, IsString, MaxLength

### Community 65 - "5"
Cohesion: 0.67
Nodes (3): $type, $value, 5

### Community 66 - "8"
Cohesion: 0.67
Nodes (3): $type, $value, 8

### Community 68 - "validate-tokens.cjs"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 69 - "ShadcnInstaller"
Cohesion: 0.20
Nodes (7): main(), Handle shadcn/ui component installation., ShadcnInstaller, Tests for shadcn_add.py, Test adding all components without config., Test initialization with dry run mode., Test getting installed components when none exist.

### Community 70 - ".check_shadcn_config"
Cohesion: 0.21
Nodes (6): Add all available shadcn/ui components. Args: overwrite: If True, overwrite…, List installed components. Returns: Tuple of (success, message with component…, Check if shadcn is initialized in project. Returns: True if components.json…, Get list of already installed components. Returns: List of installed component…, Read shadcn version from project package.json; fall back to a pinned default., Add shadcn/ui components. Args: components: List of component names to add…

### Community 71 - ".generate_config_string"
Cohesion: 0.20
Nodes (6): Generate configuration file content. Returns: Configuration file as string, Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config. Validates each plugin name against a strict…, Add indentation to JSON string., Write configuration to file. Returns: Tuple of (success, message)

### Community 72 - "Brand Skill"
Cohesion: 0.27
Nodes (11): Brand Guidelines Template, Extractable Fields, docs/brand-guidelines.md, Color Presets, assets/design-tokens.css, assets/design-tokens.json, Brand Update Command, Brand Skill (+3 more)

### Community 73 - "scripts"
Cohesion: 0.18
Nodes (10): description, name, scripts, build, prisma:generate, prisma:migrate, start, start:dev (+2 more)

### Community 74 - "radius"
Cohesion: 0.29
Nodes (8): $type, $value, $type, $value, radius, full, md, md

### Community 75 - "auth.controller.ts"
Cohesion: 0.41
Nodes (9): ForgotPasswordDto, LogInDto, ResetPasswordDto, SignUpDto, IsOptional, IsString, MinLength, UpdateProfileDto (+1 more)

### Community 76 - "inject-brand-context.cjs"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 77 - "embed-tokens.cjs"
Cohesion: 0.18
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 78 - "primitive"
Cohesion: 0.14
Nodes (13): dark, fast, normal, slow, $type, $value, $type, $value (+5 more)

### Community 79 - "patch"
Cohesion: 0.18
Nodes (6): patch, Test adding components with overwrite flag., Test successful component addition., Test component addition with subprocess error., Test component addition when npx is not found., Test successful addition of all components.

### Community 80 - "test_tailwind_config_gen.py"
Cohesion: 0.22
Nodes (8): Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be handed…, Regression guard for the missing-comma bug between the ``theme`` block and…, The property preceding ``plugins`` must end with a comma (pure-Python check, so…, The emitted config parses as valid JS via ``node --check``., _strip_to_object(), TestGeneratedConfigIsValidJs, parametrize

### Community 81 - "Canvas Design System"
Cohesion: 0.20
Nodes (10): Analog Meditation, Canvas Design System, Chromatic Language, Concrete Poetry, Geometric Silence, Josef Albers, Le Corbusier, oklch Color Space (+2 more)

### Community 82 - "._base_config"
Cohesion: 0.22
Nodes (6): Any, Path, Initialize generator. Args: typescript: If True, generate .ts config, else .js…, Determine default output path., Create base configuration structure., Get default content paths for framework.

### Community 83 - "logo/generate.py"
Cohesion: 0.29
Nodes (9): enhance_prompt(), generate_batch(), generate_logo(), load_env(), main(), Enhance the logo prompt with style and industry modifiers, Generate a logo using Gemini models with image generation Args: aspect_ratio:…, Generate multiple logo variants with different styles (+1 more)

### Community 84 - "generate-tokens.cjs"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 85 - "UsersService"
Cohesion: 0.20
Nodes (7): JwtPayload, JwtStrategy, Injectable, Module, UsersModule, Injectable, UsersService

### Community 86 - "_run"
Cohesion: 0.28
Nodes (8): CompletedProcess, Path, Regression tests for validate-tokens.cjs. The validator used to skip any line…, A hardcoded hex on the same line as a var() token is still a violation., A line that references only tokens produces no false positives., _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 87 - "mock-properties.ts"
Cohesion: 0.28
Nodes (6): AvailabilityStripProps, AvailabilitySegment, CITIES, MOCK_PROPERTIES, MockProperty, NEIGHBORHOODS

### Community 88 - "sync-brand-to-tokens.cjs"
Cohesion: 0.33
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 89 - "UI Styling Skill"
Cohesion: 0.32
Nodes (8): Apache License 2.0, shadcn/ui Form, Canvas Visual Design Layer, Radix UI, React Hook Form, shadcn/ui, UI Styling Skill, Zod

### Community 90 - "main.ts"
Cohesion: 0.29
Nodes (4): AppModule, Module, HttpLoggingInterceptor, Injectable

### Community 91 - "public.decorator.ts"
Cohesion: 0.29
Nodes (3): IS_PUBLIC_KEY, JwtAuthGuard, Injectable

### Community 92 - "shadow"
Cohesion: 0.27
Nodes (10): $type, $value, sm, shadow, default, sm, default, sm (+2 more)

### Community 94 - "fontSize"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 95 - "ui-ux-pro-max Skill"
Cohesion: 0.29
Nodes (7): Consistency Audit, Brand Consistency Checklist, Design Dials, Design System Search, Master/Overrides Retrieval Pattern, Pre-Delivery Checklist, ui-ux-pro-max Skill

### Community 96 - "Tailwind CSS Responsive Design"
Cohesion: 0.29
Nodes (7): Breakpoint System, Container Queries, Mobile-First Approach, Tailwind CSS Responsive Design, Arbitrary Values, Tailwind CSS Utility Reference, Tailwind CSS

### Community 97 - "AppLayout.tsx"
Cohesion: 0.15
Nodes (9): "Conversation", "Message", "Notification", AppLayout(), getPageTitle(), NAV_ITEMS, RequireAuth(), RequireOwner() (+1 more)

### Community 99 - "ConversationsGateway"
Cohesion: 0.29
Nodes (3): ConversationsGateway, WebSocketGateway, WebSocketServer

### Community 100 - "detect_domain"
Cohesion: 0.43
Nodes (3): detect_domain(), Auto-detect the most relevant domain from query. Matches are weighted by…, TestDomainDetection

### Community 101 - "_select_palette_for_mode"
Cohesion: 0.43
Nodes (3): Pick the highest-ranked palette matching the resolved mode. Only the dark case…, _select_palette_for_mode(), TestPaletteSelection

### Community 102 - "Asset Approval Checklist"
Cohesion: 0.33
Nodes (6): Asset Approval Review, Asset Approval Checklist, Asset Manifest Schema, Asset Organization Guide, Asset Naming Convention, validate-asset.cjs

### Community 103 - "Logo Usage Rules"
Cohesion: 0.33
Nodes (6): Logo Clear Space, Co-branding Rules, Logo Usage Rules, Logo Variants, Core Visual Elements, Visual Identity Basics

### Community 104 - "shadcn/ui Theming & Customization"
Cohesion: 0.33
Nodes (6): shadcn/ui Button, CSS Variable System, Dark Mode, HSL Color Format, shadcn/ui Theming & Customization, next-themes

### Community 105 - "Tailwind CSS Customization"
Cohesion: 0.33
Nodes (6): @apply Directive, Custom Variants, CSS Layer Organization, Tailwind CSS Customization, Tailwind CSS Plugins, @theme Directive

### Community 106 - "pytest"
Cohesion: 0.33
Nodes (6): pytest, pytest-cov, pytest-mock, pytest, pytest-cov, pytest-mock

### Community 107 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 108 - "StripeService"
Cohesion: 0.20
Nodes (5): StripeModule, Global, Module, StripeService, Injectable

### Community 109 - "Headroom Skill"
Cohesion: 0.50
Nodes (5): Compressed Context Recovery (CCR), Compression Proxy, Headroom Skill, headroom-ai, Serena Semantic Navigation

### Community 110 - "bench-db.js"
Cohesion: 0.50
Nodes (4): bench(), main(), prisma, { PrismaClient }

### Community 111 - "test-pooler.js"
Cohesion: 0.50
Nodes (4): net, regions, run(), testHost()

### Community 113 - "lg"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 114 - "Tailwind Integration"
Cohesion: 0.50
Nodes (4): Tailwind Integration, HSL Format for Opacity, shadcn/ui Alignment, Tailwind Token Mapping

### Community 116 - "Vercel Deployment Platform"
Cohesion: 0.83
Nodes (4): Vercel Brand, Vercel Deployment Platform, Vercel Logo (SVG asset), Next.js Framework

### Community 117 - "Window Icon (window.svg)"
Cohesion: 0.50
Nodes (4): Window Controls Concept (macOS-style traffic light dots), Browser / App Window Concept, UI Icon Concept, Window Icon (window.svg)

### Community 119 - "mint.tmp.js"
Cohesion: 0.50
Nodes (3): jwt, p, { PrismaClient }

### Community 120 - "xl"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 122 - "validate_data.py"
Cohesion: 0.83
Nodes (3): _check_file(), main(), _read_rows()

### Community 123 - "Messaging Framework"
Cohesion: 1.00
Nodes (3): Core Statements Hierarchy, Messaging Framework, Message Architecture

### Community 124 - "Brand Voice Framework"
Cohesion: 1.00
Nodes (3): Brand Voice Framework, Voice Development Process, Voice vs Tone

### Community 126 - "Next.js agent rules (breaking changes)"
Cohesion: 0.67
Nodes (3): Framework version drift warning, Next.js agent rules (breaking changes), Frontend CLAUDE.md

### Community 127 - "File / Document Concept"
Cohesion: 1.00
Nodes (3): File / Document Concept, File Icon (SVG), Frontend Placeholder Asset Concept

### Community 128 - "Globe / World Concept"
Cohesion: 1.00
Nodes (3): Globe / World Concept, Globe Icon, Next.js Starter Favicon Asset

### Community 131 - "none"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

## Knowledge Gaps
- **447 isolated node(s):** `fs`, `path`, `fs`, `path`, `fs` (+442 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `PrismaService` to `conversations.service.ts`, `Roles`, `auth.controller.ts`, `StripeService`, `NotificationsService`, `CheckoutService`, `PropertiesService`, `app.module.ts`, `AgentService`, `PaymentService`, `FavoritesService`, `MailService`, `UsersService`, `LeasesService`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `primitive` connect `primitive` to `gray`, `spacing`, `radius`, `shadow`, `fontSize`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `PropertiesService` connect `PropertiesService` to `app.module.ts`, `AgentService`, `StripeService`, `FavoritesService`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `fs` to the rest of the system?**
  _447 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Design Skill` be split into smaller, more focused modules?**
  _Cohesion score 0.05443371378402107 - nodes in this community are weakly interconnected._
- **Should `gray` be split into smaller, more focused modules?**
  _Cohesion score 0.05370101596516691 - nodes in this community are weakly interconnected._