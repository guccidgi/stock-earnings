/**
 * Type declarations for MCP Supabase tools
 */

declare module '../mcp/supabase' {
  export type SqlQueryParams = {
    params: {
      ref: string;
      query: string;
    };
  };

  export type McpResponse = {
    data?: {
      details?: {
        result?: any[];
      };
    };
    error?: any;
    successful?: boolean;
  };

  /**
   * Execute a SQL query using the MCP Supabase tool
   */
  export function mcp2_SUPABASE_BETA_RUN_SQL_QUERY(params: SqlQueryParams): Promise<McpResponse>;
}
