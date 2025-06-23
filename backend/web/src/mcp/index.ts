import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodType } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
const mcp = new McpServer({ name: 'AtCoder MCPServer', version: '0.1.0' });
import './contests';

const replacer = (key: string, value: any) =>
    typeof value === 'bigint' ? value.toString() : value;

export function jsonResponse(data: any): CallToolResult {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(data, replacer),
            },
        ],
    };
}

type ToolDef<Schema extends ZodType<any>> = {
    name: string;
    description: string;
    schema: Schema;
    handler: (args: z.infer<Schema>, extra?: unknown) => Promise<CallToolResult>;
};

export function createTools(tools: ToolDef<any>[]) {
    for (const { name, description, schema, handler } of tools) {
        mcp.tool(name, description, schema, handler);
    }
}
export default mcp;
