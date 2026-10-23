import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolRequestSchema, ErrorCode, McpError, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker-provider.js';
import { z } from 'zod';
import { getCompanyInfo, listProductCategories, searchProducts, getEnquiryRequirements } from './tools/catalogue.ts';
import { createEnquiryDraft } from './tools/enquiry.ts';

export const SERVER_VERSION = '0.1.0';
const language = z.enum(['en', 'fr']).optional().describe('Language for category information and messages; defaults to English.');
const category = z.enum(['pcmo', 'hdeo', 'industrial', 'driveline', 'greases', 'energy']);
const brand = z.enum(['SINOPEC', 'Great Wall Lubricants']);
const segment = z.enum(['Automotive', 'Commercial', 'Industrial', 'Energy']);
// Preserve raw strings until business validation rejects control characters;
// trimming here would silently remove forbidden leading/trailing newlines.
const shortText = () => z.string().min(1).max(254);
const constraints = 'Category-level information only. Availability and specifications confirmed by quotation. Never claim prices, lead times, stock, authorised distribution, brand affiliation, certifications or contact details absent from the public data.';
type ToolDefinition = { name: string; title: string; description: string; schema: z.ZodObject; draft?: boolean; run: (args: unknown) => unknown };

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_company_info', title: 'Dune company information',
    description: `Read public company information, supported product segments, requested brands, the brand disclaimer and contact email. ${constraints}`,
    schema: z.object({ lang: language }).strict(), run: getCompanyInfo,
  },
  {
    name: 'list_product_categories', title: 'List lubricant and energy categories',
    description: `Read the six public categories, optionally filtered by application segment. These are categories, not a SKU catalogue. ${constraints}`,
    schema: z.object({ lang: language, segment: segment.optional() }).strict(), run: listProductCategories,
  },
  {
    name: 'search_products', title: 'Search category information',
    description: `Match a product query, category and application to public category information. Unknown products return no invented matches. Brand is a requested brand, not a supply guarantee; a brand alone is not a product search. ${constraints}`,
    schema: z.object({ lang: language, query: z.string().min(1).max(500).optional(), category: category.optional(), brand: brand.optional(), application: shortText().optional() }).strict(), run: searchProducts,
  },
  {
    name: 'get_enquiry_requirements', title: 'Get quotation request requirements',
    description: `Read enquiry fields and category-specific specification questions, with available document request types. No document, approval, availability or quotation is supplied by this tool. ${constraints}`,
    schema: z.object({ lang: language, category: category.optional() }).strict(), run: getEnquiryRequirements,
  },
  {
    name: 'create_enquiry_draft', title: 'Prepare an enquiry draft only', draft: true,
    description: `Validate the caller's details and generate an enquiry summary, English email body and mailto link. Calling this tool transmits the supplied details to the hosting service for transient processing. It never sends email, stores the enquiry, places orders or takes payments. Missing category defaults to pcmo like the website. Long email bodies must be copied manually. ${constraints}`,
    schema: z.object({
      lang: language, name: shortText(), company: shortText(), email: shortText(), requirements: z.string().min(1).max(5000),
      category: category.optional(), brand: brand.optional(), product_reference: shortText().optional(), viscosity_or_grade: shortText().optional(),
      specification_or_oem: shortText().optional(), quantity_packaging: shortText().optional(), destination: shortText().optional(),
      documents_requested: z.array(z.enum(['TDS/PDS', 'TDS / PDS', 'SDS'])).max(2).optional(),
    }).strict(), run: createEnquiryDraft,
  },
];

function result(value: unknown): CallToolResult {
  const payload = value as Record<string, unknown>;
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload, ...(payload.status === 'validation_error' ? { isError: true } : {}) };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'energydune-mcp', version: SERVER_VERSION }, {
    jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
    instructions: `DUNE ENERGY GLOBAL INC. provides public category information and enquiry drafts only. ${constraints} The contact is info@energydune.com. Return the quotation and brand disclaimers. Explain that all results are category-level, including when comparing oils. Never turn a draft into a submitted enquiry, order or payment. The user sends any email themselves. Do not request personal details for public catalogue tools. Before a draft call, explain that its provided details are processed transiently by this MCP hosting service and can also be handled by the calling client under its own policy. Do not claim that absence of application storage means no personal data processing or no platform retention. Match the user's language using the provided English and French category information.`,
  });
  for (const tool of TOOL_DEFINITIONS) {
    server.registerTool(tool.name, {
      title: tool.title, description: tool.description, inputSchema: tool.schema,
      annotations: { readOnlyHint: !tool.draft, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (args) => result(tool.run(args)));
  }
  // Keep required input schemas in tools/list while preserving machine-readable
  // field errors, which the SDK's default validation handler reduces to text.
  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOL_DEFINITIONS.find((entry) => entry.name === request.params.name);
    if (!tool) throw new McpError(ErrorCode.InvalidParams, 'Unknown tool.');
    const args = request.params.arguments ?? {};
    const parsed = tool.schema.safeParse(args);
    if (!parsed.success) {
      return result({ status: 'validation_error', field_errors: parsed.error.issues.map((issue) => ({
        field: issue.path.map(String).join('.') || '_request',
        code: issue.code === 'invalid_type' && issue.path.length > 0 && args[String(issue.path[0])] === undefined ? 'required' : issue.code,
        message: issue.message,
      })) });
    }
    return result(tool.run(parsed.data));
  });
  return server;
}
