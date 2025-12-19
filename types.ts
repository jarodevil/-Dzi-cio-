
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type NodeType = 
  | 'LLM_REASONER' 
  | 'A2A_REMOTE_AGENT' 
  | 'ADK_ROOT_SERVER'
  | 'INFRA_PLUGIN'
  | 'TOOL_EXECUTOR';

export type ProtocolType = 'A2A' | 'MCP' | 'ADK_INTERNAL';

export interface AgentFile {
  name: string;
  content: string;
  language: 'python' | 'json' | 'bash';
}

// Added Artifact interface to resolve the import error in ArtifactCard.tsx
export interface Artifact {
  id: string;
  styleName: string;
  html: string;
  status: 'streaming' | 'complete';
}

export interface NodeMetadata {
  endpoint_url?: string;
  port?: number;
  files?: AgentFile[];
  agent_card?: any;
  config?: {
    port: number;
    a2a_enabled: boolean;
    session_uri: string;
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
  deployment_plan: {
    orchestrator_cmd: string;
    worker_cmds: { name: string; cmd: string }[];
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface SystemStatus {
  adk_installed: boolean;
  python_version: string;
  active_ports: number[];
}

export interface Session {
  id: string;
  prompt: string;
  timestamp: number;
  workflow: AgentWorkflow | null;
}
