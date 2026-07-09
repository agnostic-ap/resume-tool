export function platformOpenApiDocument() {
  const errorResponse = {
    description: 'Platform API error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/PlatformError' },
      },
    },
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Resume Tool Platform API',
      version: '0.1.0',
      description: 'Generate JD-tailored resume drafts, optionally persist them as resume documents, and inspect platform request logs.',
    },
    servers: [{ url: 'http://127.0.0.1:8787' }],
    tags: [
      { name: 'Platform Drafts', description: 'Server-to-server resume draft generation for external AI platforms.' },
      { name: 'Platform Logs', description: 'Request audit logs for platform clients and operators.' },
    ],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      '/api/v1/resume-drafts': {
        post: {
          tags: ['Platform Drafts'],
          summary: 'Generate a JD-tailored resume draft',
          description: 'Requires `drafts:write` scope. Use `requestId` for idempotent persisted drafts.',
          operationId: 'createResumeDraft',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResumeDraftRequest' },
                examples: {
                  minimal: {
                    value: {
                      requestId: 'req-001',
                      userId: 'user-42',
                      persist: true,
                      workHistory: [
                        {
                          company: 'Acme AI',
                          title: 'Product Engineer',
                          achievements: ['Improved recruiter review speed by 38%'],
                        },
                      ],
                      jobDescription: {
                        company: 'FutureHire',
                        title: 'Senior Product Engineer',
                        description: 'Build LLM hiring workflows.',
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Draft generated, or idempotent persisted replay',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ResumeDraftResponse' },
                },
              },
            },
            201: {
              description: 'Draft generated and persisted as a resume document',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ResumeDraftResponse' },
                },
              },
            },
            400: errorResponse,
            401: errorResponse,
            403: errorResponse,
            429: errorResponse,
          },
        },
      },
      '/api/v1/platform/requests': {
        get: {
          tags: ['Platform Logs'],
          summary: 'List platform request logs',
          description: 'Requires `requests:read` scope. Clients without `requests:all` only see their own logs.',
          operationId: 'listPlatformRequests',
          responses: {
            200: {
              description: 'Request log list with clientId, route, status, latencyMs, matchScore, and documentId when persisted',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PlatformRequestLog' },
                  },
                },
              },
            },
            401: errorResponse,
            403: errorResponse,
          },
        },
      },
      '/api/v1/platform/usage': {
        get: {
          tags: ['Platform Logs'],
          summary: 'Get metered usage and billing',
          description: 'Requires `requests:read` scope. Clients without `requests:all` only see their own usage. Billing is billableRequests × pricePerDraft.',
          operationId: 'getPlatformUsage',
          responses: {
            200: {
              description: 'Per-client usage and billing summary',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlatformBillingSummary' },
                },
              },
            },
            401: errorResponse,
            403: errorResponse,
          },
        },
      },
      '/api/v1/openapi.json': {
        get: {
          summary: 'OpenAPI contract',
          security: [],
          responses: { 200: { description: 'OpenAPI 3.1 document' } },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-resume-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas: {
        ResumeDraftRequest: {
          type: 'object',
          required: ['workHistory', 'jobDescription'],
          additionalProperties: false,
          properties: {
            requestId: {
              type: 'string',
              description: 'Optional caller-provided idempotent key. When persist=true, repeating this id replays the existing persisted document.',
              examples: ['req-001'],
            },
            userId: {
              type: 'string',
              description: 'External user identifier used for request logs and future reconciliation.',
              examples: ['user-42'],
            },
            persist: {
              type: 'boolean',
              default: false,
              description: 'When true, save the generated draft as a resume document and return generation.documentId.',
            },
            locale: {
              type: 'string',
              enum: ['zh-CN', 'en-US'],
              default: 'zh-CN',
            },
            templateId: {
              type: 'string',
              enum: ['classic', 'modern', 'sidebar', 'compact', 'executive', 'creative', 'academic', 'technical', 'product', 'minimal'],
              default: 'classic',
            },
            personal: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                location: { type: 'string' },
                website: { type: 'string' },
                summary: { type: 'string' },
              },
            },
            workHistory: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/WorkHistoryItem' },
            },
            education: {
              type: 'array',
              items: { $ref: '#/components/schemas/EducationItem' },
              default: [],
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            projects: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProjectItem' },
              default: [],
            },
            growthEntries: {
              type: 'array',
              items: { $ref: '#/components/schemas/GrowthEntryItem' },
              default: [],
              description: 'Optional career memory records that can be referenced by the generated resume.',
            },
            jobDescription: { $ref: '#/components/schemas/JobDescription' },
          },
        },
        WorkHistoryItem: {
          type: 'object',
          required: ['company', 'title'],
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            company: { type: 'string' },
            title: { type: 'string' },
            location: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            current: { type: 'boolean' },
            description: { type: 'string' },
            achievements: { type: 'array', items: { type: 'string' } },
            skills: { type: 'array', items: { type: 'string' } },
          },
        },
        EducationItem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            school: { type: 'string' },
            major: { type: 'string' },
            degree: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            gpa: { type: 'string' },
            description: { type: 'string' },
          },
        },
        ProjectItem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            url: { type: 'string' },
            tech: { type: 'string' },
            description: { type: 'string' },
          },
        },
        GrowthEntryItem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            date: { type: 'string' },
            type: { type: 'string', enum: ['project', 'metric', 'role', 'feedback', 'skill', 'achievement'] },
            company: { type: 'string' },
            project: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            metrics: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            evidenceUrl: { type: 'string' },
            private: { type: 'boolean' },
          },
        },
        JobDescription: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: {
            company: { type: 'string' },
            title: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' }, default: [] },
            keywords: { type: 'array', items: { type: 'string' }, default: [] },
          },
        },
        ResumeDraftResponse: {
          type: 'object',
          required: ['title', 'data', 'config', 'match', 'generation'],
          properties: {
            requestId: { type: 'string' },
            userId: { type: 'string' },
            title: { type: 'string' },
            data: {
              type: 'object',
              description: 'Resume document data ready for the Resume Tool editor.',
              additionalProperties: true,
            },
            config: {
              type: 'object',
              description: 'Resume rendering and template configuration.',
              additionalProperties: true,
            },
            match: {
              type: 'object',
              required: ['score', 'keywords', 'matchedKeywords', 'selectedExperienceIds', 'selectedExperienceIndexes'],
              properties: {
                score: { type: 'number', minimum: 0, maximum: 100 },
                keywords: { type: 'array', items: { type: 'string' } },
                matchedKeywords: { type: 'array', items: { type: 'string' } },
                selectedExperienceIds: { type: 'array', items: { type: 'string' } },
                selectedExperienceIndexes: { type: 'array', items: { type: 'number' } },
              },
            },
            diff: {
              type: 'array',
              description: 'Structured, field-level changes the generator made (before/after, rationale, confidence, source).',
              items: { $ref: '#/components/schemas/DraftDiffOperation' },
            },
            generation: {
              type: 'object',
              required: ['strategy', 'generatedAt', 'persisted'],
              properties: {
                strategy: {
                  type: 'string',
                  description: 'llm-jd-tailoring-v1 when a real model rewrote the draft, rule-based-jd-tailoring-v1 on the deterministic fallback.',
                  examples: ['llm-jd-tailoring-v1', 'rule-based-jd-tailoring-v1'],
                },
                generatedAt: { type: 'string', format: 'date-time' },
                persisted: { type: 'boolean' },
                documentId: {
                  type: 'string',
                  description: 'Present when persist=true and the draft was saved or replayed.',
                },
                idempotent: {
                  type: 'boolean',
                  description: 'True when this response replays a previously persisted requestId.',
                },
              },
            },
          },
        },
        PlatformRequestLog: {
          type: 'object',
          required: ['id', 'requestId', 'userId', 'matchScore', 'persisted', 'status', 'route', 'latencyMs', 'generatedAt', 'createdAt', 'replayCount'],
          properties: {
            id: { type: 'string' },
            requestId: { type: 'string' },
            userId: { type: 'string' },
            clientId: { type: 'string' },
            documentId: { type: 'string' },
            matchScore: { type: 'number', minimum: 0, maximum: 100 },
            persisted: { type: 'boolean' },
            status: { type: 'string', enum: ['draft', 'persisted', 'failed'] },
            route: { type: 'string' },
            latencyMs: { type: 'number' },
            error: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            replayedAt: { type: 'string', format: 'date-time' },
            replayCount: { type: 'number' },
          },
        },
        DraftDiffOperation: {
          type: 'object',
          required: ['section', 'field', 'before', 'after', 'rationale', 'confidence', 'source'],
          properties: {
            section: { type: 'string', enum: ['summary', 'experience', 'skills', 'projects'] },
            field: { type: 'string', examples: ['personal.summary'] },
            targetId: { type: 'string' },
            before: { type: 'string' },
            after: { type: 'string' },
            rationale: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            source: { type: 'string', enum: ['llm', 'rule-based'] },
          },
        },
        PlatformClientUsage: {
          type: 'object',
          required: ['clientId', 'currency', 'billableRequests', 'failedRequests', 'estimatedCost'],
          properties: {
            clientId: { type: 'string' },
            currency: { type: 'string', examples: ['USD'] },
            pricePerDraft: { type: 'number' },
            totalRequests: { type: 'number' },
            billableRequests: { type: 'number' },
            persistedRequests: { type: 'number' },
            failedRequests: { type: 'number' },
            todayRequests: { type: 'number' },
            quotaPerDay: { type: 'number', nullable: true },
            quotaUtilization: { type: 'number', nullable: true },
            avgLatencyMs: { type: 'number' },
            p95LatencyMs: { type: 'number' },
            estimatedCost: { type: 'number' },
            lastRequestAt: { type: 'string', nullable: true },
          },
        },
        PlatformBillingSummary: {
          type: 'object',
          required: ['generatedAt', 'currency', 'totals', 'clients'],
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            currency: { type: 'string' },
            totals: {
              type: 'object',
              properties: {
                clients: { type: 'number' },
                billableRequests: { type: 'number' },
                failedRequests: { type: 'number' },
                estimatedCost: { type: 'number' },
              },
            },
            clients: {
              type: 'array',
              items: { $ref: '#/components/schemas/PlatformClientUsage' },
            },
          },
        },
        PlatformError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            issues: {
              type: 'array',
              description: 'Present for 400 validation failures.',
              items: {
                type: 'object',
                required: ['path', 'message'],
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    'x-curl-example': 'curl -X POST http://127.0.0.1:8787/api/v1/resume-drafts -H "x-resume-api-key: $RESUME_API_KEY" -H "content-type: application/json" -d @payload.json',
    'x-idempotency': 'When persist=true and requestId repeats, the API returns the original documentId with generation.idempotent=true.',
    'x-authentication': 'Send either x-resume-api-key or Authorization: Bearer <key>. The drafts endpoint requires drafts:write; request logs require requests:read.',
    'x-error-codes': {
      400: 'Validation failed',
      401: 'Platform API key is required',
      403: 'Platform API key is missing scope: <scope>',
      429: 'Platform API daily quota exceeded or Platform API rate limit exceeded',
    },
  }
}
