
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
  | 'STORAGE_BRIDGE' 
  | 'DOCKER_CONTAINER' 
  | 'ARCHITECT_ADVISOR' 
  | 'API_GATEWAY';

export type ProtocolType = 'A2A' | 'MCP' | 'DOCKER_VVOL' | 'LOCAL_MOUNT' | 'HTTP_REST';

export interface DockerConfig {
  image: string;
  volumes: string[];
  ports: string[];
  env: Record<string, string>;
  restart: 'always' | 'no' | 'unless-stopped';
}

export interface WorkLogEntry {
  id: string;
  timestamp: number;
  type: 'INFO' | 'ACTION' | 'WARNING' | 'CRITICAL' | 'VERBOSE' | 'DEBUG';
  message: string;
  vector_hash?: string;
}

export interface ServerStatus {
  is_running: boolean;
  port: number;
  agents_dir: string;
  active_agents: number;
  uptime: number;
  log_level: 'standard' | 'verbose';
}

export interface MemoryStats {
  persistent_usage: number; // KB
  buffer_usage: number; // items
  noise_level: number; // 0-100
  is_locked: boolean;
  external_sources: any[];
  vfs_health: number; // 0-100
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  position: { x: number; y: number };
  protocol: ProtocolType;
  metadata: {
    docker_config?: DockerConfig;
    vfs_path?: string;
    advice?: string;
    repo_url?: string;
    api_endpoint?: string;
  };
}

export interface AgentWorkflow {
  id: string;
  name: string;
  deployment_plan: {
    docker_compose: string;
    setup_script: string;
  };
  nodes: WorkflowNode[];
  edges: any[];
}

export interface Session {
  id: string;
  prompt: string;
  timestamp: number;
  workflow: AgentWorkflow | null;
  is_protected: boolean;
}

export interface Artifact {
  id: string;
  styleName: string;
  status: 'streaming' | 'complete';
  html: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ResearchResult {
  text: string;
  sources: GroundingSource[];
  timestamp: number;
}

export interface SystemStateSnapshot {
  sessions: Session[];
  workLog: WorkLogEntry[];
  memoryStats: MemoryStats;
  serverStatus: ServerStatus;
  version: string;
  exportTimestamp: number;
}

export interface LearningMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
