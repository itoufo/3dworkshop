#!/usr/bin/env node
/**
 * Workshop API MCP Server
 * Provides read-only access to workshop data via the public API
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const API_BASE = process.env.WORKSHOP_API_URL || 'http://localhost:3000';

class WorkshopApiServer {
  constructor() {
    this.server = new Server(
      {
        name: 'workshop-api-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_workshops',
          description: 'List all workshops. Optionally filter by category ID.',
          inputSchema: {
            type: 'object',
            properties: {
              category_id: {
                type: 'string',
                description: 'Filter by workshop category ID (UUID)',
              },
            },
          },
        },
        {
          name: 'get_workshop',
          description: 'Get details of a specific workshop by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Workshop ID (UUID)',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_categories',
          description: 'List all workshop categories.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_workshops':
            return await this.listWorkshops(args);
          case 'get_workshop':
            return await this.getWorkshop(args);
          case 'list_categories':
            return await this.listCategories();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async fetchApi(path) {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error ${response.status}: ${body}`);
    }
    return response.json();
  }

  async listWorkshops(args) {
    const params = args?.category_id ? `?category_id=${args.category_id}` : '';
    const result = await this.fetchApi(`/api/workshops${params}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async getWorkshop(args) {
    if (!args?.id) {
      throw new Error('Workshop ID is required');
    }
    const result = await this.fetchApi(`/api/workshops/${args.id}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async listCategories() {
    const result = await this.fetchApi('/api/workshops/categories');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Workshop API MCP Server running on stdio');
  }
}

const server = new WorkshopApiServer();
server.run().catch(console.error);
