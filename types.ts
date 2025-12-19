
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type NodeType = 
  | 'LLM_REASONER' 
  | 'A2A_REMOTE_AGENT' 
  | 'ADK_ROOT_SERVER'
  | 'INFRA_PLUGIN'
  | 'TOOL_EXECUTOR'
  | 'PLUGIN_REFLECTION'
  | 'PLUGIN_LEARNING';

export type ProtocolType = 'A2A' | 'MCP' | 'ADK_INTERNAL';

export interface MemoryStats {
  persistent_usage: number; // KB
  buffer_usage: number; // items
  noise_level: number; // 0-100
  is_locked: boolean;
}

export interface AgentFile {
  name: string;
  content: string;
  language: 'python' | 'json' | 'bash';
}

export interface Artifact {
  id: string;
  styleName: string;
  html: string;
  status: 'streaming' | 'complete';
}

export interface ContextCacheConfig {
  min_tokens: number;
  ttl_seconds: number;
  cache_intervals: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: string;
}

export interface NodeMetadata {
  endpoint_url?: string;
  port?: number;
  files?: AgentFile[];
  agent_card?: any;
  tool_definitions?: ToolDefinition[];
  cache_config?: ContextCacheConfig;
  plugin_config?: {
    retry_count?: number;
    learning_scope?: 'global' | 'session';
    instruction_set?: string;
  };
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  position: { x: number; y: number };
  protocol: ProtocolType;
  metadata: NodeMetadata;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  protocol: ProtocolType;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  context_cache_config: ContextCacheConfig;
  deployment_plan: {
    orchestrator_cmd: string;
    worker_cmds: { name: string; cmd: string }[];
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Session {
  id: string;
  prompt: string;
  timestamp: number;
  workflow: AgentWorkflow | null;
  is_protected: boolean;
}
