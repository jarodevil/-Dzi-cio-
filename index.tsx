
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ReactFlow, { 
    Background, 
    Controls, 
    MiniMap, 
    Node, 
    Edge, 
    applyNodeChanges, 
    applyEdgeChanges, 
    OnNodesChange, 
    OnEdgesChange,
    Panel
} from 'reactflow';

import { Session, MemoryStats } from './types';
import { generateId } from './utils';

import SideDrawer from './components/SideDrawer';
// Added RegistryIcon to the import list below
import { 
    ArrowUpIcon, 
    NetworkIcon,
    ThinkingIcon,
    SparklesIcon,
    ChatBubbleIcon,
    ShieldIcon,
    CodeIcon,
    RegistryIcon
} from './components/Icons';

// --- Custom Node Component for ReactFlow ---
const WorkflowNodeComponent = ({ data }: { data: { label: string, description: string, type: string } }) => {
    return (
        <div className="custom-flow-node">
            <div className="node-header">
                <CodeIcon />
                <span className="node-type-badge">{data.type}</span>
            </div>
            <div className="node-body">
                <h3>{data.label}</h3>
                <p>{data.description}</p>
            </div>
        </div>
    );
};

const nodeTypes = {
    workflowNode: WorkflowNodeComponent,
};

// --- Dashboard Components ---

const MemoryMonitor = ({ stats, onCleanup }: { stats: MemoryStats, onCleanup: () => void }) => {
    return (
        <div className="dashboard-panel">
            <div className="panel-header">
                <h3><ShieldIcon/> Zarządzanie Pamięcią i CLM</h3>
                <span className={`live-badge ${stats.is_locked ? 'locked' : ''}`}>
                    {stats.is_locked ? 'BRAMKA ZABLOKOWANA' : 'SESJA OTWARTA'}
                </span>
            </div>
            <div className="memory-stats">
                <div className="stat-row">
                    <span>Magazyn Trwały (Hard-Save)</span>
                    <span>{stats.persistent_usage} KB</span>
                </div>
                <div className="gauge-container">
                    <div className="gauge-fill" style={{ width: `${Math.min(100, stats.persistent_usage / 5)}%` }}></div>
                </div>
                
                <div className="stat-row" style={{ marginTop: 12 }}>
                    <span>Dynamiczny Bufor Operacyjny</span>
                    <span>{stats.buffer_usage} obj.</span>
                </div>
                <div className="gauge-container">
                    <div className="gauge-fill buffer" style={{ width: `${Math.min(100, stats.buffer_usage * 2)}%` }}></div>
                </div>

                <div className="stat-row" style={{ marginTop: 12 }}>
                    <span>Poziom Szumu Komunikacyjnego</span>
                    <span style={{ color: stats.noise_level > 70 ? 'var(--danger-accent)' : 'inherit' }}>
                        {stats.noise_level}%
                    </span>
                </div>
                
                <button 
                    className="cleanup-btn" 
                    onClick={onCleanup}
                    disabled={stats.noise_level < 10}
                >
                    Dekontaminacja Szumu (Flush Temp)
                </button>
            </div>
        </div>
    );
};

const PythonRuntimeMonitor = ({ lastExecution }: { lastExecution?: { code: string, result: string } }) => (
    <div className="dashboard-panel">
        <div className="panel-header">
            <h3><CodeIcon/> Silnik Gemini Python</h3>
            <span className="live-badge sys">RUNNING</span>
        </div>
        <div className="terminal-mini">
            {lastExecution ? (
                <>
                    <div style={{color: '#8b5cf6', fontSize: '0.7rem'}}># Python Source:</div>
                    <code>{lastExecution.code}</code>
                    <div style={{color: '#10b981', marginTop: 10, borderTop: '1px solid #333', fontSize: '0.7rem'}}># Output:</div>
                    <code>{lastExecution.result}</code>
                </>
            ) : (
                <code style={{opacity: 0.5}}>Czekam na zadanie obliczeniowe...</code>
            )}
        </div>
    </div>
);

const KnowledgeHub = () => (
    <div className="dashboard-panel full-span">
        <div className="panel-header">
            <h3><NetworkIcon/> Knowledge Gate & Integracje</h3>
        </div>
        <div className="hub-grid">
            <a href="https://drive.google.com" target="_blank" className="hub-card"><span>Google Drive (API)</span></a>
            <a href="https://gemini.google.com" target="_blank" className="hub-card"><span>Gemini Advanced</span></a>
            <div className="hub-card sys"><span>Vector Store: IndexedDB</span></div>
        </div>
    </div>
);

// --- Main App ---

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastExecution, setLastExecution] = useState<{ code: string, result: string } | undefined>(undefined);
  
  // React Flow State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Memory State
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
      persistent_usage: 0,
      buffer_usage: 0,
      noise_level: 5,
      is_locked: false
  });

  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'deployment' | 'files' | null;
      title: string;
  }>({ isOpen: false, mode: null, title: '' });

  // Update memory stats periodically
  useEffect(() => {
    const updateStats = () => {
        const usage = JSON.stringify(sessions).length / 1024;
        setMemoryStats(prev => ({
            ...prev,
            persistent_usage: Math.round(usage * 10) / 10,
            buffer_usage: sessions.length + (lastExecution ? 5 : 0),
            noise_level: Math.min(100, prev.noise_level + (isLoading ? 5 : 0.1))
        }));
    };
    const timer = setInterval(updateStats, 2000);
    return () => clearInterval(timer);
  }, [sessions, lastExecution, isLoading]);

  const handleCleanup = () => {
      setMemoryStats(prev => ({ ...prev, noise_level: 0 }));
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    
    if (memoryStats.noise_level > 90) {
        alert("Krytyczny poziom szumu! Wykonaj dekontaminację przed kolejnym zadaniem.");
        return;
    }

    const prompt = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Wykonaj zadanie projektowe: "${prompt}". 
            Użyj Python do obliczeń jeśli to konieczne. 
            Finalną strukturę AgentWorkflow zwróć w JSON. 
            Język opisowy: POLSKI. Język techniczny: ANGIELSKI.
            Węzły powinny mieć typ 'workflowNode' dla poprawnego renderowania.`,
            config: { 
                tools: [{ codeExecution: {} }],
                responseMimeType: 'application/json'
            }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const execPart = parts.find(p => p.executableCode);
        const resPart = parts.find(p => p.codeExecutionResult);

        if (execPart && resPart) {
            setLastExecution({
                code: execPart.executableCode!.code,
                result: resPart.codeExecutionResult!.output
            });
        }

        const data = JSON.parse(response.text || '{}');
        const newSession: Session = { 
            id: generateId(), 
            prompt, 
            timestamp: Date.now(), 
            workflow: data,
            is_protected: true
        };

        setSessions(prev => [...prev, newSession]);
        setCurrentSessionIndex(sessions.length);

        // Map to React Flow format
        const rfNodes: Node[] = (data.nodes || []).map((n: any) => ({
            id: n.id,
            type: 'workflowNode',
            data: { label: n.label, description: n.description, type: n.type },
            position: n.position || { x: Math.random() * 400, y: Math.random() * 400 },
        }));

        const rfEdges: Edge[] = (data.edges || []).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: '#3b82f6' },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);

    } catch (e) {
        console.error("ADK Engine Failure:", e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, isLoading, sessions.length, memoryStats.noise_level]);

  const currentSession = sessions[currentSessionIndex];

  return (
    <div className="immersive-app">
        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}>
            {drawerState.mode === 'deployment' && (
                <div className="deployment-panel">
                    <pre className="code-block"><code>{currentSession?.workflow?.deployment_plan.orchestrator_cmd}</code></pre>
                </div>
            )}
        </SideDrawer>

        <div className="hud-layer">
            <div className="hud-group">
                <div className="system-status-card">
                    <span className="status-indicator"></span>
                    ADK Visual Core v3.1 [Safety-Locked]
                </div>
                <div className="system-search-bar">
                    <span className="search-icon">🔍</span>
                    <input type="text" placeholder="Szukaj w bazie wiedzy..." />
                </div>
            </div>
            <div className="hud-group">
                <button className="hud-btn" onClick={() => setMemoryStats(p => ({...p, is_locked: !p.is_locked}))}>
                    <ShieldIcon /> {memoryStats.is_locked ? 'Pamięć Chroniona' : 'Zwolnij Blokadę'}
                </button>
            </div>
        </div>
        
        <div className="builder-canvas">
            {currentSession?.workflow ? (
                <div className="workflow-canvas-container">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background color="#1e293b" gap={20} />
                        <Controls />
                        <MiniMap 
                            nodeColor={(n) => '#3b82f6'} 
                            maskColor="rgba(0, 0, 0, 0.5)"
                            style={{ background: '#0a0a0c' }}
                        />
                        <Panel position="top-right">
                             <button className="hud-btn" onClick={() => setDrawerState({ isOpen: true, mode: 'deployment', title: 'Manifest Wdrożenia' })}>
                                 <RegistryIcon /> Manifest
                             </button>
                        </Panel>
                    </ReactFlow>
                </div>
            ) : (
                <div className="dashboard-grid">
                    <MemoryMonitor stats={memoryStats} onCleanup={handleCleanup} />
                    <PythonRuntimeMonitor lastExecution={lastExecution} />
                    <KnowledgeHub />
                </div>
            )}
        </div>

        <div className="command-center-wrapper">
            <div className="command-bar">
                <div className="mode-indicator">{isLoading ? <ThinkingIcon /> : <ChatBubbleIcon />}</div>
                <input 
                    type="text" className="command-input" 
                    placeholder={isLoading ? "Renderowanie wizualizacji..." : "Zaprojektuj mesh agentowy (np. 'Mesh logistyczny')..."}
                    value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                />
                <button className="cmd-btn" onClick={() => handleSendMessage()} disabled={isLoading}><ArrowUpIcon /></button>
            </div>
        </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
