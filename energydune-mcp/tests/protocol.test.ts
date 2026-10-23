import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ErrorCode, McpError, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from '../src/server.ts';

const toolNames = ['get_company_info', 'list_product_categories', 'search_products', 'get_enquiry_requirements', 'create_enquiry_draft'];
const categoryIds = ['pcmo', 'hdeo', 'industrial', 'driveline', 'greases', 'energy'];
const buyer = { name: 'Protocol Buyer', company: 'Example Company', email: 'buyer@example.com', requirements: 'Please confirm the suitable grade.' };
const brandNote = 'Brand names identify requested products, not authorised distribution.';
const availabilityNote = 'Availability and specifications confirmed by quotation.';
const timeout = { timeout: 5000 };

// Wire payloads deliberately remain open objects: these assertions verify the
// public MCP response rather than importing the implementation's output types.
type Payload = Record<string, any>;

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args }, undefined, timeout) as CallToolResult;
  const first = result.content[0];
  assert.equal(first?.type, 'text', 'Every result must have JSON text for clients without structuredContent support');
  assert.ok(first && first.type === 'text');
  const payload = JSON.parse(first.text) as Payload;
  assert.deepEqual(result.structuredContent, payload, 'Structured and text results must agree');
  return { result, payload };
}

async function memory(run: (client: Client) => Promise<void>) {
  const server = createMcpServer();
  const client = new Client({ name: 'energydune-protocol-test', version: '1.0.0' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport, timeout);
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

async function fieldError(client: Client, name: string, args: Record<string, unknown>, field: string, code?: string) {
  const { result, payload } = await call(client, name, args);
  assert.equal(result.isError, true);
  assert.equal(payload.status, 'validation_error');
  assert.ok(Array.isArray(payload.field_errors));
  assert.ok(payload.field_errors.some((entry: Payload) => entry.field === field && (!code || entry.code === code)),
    `Expected ${field}/${code ?? '*'}; received ${JSON.stringify(payload.field_errors)}`);
  for (const entry of payload.field_errors) {
    assert.equal(typeof entry.field, 'string');
    assert.equal(typeof entry.code, 'string');
    assert.equal(typeof entry.message, 'string');
    assert.ok(entry.message.length > 0);
  }
  return payload;
}

async function allFiveTools(client: Client) {
  const company = (await call(client, 'get_company_info')).payload;
  assert.equal(company.status, 'ok');
  assert.equal(company.company.legal_name, 'DUNE ENERGY GLOBAL INC.');
  assert.equal(company.company.email, 'info@energydune.com');
  assert.deepEqual(company.company.brands, ['SINOPEC', 'Great Wall Lubricants']);
  assert.equal(company.company.brand_disclaimer, brandNote);

  const list = (await call(client, 'list_product_categories', { lang: 'fr' })).payload;
  assert.equal(list.count, 6);
  assert.equal(list.lang, 'fr');
  assert.deepEqual(list.categories.map((entry: Payload) => entry.id), categoryIds);
  assert.equal(list.categories[0].name, list.categories[0].name_fr);
  assert.equal(list.data_scope, 'category-level');

  const search = (await call(client, 'search_products', { category: 'industrial', brand: 'SINOPEC' })).payload;
  assert.equal(search.status, 'ok');
  assert.equal(search.count, 1);
  assert.equal(search.results[0].id, 'industrial');
  assert.equal(search.requested_brand, 'SINOPEC');
  assert.equal(search.brand_disclaimer, brandNote);
  assert.equal(search.availability_note, availabilityNote);

  const requirements = (await call(client, 'get_enquiry_requirements', { category: 'greases' })).payload;
  assert.equal(requirements.draft_only, true);
  assert.deepEqual(requirements.required_fields.map((entry: Payload) => entry.field), ['name', 'company', 'email', 'requirements']);
  assert.equal(requirements.category_notes.length, 1);
  assert.equal(requirements.category_notes[0].category, 'greases');

  const draft = (await call(client, 'create_enquiry_draft', buyer)).payload;
  assert.equal(draft.status, 'draft');
  assert.equal(draft.draft_only, true);
  assert.equal(draft.sent, false);
  assert.equal(draft.persisted, false);
  assert.equal(draft.summary.category, 'pcmo');
  assert.equal(draft.email.to, 'info@energydune.com');
  assert.equal(draft.email.manual_copy_required, false);
  const mailto = new URL(draft.email.mailto_url);
  assert.equal(mailto.protocol, 'mailto:');
  assert.equal(mailto.pathname, 'info@energydune.com');
  assert.deepEqual([...mailto.searchParams.keys()], ['subject', 'body']);
  assert.equal(mailto.searchParams.get('body'), draft.email.body.replace(/\n/g, '\r\n'));
  assert.equal(draft.brand_disclaimer, brandNote);
  assert.equal(draft.availability_note, availabilityNote);
}

test('official Client initializes and discovers exactly five strict tools with honest annotations', async () => {
  await memory(async (client) => {
    assert.deepEqual(client.getServerVersion(), { name: 'energydune-mcp', version: '0.1.0' });
    assert.match(client.getInstructions() ?? '', /never sends|Never turn a draft/i);
    const { tools } = await client.listTools({}, timeout);
    assert.deepEqual(tools.map(tool => tool.name), toolNames);
    for (const tool of tools) {
      assert.equal(tool.inputSchema.type, 'object');
      assert.equal(tool.inputSchema.additionalProperties, false);
      assert.equal(tool.annotations?.destructiveHint, false);
      assert.equal(tool.annotations?.openWorldHint, false);
      assert.equal(tool.annotations?.readOnlyHint, tool.name !== 'create_enquiry_draft');
    }
    const schema = tools.find(tool => tool.name === 'create_enquiry_draft')!.inputSchema;
    assert.deepEqual(schema.required, ['name', 'company', 'email', 'requirements']);
    const properties = schema.properties as Record<string, Payload>;
    assert.deepEqual(properties.category?.enum, categoryIds);
    assert.equal(properties.requirements?.maxLength, 5000);
  });
});

test('official Client successfully calls all five tools and receives complete draft-only mailto output', async () => {
  await memory(allFiveTools);
});

test('strict MCP schemas return machine-readable missing, unknown, enum, type and length errors', async () => {
  await memory(async (client) => {
    const { email: _email, ...missingEmail } = buyer;
    await fieldError(client, 'create_enquiry_draft', missingEmail, 'email', 'required');
    await fieldError(client, 'get_company_info', { unexpected: true }, '_request', 'unrecognized_keys');
    await fieldError(client, 'create_enquiry_draft', { ...buyer, category: 'fictional' }, 'category');
    await fieldError(client, 'search_products', { brand: 'Unlisted brand' }, 'brand');
    await fieldError(client, 'list_product_categories', { segment: 'fictional' }, 'segment');
    await fieldError(client, 'get_company_info', { lang: 'zh' }, 'lang');
    await fieldError(client, 'create_enquiry_draft', { ...buyer, name: 42 }, 'name', 'invalid_type');
    await fieldError(client, 'create_enquiry_draft', { ...buyer, requirements: 'x'.repeat(5001) }, 'requirements');
    await fieldError(client, 'create_enquiry_draft', { ...buyer, documents_requested: ['SDS', 'SDS', 'SDS'] }, 'documents_requested');
  });
});

test('MCP preserves raw short fields until prefix/suffix controls and malformed Unicode are rejected', async () => {
  await memory(async (client) => {
    for (const control of ['\t', '\n', '\r', '\u0000', '\u0085', '\u2028']) {
      for (const value of [`${control}Buyer`, `Buyer${control}`]) {
        await fieldError(client, 'create_enquiry_draft', { ...buyer, name: value }, 'name', 'control_characters');
      }
    }
    for (const field of ['company', 'email', 'product_reference', 'viscosity_or_grade', 'specification_or_oem', 'quantity_packaging', 'destination']) {
      await fieldError(client, 'create_enquiry_draft', { ...buyer, [field]: 'value\n' }, field, 'control_characters');
    }
    for (const field of ['name', 'requirements', 'product_reference']) {
      await fieldError(client, 'create_enquiry_draft', { ...buyer, [field]: 'Text\uD800' }, field, 'invalid_unicode');
    }
    await fieldError(client, 'search_products', { query: 'Text\uDC00' }, 'query', 'invalid_unicode');
  });
});

test('MCP business errors stay localized and whitespace is never accepted as a required value', async () => {
  await memory(async (client) => {
    await fieldError(client, 'create_enquiry_draft', { ...buyer, email: 'not an address' }, 'email', 'invalid_email');
    const errors = await fieldError(client, 'create_enquiry_draft', { ...buyer, name: '   ', lang: 'fr' }, 'name', 'required');
    assert.match(errors.field_errors.find((entry: Payload) => entry.field === 'name').message, /Veuillez/);
    const draft = (await call(client, 'create_enquiry_draft', { ...buyer, name: '  Buyer  ', email: ' buyer@example.com ', requirements: '  First line\r\nSecond 🌍 line  ', lang: 'fr' })).payload;
    assert.equal(draft.summary.name, 'Buyer');
    assert.equal(draft.summary.email, 'buyer@example.com');
    assert.equal(draft.summary.requirements, 'First line\nSecond 🌍 line');
    assert.ok(draft.email.body.endsWith('First line\nSecond 🌍 line'));
    assert.equal(draft.lang, 'fr');
    assert.match(draft.next_step, /Vérifiez/);
    assert.match(draft.email.body, /Your requirements:/, 'Send-ready email remains English per contract');
  });
});

test('complete professional drafts encode body data without extra mail headers and preserve long fallback text', async () => {
  await memory(async (client) => {
    const requirements = 'Check grade & quantity?\nCc: never@example.com\nÉnergie 🌍';
    const full = (await call(client, 'create_enquiry_draft', {
      ...buyer, requirements, category: 'industrial', brand: 'Great Wall Lubricants',
      product_reference: 'Reference A & B', viscosity_or_grade: 'ISO VG 46', specification_or_oem: 'Confirm specification',
      quantity_packaging: '4 drums', destination: 'Example port', documents_requested: ['TDS/PDS', 'SDS'],
    })).payload;
    assert.equal(full.status, 'draft');
    assert.equal(full.summary.requirements, requirements);
    assert.deepEqual(full.summary.documents_requested, ['TDS / PDS', 'SDS']);
    const mailto = new URL(full.email.mailto_url);
    assert.equal(mailto.pathname, 'info@energydune.com');
    assert.deepEqual([...mailto.searchParams.keys()], ['subject', 'body']);
    assert.equal(mailto.searchParams.get('body'), full.email.body.replace(/\n/g, '\r\n'));
    assert.equal(full.email.manual_copy_required, false);
    const longText = 'é'.repeat(5000);
    const long = (await call(client, 'create_enquiry_draft', { ...buyer, requirements: longText, lang: 'fr' })).payload;
    assert.equal(long.email.manual_copy_required, true);
    assert.deepEqual([...new URL(long.email.mailto_url).searchParams.keys()], ['subject']);
    assert.equal(long.summary.requirements, longText);
    assert.ok(long.email.body.endsWith(longText));
    assert.match(long.next_step, /Copiez le texte intégral/);
    assert.equal(long.sent, false);
    assert.equal(long.persisted, false);
  });
});

test('unknown products and brand-only searches never fabricate available product records', async () => {
  await memory(async (client) => {
    for (const args of [{ query: 'Definitely nonexistent oil XYZ-999' }, { brand: 'SINOPEC' }]) {
      const payload = (await call(client, 'search_products', args)).payload;
      assert.equal(payload.status, 'ok');
      assert.equal(payload.count, 0);
      assert.deepEqual(payload.results, []);
      assert.equal(payload.brand_disclaimer, brandNote);
      assert.equal(payload.availability_note, availabilityNote);
    }
  });
});

test('unknown tools remain protocol errors and independent clients cannot share request state', async () => {
  await memory(async (client) => {
    await assert.rejects(client.callTool({ name: 'send_email', arguments: buyer }, undefined, timeout), (error: unknown) => {
      assert.ok(error instanceof McpError);
      assert.equal(error.code, ErrorCode.InvalidParams);
      assert.match(error.message, /Unknown tool/);
      return true;
    });
    assert.equal((await call(client, 'get_company_info')).payload.status, 'ok', 'Protocol error must not poison later calls');
  });
  await Promise.all(['en', 'fr'].map(lang => memory(async client => {
    const value = (await call(client, 'get_company_info', { lang })).payload;
    assert.equal(value.lang, lang);
  })));
});

const endpoint = process.env.MCP_TEST_ENDPOINT;
test('optional real HTTP: official StreamableHTTPClientTransport initializes and calls all five tools', { skip: endpoint ? false : 'Set MCP_TEST_ENDPOINT to exercise a running Wrangler HTTP endpoint.' }, async () => {
  assert.ok(endpoint);
  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  const client = new Client({ name: 'energydune-http-protocol-test', version: '1.0.0' }, { capabilities: {} });
  try {
    await client.connect(transport, timeout);
    assert.equal(client.getServerVersion()?.name, 'energydune-mcp');
    assert.equal(transport.sessionId, undefined, 'Stateless server must not issue a session ID');
    assert.ok(transport.protocolVersion);
    const { tools } = await client.listTools({}, timeout);
    assert.deepEqual(tools.map(tool => tool.name), toolNames);
    await allFiveTools(client);
    await fieldError(client, 'create_enquiry_draft', { name: 'Buyer', company: 'Example', requirements: 'Check grade' }, 'email', 'required');
    await fieldError(client, 'create_enquiry_draft', { ...buyer, name: '\nBuyer' }, 'name', 'control_characters');
  } finally {
    await client.close();
  }
});
