# Social Hub Skills - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SOCIAL HUB ENTERPRISE                                │
│                         OpenClaw Aurora Framework                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            SKILL REGISTRY V2                                 │
│                      (Central Skill Management)                              │
└────────────────────────┬────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                     ┌────▼────┐
    │ BASIC   │                     │ENTERPRISE│
    │ SKILLS  │                     │ SKILLS  │
    │  (7)    │                     │  (7)    │
    └────┬────┘                     └────┬────┘
         │                               │
┌────────┴────────┐             ┌────────┴────────────┐
│                 │             │                     │
│  S-01: Planner  │             │  S-19: Publer V2   │◄──── Publer API
│  S-02: Publer   │             │  S-02: Enricher    │◄──── Claude Vision
│  S-03: Caption  │             │  S-12: Quotas      │◄──── CSV History
│  S-04: Hashtag  │             │  S-25: Analytics   │◄──── Instagram API
│  S-05: Inventory│             │  S-32: Approval    │◄──── Telegram Bot
│  S-06: Analytics│             │  S-43: Database    │◄──── PostgreSQL
│  S-07: Orchestr.│             │  S-45: Observability│◄─── Winston/Sentry
│                 │             │                     │
└─────────────────┘             └─────────────────────┘
```

## Data Flow Architecture

```
┌─────────────┐
│   VIDEO     │
│   INPUT     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  S-02: VIDEO ENRICHER (Claude Vision)           │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. Extract frames (ffmpeg)              │   │
│  │ 2. Analyze with Claude Vision           │   │
│  │ 3. Generate: hooks, captions, hashtags  │   │
│  │ 4. Classify: tema, pilar, keywords      │   │
│  │ 5. Score: viral potential (0-100)       │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  ENRICHED METADATA    │
         └───────────┬───────────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
       ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ S-12: QUOTA      │      │ S-43: DATABASE   │
│ ENFORCER         │      │ MANAGER          │
│                  │      │                  │
│ Check:           │      │ Store:           │
│ - Daily limit    │      │ - Video metadata │
│ - Content gap    │      │ - Post details   │
│ - Time slots     │      │ - Analytics      │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │ ✓ Allowed               │
         ▼                         │
┌──────────────────────────────────┴──────┐
│  S-32: APPROVAL WORKFLOW                │
│  ┌─────────────────────────────────┐   │
│  │ Auto-approve: Satellites        │   │
│  │ Manual review: Lucas/Família    │   │
│  │ Notification: Telegram          │   │
│  └─────────────────────────────────┘   │
└────────────────┬────────────────────────┘
                 │
                 │ ✓ Approved
                 ▼
┌──────────────────────────────────────────┐
│  S-19: PUBLER V2 (Production API)        │
│  ┌─────────────────────────────────┐    │
│  │ 1. Upload video (multipart)     │    │
│  │ 2. Create scheduled post        │    │
│  │ 3. Retry with backoff           │    │
│  │ 4. Track progress               │    │
│  └─────────────────────────────────┘    │
└────────────────┬─────────────────────────┘
                 │
                 │ ✓ Scheduled
                 ▼
┌──────────────────────────────────────────┐
│  INSTAGRAM / PUBLER                      │
│  (Post published at scheduled time)      │
└────────────────┬─────────────────────────┘
                 │
                 │ After publication
                 ▼
┌──────────────────────────────────────────┐
│  S-25: ANALYTICS COLLECTOR               │
│  ┌─────────────────────────────────┐    │
│  │ 1. Fetch metrics (Graph API)    │    │
│  │ 2. Calculate viral score        │    │
│  │ 3. Analyze trends               │    │
│  │ 4. Store in database            │    │
│  └─────────────────────────────────┘    │
└──────────────────────────────────────────┘

         ┌────────────────────────┐
         │ S-45: OBSERVABILITY    │
         │ (Logs all operations)  │
         └────────────────────────┘
```

## Skill Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│                     EXTERNAL DEPENDENCIES                     │
└──────────────────────────────────────────────────────────────┘

S-19: Publer V2
├── Publer API (api.publer.io/v1)
├── axios
├── form-data
└── fs/promises

S-02: Video Enricher
├── Claude Vision API (Anthropic)
├── @anthropic-ai/sdk
├── ffmpeg (system)
└── fs/promises

S-12: Quota Enforcer
├── fs/promises (CSV)
└── path

S-25: Analytics Collector
├── Instagram Graph API (v18.0)
├── axios
└── date calculations

S-32: Approval Workflow
├── Telegram Bot API
├── axios
├── fs/promises (JSON)
└── path

S-43: Database Manager
├── PostgreSQL (pg client)
├── pg
└── fs/promises (CSV migration)

S-45: Observability
├── winston (logging)
├── @sentry/node (errors)
├── prom-client (metrics)
└── fs/promises
```

## Configuration Flow

```
┌────────────────────────────────────────────────────┐
│              ENVIRONMENT VARIABLES                  │
├────────────────────────────────────────────────────┤
│ PUBLER_API_KEY          ───────────► Publer V2    │
│ ANTHROPIC_API_KEY       ───────────► Video Enricher│
│ INSTAGRAM_ACCESS_TOKEN  ───────────► Analytics    │
│ DATABASE_URL            ───────────► Database Mgr  │
│ TELEGRAM_BOT_TOKEN      ───────────► Approval WF   │
│ SENTRY_DSN              ───────────► Observability │
│ SOCIAL_HUB_PATH         ───────────► All skills    │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│          social-hub-config.ts (Singleton)           │
│  ┌──────────────────────────────────────────┐     │
│  │ loadSocialHubConfig()                     │     │
│  │ validateSocialHubConfig()                 │     │
│  │ getSocialHubConfig() - cached            │     │
│  └──────────────────────────────────────────┘     │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  All skills access via │
        │  getSocialHubConfig()  │
        └────────────────────────┘
```

## Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SKILL EXECUTION                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   validate()  │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Input valid? │
                    └───┬───────┬───┘
                        │       │
                   NO ◄─┘       └─► YES
                    │               │
                    ▼               ▼
            ┌──────────────┐  ┌──────────────┐
            │ Return error │  │  execute()   │
            └──────────────┘  └──────┬───────┘
                                     │
                              ┌──────▼──────┐
                              │ Try/Catch   │
                              └──────┬──────┘
                                     │
                        ┌────────────┴────────────┐
                        │                         │
                    SUCCESS                    ERROR
                        │                         │
                        ▼                         ▼
               ┌────────────────┐      ┌──────────────────┐
               │ Return success │      │ Retry logic?     │
               │ with data      │      └────┬────────┬────┘
               └────────────────┘           │        │
                                        YES │        │ NO
                                            │        │
                                            ▼        ▼
                                  ┌──────────────┐  │
                                  │ Exponential  │  │
                                  │ backoff      │  │
                                  │ (1s→2s→4s)   │  │
                                  └──────┬───────┘  │
                                         │          │
                                         └──────────┤
                                                    │
                                                    ▼
                                         ┌──────────────────┐
                                         │ Extract error    │
                                         │ message          │
                                         │ (Axios/Generic)  │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │ Return error     │
                                         │ with details     │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │ S-45: Log error  │
                                         │ (if initialized) │
                                         └──────────────────┘
```

## Database Schema (S-43)

```
┌──────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                              │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  videos                                                      │
├─────────────────────────────────────────────────────────────┤
│  id (SERIAL PK)                                             │
│  filename (VARCHAR UNIQUE)  ◄───── From Video Enricher      │
│  file_path (TEXT)                                           │
│  tema (VARCHAR)                                             │
│  pilar (VARCHAR)                                            │
│  keywords (TEXT[])                                          │
│  viral_potential (INTEGER)                                  │
│  metadata (JSONB)                                           │
│  created_at, updated_at                                     │
└────────────┬────────────────────────────────────────────────┘
             │
             │ 1:N
             │
┌────────────▼────────────────────────────────────────────────┐
│  posts                                                       │
├─────────────────────────────────────────────────────────────┤
│  id (SERIAL PK)                                             │
│  video_id (FK)                                              │
│  pagina (VARCHAR)          ◄───── From Quota Enforcer       │
│  scheduled_date (DATE)                                      │
│  scheduled_time (TIME)                                      │
│  status (VARCHAR)                                           │
│  legenda (TEXT)                                             │
│  hashtags (TEXT[])                                          │
│  publer_job_id (VARCHAR)   ◄───── From Publer V2           │
│  grupo_conteudo (VARCHAR)                                   │
│  approval_status (VARCHAR) ◄───── From Approval Workflow    │
│  created_at, updated_at                                     │
└────────────┬────────────────────────────────────────────────┘
             │
             │ 1:N
             │
┌────────────▼────────────────────────────────────────────────┐
│  analytics                                                   │
├─────────────────────────────────────────────────────────────┤
│  id (SERIAL PK)                                             │
│  post_id (FK)                                               │
│  instagram_post_id (VARCHAR) ◄── From Instagram             │
│  reach (INTEGER)                                            │
│  impressions (INTEGER)                                      │
│  engagement (INTEGER)                                       │
│  likes, comments, shares, saves                             │
│  engagement_rate (DECIMAL)  ◄───── Calculated               │
│  viral_score (INTEGER)      ◄───── From Analytics Collector │
│  metrics (JSONB)                                            │
│  collected_at                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  INDEXES                                                     │
├─────────────────────────────────────────────────────────────┤
│  idx_videos_tema          (tema)                            │
│  idx_videos_pilar         (pilar)                           │
│  idx_posts_pagina         (pagina)                          │
│  idx_posts_scheduled      (scheduled_date, scheduled_time)  │
│  idx_posts_status         (status)                          │
│  idx_posts_grupo_conteudo (pagina, grupo_conteudo)         │
│  idx_analytics_post_id    (post_id)                        │
└─────────────────────────────────────────────────────────────┘
```

## Observability Architecture (S-45)

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION EVENTS                        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   LOGS       │   │   METRICS    │   │   ERRORS     │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   WINSTON    │   │  PROMETHEUS  │   │   SENTRY     │
│              │   │              │   │              │
│ Transports:  │   │ Metrics:     │   │ Tracking:    │
│ - Console    │   │ - Counters   │   │ - Stack      │
│ - File       │   │ - Gauges     │   │ - Context    │
│ - JSON       │   │ - Histograms │   │ - User       │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ error.log    │   │ /metrics     │   │ Sentry UI    │
│ combined.log │   │ endpoint     │   │ (web)        │
└──────────────┘   └──────────────┘   └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     HEALTH CHECKS                            │
├─────────────────────────────────────────────────────────────┤
│  ✓ Filesystem  - Read/write test                           │
│  ✓ Memory      - Heap usage (warn >70%, fail >90%)         │
│  ✓ Disk        - /tmp usage (warn >80%, fail >90%)         │
│  ✓ Logger      - Winston status                            │
│  ✓ Error Track - Sentry status                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
   healthy | degraded | unhealthy
```

## Skill Interaction Matrix

```
                 Publer  Enricher Quota  Analytics Approval Database Observ.
                 ──────────────────────────────────────────────────────────
Publer V2        │  -   │   ○    │  ○   │    ×     │   ○   │    ○   │  ●
Video Enricher   │  ×   │   -    │  ○   │    ×     │   ×   │    ●   │  ●
Quota Enforcer   │  ×   │   ×    │  -   │    ×     │   ○   │    ●   │  ●
Analytics Coll.  │  ×   │   ×    │  ×   │    -     │   ×   │    ●   │  ●
Approval WF      │  ○   │   ×    │  ○   │    ×     │   -   │    ●   │  ●
Database Mgr     │  ×   │   ●    │  ●   │    ●     │   ●   │    -   │  ●
Observability    │  ×   │   ×    │  ×   │    ×     │   ×   │    ×   │  -

Legend:
  ● = Strongly coupled (direct dependency)
  ○ = Loosely coupled (data passed between)
  × = No direct interaction
  - = Same skill
```

## Legend

```
┌─────┐
│ Box │  = Component/System
└─────┘

───►    = Data flow / API call
═══►    = Database operation
···►    = Optional dependency

(FK)    = Foreign Key
(PK)    = Primary Key
(UNIQUE)= Unique constraint
(JSONB) = JSON column type
```

---

**Architecture Document**
Version: 1.0.0
Last Updated: 2026-02-06
Maintained by: MAGNUS & ARIA
