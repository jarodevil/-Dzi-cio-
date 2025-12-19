
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { AgentWorkflow, Session, WorkflowNode, SystemStatus, ContextCacheConfig, WorkflowEdge } from './types';
import { generateId } from './utils';

import SideDrawer from './components/SideDrawer';
import { 
    ArrowUpIcon, 
    NetworkIcon,
    RegistryIcon,
    ThinkingIcon,
    SparklesIcon,
    ChatBubbleIcon,
    ShieldIcon
} from './components/Icons';

// --- Icon Components (Inline) ---
const ReflectionIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 8v4l3 3"/></svg>
);
const LearningIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 6h6"/><path d="M9 10h6"/></svg>
);
const ToolIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
);
const ServerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
);
const CloudIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
);
const DatabaseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s 9-1.34 9-3V5"></path></svg>
);

// --- Dashboard Components ---

const NetworkMonitor = () => {
    // Fake live data simulation
    const [latency, setLatency] = useState<number[]>([12, 15, 14, 18, 12, 10, 15, 22, 18, 15]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(prev => [...prev.slice(1), Math.floor(Math.random() * 20) + 10]);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-panel net-monitor">
            <div className="panel-header">
                <h3><ServerIcon/> Monitor Sieci i Proxy</h3>
                <span className="live-badge">ONLINE</span>
            </div>
            <div className="monitor-grid">
                <div className="stat-row">
                    <span>Bramka WEB (WSS)</span>
                    <div className="status-pill active">Połączono</div>
                </div>
                <div className="stat-row">
                    <span>Serwer MCP (Port 3000)</span>
                    <div className="status-pill warning">Oczekiwanie</div>
                </div>
                <div className="stat-row">
                    <span>VPN Tunel (A2A)</span>
                    <div className="status-pill active">Szyfrowany</div>
                </div>
                <div className="latency-graph">
                    <div className="graph-bars">
                        {latency.map((h, i) => (
                            <div key={i} className="bar" style={{height: `${h * 2}px`}}></div>
                        ))}
                    </div>
                    <span className="latency-label">Opóźnienie: {latency[latency.length-1]}ms</span>
                </div>
            </div>
        </div>
    );
};

const KnowledgeHub = () => {
    return (
        <div className="dashboard-panel knowledge-hub">
            <div className="panel-header">
                <h3><DatabaseIcon/> Źródła Wiedzy i Zasoby</h3>
            </div>
            <div className="hub-grid">
                <a href="#" className="hub-card" onClick={e => e.preventDefault()}>
                    <CloudIcon />
                    <div className="hub-info">
                        <strong>Google Drive</strong>
                        <span>Zaindeksowano: 450 plików</span>
                    </div>
                </a>
                <a href="#" className="hub-card" onClick={e => e.preventDefault()}>
                    <div className="icon-box nb">NB</div>
                    <div className="hub-info">
                        <strong>NotebookLM</strong>
                        <span>Podłączono 3 notatniki</span>
                    </div>
                </a>
                <a href="https://gemini.google.com/" target="_blank" rel="noreferrer" className="hub-card gemini-link">
                    <SparklesIcon />
                    <div className="hub-info">
                        <strong>Gemini Advanced</strong>
                        <span>Bezpośredni dostęp</span>
                    </div>
                </a>
                <div className="hub-card system">
                    <div className="icon-box sys">SYS</div>
                    <div className="hub-info">
                        <strong>Magazyn Lokalny</strong>
                        <span>Wektory: 1.2GB (Gotowy)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SystemSearch = () => (
    <div className="system-search-bar">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Szukaj w logach, agentach i dokumentacji..." />
        <span className="shortcut-hint">CTRL+K</span>
    </div>
);

// --- Existing UI Components ---

const CacheConfigView = ({ config }: { config: ContextCacheConfig }) => (
    <div className="cache-config-chip" style={{ marginTop: 8, fontSize: '0.7rem', opacity: 0.8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
            <span>TTL: <strong>{config.ttl_seconds}s</strong></span>
            <span>Min: <strong>{config.min_tokens}</strong></span>
        </div>
    </div>
);

const AgentNode = ({ 
    node, 
    globalCache,
    onMouseDown,
    learningMode
}: { 
    node: WorkflowNode, 
    globalCache?: ContextCacheConfig,
    onMouseDown?: (e: React.MouseEvent) => void,
    learningMode: boolean
}) => {
    const isRemote = node.type === 'A2A_REMOTE_AGENT';
    const isRoot = node.type === 'ADK_ROOT_SERVER';
    const isReflection = node.type === 'PLUGIN_REFLECTION';
    const isLearning = node.type === 'PLUGIN_LEARNING';
    const isTool = node.type === 'TOOL_EXECUTOR';
    
    let color = 'var(--primary-accent)';
    let Icon = NetworkIcon;
    let hintText = "Standardowy Węzeł Przetwarzania";

    if (isRemote) { color = 'var(--danger-accent)'; hintText = "Zewnętrzny Punkt Końcowy Agenta (HTTP)"; }
    if (node.type === 'INFRA_PLUGIN') { color = 'var(--infra-color)'; hintText = "Moduł Infrastruktury Systemowej"; }
    if (isReflection) {
        color = 'var(--infra-accent)';
        Icon = ReflectionIcon;
        hintText = "Pętla Samokorekty i Błędów";
    }
    if (isLearning) {
        color = 'var(--tool-accent)';
        Icon = LearningIcon;
        hintText = "Współdzielony Magazyn Kontekstu";
    }
    if (isTool) {
        color = 'var(--tool-accent)';
        Icon = ToolIcon;
        hintText = "Deterministyczny Wykonawca Funkcji";
    }

    return (
        <div 
            className={`workflow-node`} 
            style={{ left: node.position.x, top: node.position.y, color: color }}
            onMouseDown={onMouseDown}
        >
            {learningMode && <div className="learning-tooltip">{hintText}</div>}
            
            <div className="node-header">
                <div style={{display:'flex', alignItems:'center', gap: 8}}>
                    <Icon />
                    <span className="node-type-badge" style={{ color: color }}>{node.type.replace('PLUGIN_', '').replace('_', ' ')}</span>
                </div>
                {node.metadata.port && <span style={{fontSize: '0.7rem', opacity: 0.5, fontFamily: 'monospace'}}>:{node.metadata.port}</span>}
            </div>
            
            <div className="node-body">
                <h3>{node.label}</h3>
                <div className="node-desc">{node.description}</div>
                {isRoot && globalCache && <CacheConfigView config={globalCache} />}
            </div>

            {isRemote && node.metadata.endpoint_url && (
                <div style={{ fontSize: '0.65rem', marginTop: 8, padding: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4, wordBreak: 'break-all' }}>
                    {node.metadata.endpoint_url}
                </div>
            )}
        </div>
    );
};

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
    const x1 = source.position.x + 130;
    const y1 = source.position.y + 60;
    const x2 = target.position.x + 130;
    const y2 = target.position.y + 60;

    const dx = Math.abs(x2 - x1);
    const offset = Math.max(dx / 2, 80);
    const pathData = `M ${x1},${y1} C ${x1 + offset},${y1} ${x2 - offset},${y2} ${x2},${y2}`;

    const isPluginEdge = source.type.startsWith('PLUGIN_') || target.type.startsWith('PLUGIN_');
    const color = isPluginEdge ? 'var(--infra-accent)' : 'var(--primary-accent)';

    return (
        <g className={`edge-group ${isSelected ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <path d={pathData} className="edge-click-target" />
            <path 
                d={pathData} 
                className="edge-path" 
                style={{ stroke: color, strokeDasharray: isPluginEdge ? '5,5' : 'none' }}
                fill="none"
                strokeWidth="2"
            />
            <circle cx={x2} cy={y2} r="3" fill={color} />
        </g>
    );
};

// --- Main Application ---

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [learningMode, setLearningMode] = useState<boolean>(false);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'deployment' | 'files' | 'card' | 'edge' | 'tools' | null;
      title: string;
      activeNodeId?: string;
      activeEdgeId?: string;
  }>({ isOpen: false, mode: null, title: '' });

  const [dragState, setDragState] = useState<{
      nodeId: string;
      startX: number;
      startY: number;
      initialNodeX: number;
      initialNodeY: number;
      hasMoved: boolean;
  } | null>(null);

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
                tool_definitions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            parameters: { type: Type.STRING, description: "JSON string of params" }
                        }
                    }
                },
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

  const handleSendMessage = useCallback(async (msg?: string) => {
    const prompt = msg || inputValue;
    if (!prompt.trim() || isLoading) return;
    setInputValue('');
    setIsLoading(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            // Prompting primarily in English for logic accuracy, but requesting Polish output content
            contents: `Zaprojektuj system produkcyjny ADK. 
            Wymaganie użytkownika: "${prompt}". 
            
            RULES FOR SYSTEM ARCHITECTURE (Internal Logic):
            1. Use 'TOOL_EXECUTOR' if the mesh requires specific function calling, database access, or computation tools.
            2. If 'TOOL_EXECUTOR' is used, you MUST populate 'tool_definitions' metadata with 2-3 realistic function signatures (JSON string for params).
            3. Integrate 'PLUGIN_REFLECTION' if error handling is requested.
            4. Integrate 'PLUGIN_LEARNING' for shared global state.
            5. Connect 'ADK_ROOT_SERVER' as the primary orchestrator.
            6. CACHE CONFIG: 'min_tokens': 100, 'ttl_seconds': 6600, and 'cache_intervals': 5.
            
            OUTPUT REQUIREMENT:
            - Provide all 'label' and 'description' fields in POLISH language.
            - Provide function descriptions in POLISH language.
            - Keep code (filenames, commands, types) in ENGLISH.`,
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

  // Node Dragging Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({
        nodeId: node.id,
        startX: e.clientX,
        startY: e.clientY,
        initialNodeX: node.position.x,
        initialNodeY: node.position.y,
        hasMoved: false
    });
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (!dragState.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        setDragState(prev => prev ? ({ ...prev, hasMoved: true }) : null);
    }

    if (dragState.hasMoved || Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        const newX = dragState.initialNodeX + dx;
        const newY = dragState.initialNodeY + dy;

        setSessions(prev => {
            const newSessions = [...prev];
            const session = newSessions[currentSessionIndex];
            if (!session?.workflow) return prev;
            const nodes = [...session.workflow.nodes];
            const nodeIndex = nodes.findIndex(n => n.id === dragState.nodeId);
            if (nodeIndex === -1) return prev;
            nodes[nodeIndex] = { ...nodes[nodeIndex], position: { x: newX, y: newY } };
            session.workflow = { ...session.workflow, nodes };
            return newSessions;
        });
    }
  };

  const handleGlobalMouseUp = () => {
    if (dragState) {
        if (!dragState.hasMoved) {
            const node = currentSession?.workflow?.nodes.find(n => n.id === dragState.nodeId);
            if (node) {
                setDrawerState({ isOpen: true, mode: 'files', title: `Źródło Węzła: ${node.label}`, activeNodeId: node.id });
            }
        }
        setDragState(null);
    }
  };

  return (
    <>
        {/* --- Side Drawer --- */}
        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
        >
            {drawerState.mode === 'deployment' && (
                <div className="deployment-panel">
                    <div style={{marginBottom: 20}}>
                        <h3 style={{color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1}}>Optymalizacja</h3>
                        {currentSession?.workflow?.context_cache_config && (
                            <CacheConfigView config={currentSession.workflow.context_cache_config} />
                        )}
                    </div>
                    {currentSession?.workflow?.deployment_plan.worker_cmds.map(w => (
                        <div key={w.name} style={{marginBottom: 16}}>
                            <label style={{display:'block', marginBottom: 4, fontSize: '0.8rem', color: 'var(--primary-accent)'}}>{w.name}</label>
                            <pre className="code-block"><code>{w.cmd}</code></pre>
                        </div>
                    ))}
                    <label style={{display:'block', marginBottom: 4, fontSize: '0.8rem', color: '#fff'}}>Orkiestrator (Główny)</label>
                    <pre className="code-block" style={{borderColor: 'var(--primary-accent)'}}><code>{currentSession?.workflow?.deployment_plan.orchestrator_cmd}</code></pre>
                </div>
            )}
             {drawerState.mode === 'files' && activeNode && (
                <div className="files-panel">
                    {activeNode.metadata.tool_definitions && activeNode.metadata.tool_definitions.length > 0 && (
                        <div className="tools-section">
                            <h3 style={{fontSize:'0.8rem', color:'var(--tool-accent)', marginBottom: 8}}>Dostępne Funkcje</h3>
                            {activeNode.metadata.tool_definitions.map((tool, idx) => (
                                <div key={idx} className="tool-entry">
                                    <div className="tool-name">{tool.name}<span>()</span></div>
                                    <div className="tool-desc">{tool.description}</div>
                                    <div className="tool-params"><strong>Parametry:</strong> {tool.parameters}</div>
                                </div>
                            ))}
                            <div className="divider-line"></div>
                        </div>
                    )}
                    {activeNode.metadata.files?.map(f => (
                        <div key={f.name} className="file-entry" style={{marginBottom: 20}}>
                            <h4 style={{marginBottom:8, color:'var(--primary-accent)'}}>{f.name}</h4>
                            <pre className="code-block"><code>{f.content}</code></pre>
                        </div>
                    ))}
                </div>
            )}
        </SideDrawer>

        <div className="immersive-app" onClick={() => setSelectedEdgeId(null)} onMouseMove={handleGlobalMouseMove} onMouseUp={handleGlobalMouseUp}>
            {/* Background removed as requested */}

            {/* --- HUD Layer --- */}
            <div className="hud-layer">
                <div className="hud-group">
                    <div className="system-status-card">
                        <span className="status-indicator"></span>
                        Silnik ADK v2.1 <span style={{opacity:0.5, marginLeft: 8}}>|</span> Gotowy
                    </div>
                    <SystemSearch />
                </div>
                <div className="hud-group">
                    <button className={`hud-btn ${learningMode ? 'active' : ''}`} onClick={() => setLearningMode(!learningMode)}>
                        <SparklesIcon /> {learningMode ? 'Tryb Nauki' : 'Podpowiedzi'}
                    </button>
                    {currentSession?.workflow && (
                         <button className="hud-btn" onClick={() => setDrawerState({ isOpen: true, mode: 'deployment', title: 'Manifest Wdrożeniowy' })}>
                             <RegistryIcon /> Wdróż
                         </button>
                    )}
                </div>
            </div>
            
            {/* --- Canvas / Dashboard --- */}
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
                                            setDrawerState({ isOpen: true, mode: 'edge', title: 'Szczegóły Połączenia', activeEdgeId: edge.id });
                                        }}
                                    />
                                );
                            })}
                        </svg>
                        {currentSession.workflow.nodes.map(node => (
                            <AgentNode 
                                key={node.id} 
                                node={node} 
                                globalCache={currentSession.workflow?.context_cache_config}
                                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                learningMode={learningMode}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        <NetworkMonitor />
                        <KnowledgeHub />
                    </div>
                )}
            </div>

            {/* --- Floating Command Center --- */}
            <div className="command-center-wrapper">
                {learningMode && (
                    <div className="command-hints">
                        <span className="hint-chip" onClick={() => handleSendMessage("Zbuduj bezpieczną sieć bankową")}>Sieć Bankowa</span>
                        <span className="hint-chip" onClick={() => handleSendMessage("Utwórz pętlę refleksji błędów")}>Pętla Refleksji</span>
                        <span className="hint-chip" onClick={() => handleSendMessage("Wdróż zdalnych agentów A2A")}>Agenci Zdalni</span>
                    </div>
                )}
                <div className="command-bar">
                    <div className="mode-indicator">
                        {isLoading ? <ThinkingIcon /> : <ChatBubbleIcon />}
                    </div>
                    <input 
                        type="text" 
                        className="command-input" 
                        placeholder={isLoading ? "Projektowanie systemu..." : "Opisz wymagania systemu..."}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isLoading}
                    />
                    <div className="command-actions">
                        <button className="cmd-btn" onClick={() => handleSendMessage()} disabled={isLoading}>
                            <ArrowUpIcon />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
