
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

import { AgentWorkflow, Session, WorkflowNode, SystemStatus, AgentFile, ContextCacheConfig, WorkflowEdge } from './types';
import { generateId } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import SideDrawer from './components/SideDrawer';
import { 
    CodeIcon, 
    ArrowUpIcon, 
    NetworkIcon,
    RegistryIcon,
    ShieldIcon,
    ThinkingIcon
} from './components/Icons';

// Icons
const ReflectionIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
        <path d="M12 8v4l3 3"/>
    </svg>
);

const LearningIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <path d="M9 6h6"/>
        <path d="M9 10h6"/>
    </svg>
);

const ToolIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
);

const SystemConsole = ({ status }: { status: SystemStatus }) => (
    <div className="system-console">
        <div className="console-line"><span className="prompt">$</span> adk --version <span className="output">1.2.4</span></div>
        <div className="console-line"><span className="prompt">$</span> active nodes <span className="output">{status.active_ports.length}</span></div>
        <div className="console-line active-pulse">● Mesh Ready: Bezier Flow Enabled</div>
    </div>
);

const CacheConfigView = ({ config }: { config: ContextCacheConfig }) => (
    <div className="cache-config-chip">
        <div className="cache-header">CACHE POLICY</div>
        <div className="cache-grid">
            <div className="cache-item"><span>TTL</span><strong>{config.ttl_seconds}s</strong></div>
            <div className="cache-item"><span>MIN TOKENS</span><strong>{config.min_tokens}</strong></div>
            <div className="cache-item"><span>INTERVALS</span><strong>{config.cache_intervals}</strong></div>
        </div>
    </div>
);

const AgentNode = ({ node, globalCache }: { node: WorkflowNode, globalCache?: ContextCacheConfig }) => {
    const isRemote = node.type === 'A2A_REMOTE_AGENT';
    const isRoot = node.type === 'ADK_ROOT_SERVER';
    const isReflection = node.type === 'PLUGIN_REFLECTION';
    const isLearning = node.type === 'PLUGIN_LEARNING';
    const isTool = node.type === 'TOOL_EXECUTOR';
    
    let color = 'var(--a2a-color)';
    let Icon = NetworkIcon;

    if (isRemote) color = '#f43f5e';
    if (node.type === 'INFRA_PLUGIN') color = 'var(--infra-color)';
    if (isReflection) {
        color = '#8b5cf6';
        Icon = ReflectionIcon;
    }
    if (isLearning) {
        color = '#10b981';
        Icon = LearningIcon;
    }
    if (isTool) {
        color = '#f59e0b';
        Icon = ToolIcon;
    }

    return (
        <div className={`workflow-node node-type-${node.type.toLowerCase()}`} style={{ left: node.position.x, top: node.position.y, borderColor: color }}>
            <div className="node-header">
                <span className="node-icon-inline" style={{ color }}><Icon /></span>
                <span className="node-type-label">{node.type.replace('PLUGIN_', '').replace('_', ' ')}</span>
                {node.metadata.port && <span className="port-tag">:{node.metadata.port}</span>}
            </div>
            <div className="node-body">
                <div className="node-title">{node.label}</div>
                <div className="node-desc">{node.description}</div>
                {isRoot && globalCache && <CacheConfigView config={globalCache} />}
                {isReflection && <div className="plugin-meta-badge">Auto-Retry Active</div>}
                {isLearning && <div className="plugin-meta-badge">Cross-Agent Memory</div>}
                {isTool && <div className="plugin-meta-badge">Function Hosting</div>}
            </div>
            {isRemote && node.metadata.endpoint_url && (
                <div className="node-url-badge">{node.metadata.endpoint_url}</div>
            )}
        </div>
    );
};

// Edge Component for Bezier Curves
const FlowEdge = ({ 
    edge, 
    source, 
    target, 
    isSelected, 
    onClick 
}: { 
    edge: WorkflowEdge, 
    source: WorkflowNode, 
    target: WorkflowNode, 
    isSelected: boolean,
    onClick: () => void
}) => {
    const x1 = source.position.x + 120;
    const y1 = source.position.y + 45;
    const x2 = target.position.x + 120;
    const y2 = target.position.y + 45;

    // Calculate bezier control points for a smooth S-curve
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const offset = Math.max(dx / 2, 50);
    
    const pathData = `M ${x1},${y1} C ${x1 + offset},${y1} ${x2 - offset},${y2} ${x2},${y2}`;

    const isPluginEdge = source.type.startsWith('PLUGIN_') || target.type.startsWith('PLUGIN_');
    const isToolEdge = source.type === 'TOOL_EXECUTOR' || target.type === 'TOOL_EXECUTOR';
    
    let color = 'var(--a2a-color)';
    if (isPluginEdge) color = 'var(--infra-color)';
    if (isToolEdge) color = '#f59e0b';

    return (
        <g className={`edge-group ${isSelected ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Wider transparent path for easier clicking */}
            <path d={pathData} className="edge-click-target" />
            <path 
                d={pathData} 
                className={`edge-path ${isPluginEdge ? 'plugin-flow' : 'a2a-flow'}`} 
                style={{ stroke: color }}
                markerEnd={`url(#arrowhead-${color.replace(/[^\w]/g, '')})`}
            />
            
            <defs>
                <marker 
                    id={`arrowhead-${color.replace(/[^\w]/g, '')}`} 
                    markerWidth="10" 
                    markerHeight="7" 
                    refX="9" 
                    refY="3.5" 
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                </marker>
            </defs>
        </g>
    );
};

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'deployment' | 'files' | 'card' | 'edge' | null;
      title: string;
      activeNodeId?: string;
      activeEdgeId?: string;
  }>({ isOpen: false, mode: null, title: '' });

  const workflowSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      context_cache_config: {
        type: Type.OBJECT,
        properties: {
          min_tokens: { type: Type.INTEGER },
          ttl_seconds: { type: Type.INTEGER },
          cache_intervals: { type: Type.INTEGER }
        },
        required: ['min_tokens', 'ttl_seconds', 'cache_intervals']
      },
      deployment_plan: {
        type: Type.OBJECT,
        properties: {
          orchestrator_cmd: { type: Type.STRING },
          worker_cmds: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { name: { type: Type.STRING }, cmd: { type: Type.STRING } } 
            } 
          }
        }
      },
      nodes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: [
                'ADK_ROOT_SERVER', 
                'A2A_REMOTE_AGENT', 
                'INFRA_PLUGIN', 
                'TOOL_EXECUTOR',
                'PLUGIN_REFLECTION',
                'PLUGIN_LEARNING'
            ] },
            label: { type: Type.STRING },
            description: { type: Type.STRING },
            position: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } },
            metadata: {
              type: Type.OBJECT,
              properties: {
                port: { type: Type.NUMBER },
                endpoint_url: { type: Type.STRING },
                files: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      content: { type: Type.STRING },
                      language: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      },
      edges: { 
        type: Type.ARRAY, 
        items: { 
            type: Type.OBJECT, 
            properties: { 
                id: { type: Type.STRING },
                source: { type: Type.STRING }, 
                target: { type: Type.STRING },
                protocol: { type: Type.STRING, enum: ['A2A', 'MCP', 'ADK_INTERNAL'] }
            } 
        } 
      }
    },
    required: ['name', 'context_cache_config', 'deployment_plan', 'nodes', 'edges']
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const prompt = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Architect a PRODUCTION ADK System. 
            Requirement: "${prompt}". 
            
            RULES FOR SYSTEM ARCHITECTURE:
            1. Use 'TOOL_EXECUTOR' if the mesh requires specific function calling, database access, or computation tools.
            2. Integrate 'PLUGIN_REFLECTION' if error handling is requested.
            3. Integrate 'PLUGIN_LEARNING' for shared global state.
            4. Connect 'ADK_ROOT_SERVER' as the primary orchestrator.
            5. Ensure all Edges have a unique ID.
            6. CACHE CONFIG: 'min_tokens': 100, 'ttl_seconds': 3600, and 'cache_intervals': 5.`,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: workflowSchema
            }
        });

        const data = JSON.parse(response.text || '{}');
        setSessions(prev => [...prev, { id: generateId(), prompt, timestamp: Date.now(), workflow: data }]);
        setCurrentSessionIndex(sessions.length);

    } catch (e) {
        console.error("ADK Production Error", e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, isLoading, sessions.length]);

  const currentSession = sessions[currentSessionIndex];
  
  const activeNode = useMemo(() => 
    currentSession?.workflow?.nodes.find(n => n.id === drawerState.activeNodeId), 
  [currentSession, drawerState.activeNodeId]);

  const activeEdge = useMemo(() =>
    currentSession?.workflow?.edges.find(e => e.id === selectedEdgeId),
  [currentSession, selectedEdgeId]);

  return (
    <>
        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
        >
            {drawerState.mode === 'deployment' && (
                <div className="deployment-panel">
                    <div className="cache-overview-drawer">
                        <h3>Mesh Optimization Summary</h3>
                        {currentSession?.workflow?.context_cache_config && (
                            <CacheConfigView config={currentSession.workflow.context_cache_config} />
                        )}
                        <div className="plugin-list-status">
                            {currentSession?.workflow?.nodes.some(n => n.type === 'PLUGIN_REFLECTION') && <span className="status-badge reflection">Reflection Active</span>}
                            {currentSession?.workflow?.nodes.some(n => n.type === 'PLUGIN_LEARNING') && <span className="status-badge learning">Global Learning Active</span>}
                        </div>
                    </div>

                    <h3 style={{marginTop: '24px'}}>Deployment Flow</h3>
                    {currentSession?.workflow?.deployment_plan.worker_cmds.map(w => (
                        <div key={w.name} className="cmd-group">
                            <label>{w.name}</label>
                            <pre className="cli-block"><code>{w.cmd}</code></pre>
                        </div>
                    ))}
                    <pre className="cli-block accent"><code>{currentSession?.workflow?.deployment_plan.orchestrator_cmd}</code></pre>
                </div>
            )}

            {drawerState.mode === 'edge' && activeEdge && (
                <div className="edge-info-panel">
                    <div className="protocol-badge">{activeEdge.protocol || 'A2A Protocol'}</div>
                    <div className="flow-description">
                        From: <strong>{currentSession?.workflow?.nodes.find(n => n.id === activeEdge.source)?.label}</strong><br/>
                        To: <strong>{currentSession?.workflow?.nodes.find(n => n.id === activeEdge.target)?.label}</strong>
                    </div>
                    <p className="edge-meta">This edge handles bidirectional streaming of reasoning tokens and tool-call interrupts.</p>
                </div>
            )}

            {drawerState.mode === 'files' && activeNode && (
                <div className="files-panel">
                    {activeNode.metadata.files?.map(f => (
                        <div key={f.name} className="file-entry">
                            <h4>{f.name}</h4>
                            <pre className="code-block"><code>{f.content}</code></pre>
                        </div>
                    ))}
                </div>
            )}
        </SideDrawer>

        <div className="immersive-app production-studio" onClick={() => setSelectedEdgeId(null)}>
            <DottedGlowBackground gap={50} speedScale={0.15} color="rgba(244, 63, 94, 0.05)" glowColor="rgba(0, 112, 243, 0.2)" />
            
            <div className="builder-canvas">
                {currentSession?.workflow ? (
                    <div className="workflow-canvas">
                        <svg className="edge-layer">
                            {currentSession.workflow.edges.map((edge, i) => {
                                const s = currentSession.workflow!.nodes.find(n => n.id === edge.source);
                                const t = currentSession.workflow!.nodes.find(n => n.id === edge.target);
                                if (!s || !t) return null;
                                
                                return (
                                    <FlowEdge 
                                        key={edge.id || i}
                                        edge={edge}
                                        source={s}
                                        target={t}
                                        isSelected={selectedEdgeId === edge.id}
                                        onClick={() => {
                                            setSelectedEdgeId(edge.id);
                                            setDrawerState({ isOpen: true, mode: 'edge', title: 'Connection Details', activeEdgeId: edge.id });
                                        }}
                                    />
                                );
                            })}
                        </svg>
                        {currentSession.workflow.nodes.map(node => (
                            <div key={node.id} onClick={(e) => { e.stopPropagation(); setDrawerState({ isOpen: true, mode: 'files', title: `Source: ${node.label}`, activeNodeId: node.id }); }}>
                                <AgentNode node={node} globalCache={currentSession.workflow?.context_cache_config} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="welcome-hero">
                        <h1>ADK <span>Production Studio</span></h1>
                        <p>Architect and Deploy Multi-Agent A2A Systems</p>
                        <SystemConsole status={{ adk_installed: true, python_version: '3.11', active_ports: [] }} />
                    </div>
                )}
            </div>

            <div className={`action-bar ${currentSession ? 'visible' : ''}`}>
                 <div className="action-buttons">
                    <button onClick={() => setDrawerState({ isOpen: true, mode: 'deployment', title: 'Full Deployment Plan' })}><RegistryIcon /> Deploy Mesh</button>
                    <button><NetworkIcon /> A2A Graph</button>
                    <button className="accent-btn">Export SDK Project</button>
                 </div>
            </div>

            <div className="floating-input-container">
                <div className="input-wrapper">
                    <input type="text" placeholder="e.g. 'Build a mesh with Tool Executor for SQL queries...'" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                    <button className="send-button" onClick={handleSendMessage} disabled={isLoading}><ArrowUpIcon /></button>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
