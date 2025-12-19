
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

import { Session, MemoryStats, WorkLogEntry, SystemStateSnapshot } from './types';
import { generateId } from './utils';

import SideDrawer from './components/SideDrawer';
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

// --- Komponenty Specjalistyczne ---

const WorkLogPanel = ({ logs }: { logs: WorkLogEntry[] }) => (
    <div className="dashboard-panel">
        <div className="panel-header">
            <h3><RegistryIcon/> Wektor Pracy (Log Systemowy)</h3>
            <span className="live-badge sys">REALTIME</span>
        </div>
        <div className="log-viewer">
            {logs.length === 0 ? (
                <div className="log-empty">Brak aktywnych logów w wektorze.</div>
            ) : (
                logs.slice().reverse().map(log => (
                    <div key={log.id} className={`log-entry ${log.type.toLowerCase()}`}>
                        <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="log-msg">[{log.type}] {log.message}</span>
                    </div>
                ))
            )}
        </div>
    </div>
);

const DockerWorkspaceManager = () => (
    <div className="dashboard-panel">
        <div className="panel-header">
            <h3><CodeIcon/> Docker Workspace (Local Disk)</h3>
            <span className="live-badge sys">VIRTUAL MOUNT</span>
        </div>
        <div className="docker-controls">
            <div className="stat-row"><span>Status Środowiska:</span> <span className="status-pill active">Ready</span></div>
            <div className="mount-path">
                <code>/home/user/Dzi-cio/workspace</code>
            </div>
            <div className="vfs-tree">
                <div className="vfs-item">📁 containers/</div>
                <div className="vfs-item">📁 mounts/data</div>
                <div className="vfs-item">📄 docker-compose.yml</div>
            </div>
        </div>
    </div>
);

const ArchitectAdvisor = ({ advice }: { advice?: string }) => (
    <div className="dashboard-panel">
        <div className="panel-header">
            <h3><SparklesIcon/> Architect Advisor</h3>
        </div>
        <div className="advice-content">
            {advice ? (
                <div className="advice-text">{advice}</div>
            ) : (
                <div className="advice-placeholder">Analizuję strukturę pod kątem optymalizacji przed-zapisem...</div>
            )}
        </div>
        <div className="risk-level">Wektor stabilności: <span style={{color: 'var(--success-accent)'}}>100%</span></div>
    </div>
);

// --- Main App ---

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);

  const currentSession = useMemo(() => sessions[currentSessionIndex], [sessions, currentSessionIndex]);

  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
      persistent_usage: 0,
      buffer_usage: 0,
      noise_level: 0,
      is_locked: true,
      external_sources: [],
      vfs_health: 100
  });

  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'deployment' | 'snapshot' | null;
      title: string;
  }>({ isOpen: false, mode: null, title: '' });

  const addLog = useCallback((message: string, type: WorkLogEntry['type'] = 'INFO') => {
      setWorkLog(prev => [...prev, {
          id: generateId(),
          timestamp: Date.now(),
          type,
          message
      }]);
  }, []);

  useEffect(() => {
    addLog("Inicjalizacja ADK Core v3.6. Przygotowano mosty Drive i GitHub.", "INFO");
  }, [addLog]);

  const handleExportState = useCallback(() => {
    const snapshot: SystemStateSnapshot = {
        sessions,
        workLog,
        memoryStats,
        version: "3.6-hybrid",
        exportTimestamp: Date.now()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `adk_state_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog("Wykonano pełny Snapshot systemu do pliku JSON.", "ACTION");
  }, [sessions, workLog, memoryStats, addLog]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const prompt = inputValue;
    setInputValue('');
    setIsLoading(true);
    addLog(`Uruchomienie asymilacji: ${prompt.substring(0, 30)}...`, "ACTION");

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Jesteś ADK Hybrid Architect. Zadanie: "${prompt}".
            Wykorzystaj repo: jarodevil/-Dzi-cio-, 50GB Drive, NotebookLM.
            Zaprojektuj rozwiązanie z uwzględnieniem zapisu na lokalny dysk (Docker).
            Format: JSON. Język: PL (opisy), EN (kod).`,
            config: { 
                tools: [{ codeExecution: {} }],
                responseMimeType: 'application/json',
                systemInstruction: "Działaj jako agent stanowy. Każda Twoja decyzja musi być możliwa do odtworzenia po restarcie systemu."
            }
        });

        const data = JSON.parse(response.text || '{}');
        const newSession: Session = { 
            id: generateId(), prompt, timestamp: Date.now(), workflow: data, is_protected: true 
        };

        setSessions(prev => [...prev, newSession]);
        setCurrentSessionIndex(sessions.length);

        setNodes((data.nodes || []).map((n: any) => ({
            id: n.id,
            type: 'workflowNode',
            data: { label: n.label, description: n.description, type: n.type, advice: n.metadata?.advice },
            position: n.position || { x: Math.random() * 300, y: Math.random() * 300 },
        })));

        setEdges((data.edges || []).map((e: any) => ({
            id: e.id, source: e.source, target: e.target, animated: true, style: { stroke: '#3b82f6' }
        })));
        
        addLog(`Zgenerowano workflow: ${data.name || 'Nowy Projekt'}. Gotowy do zapisu.`, "INFO");

    } catch (e) {
        addLog(`Błąd krytyczny wektora: ${e instanceof Error ? e.message : 'Unknown'}`, "CRITICAL");
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, isLoading, sessions.length, addLog]);

  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  return (
    <div className="immersive-app">
        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}>
            {drawerState.mode === 'deployment' && (
                <div className="deployment-panel">
                    <h3>Docker Manifest (Repo: -Dzi-cio-)</h3>
                    <pre className="code-block"><code>{currentSession?.workflow?.deployment_plan?.docker_compose || "# Czekam na projekt..."}</code></pre>
                </div>
            )}
        </SideDrawer>

        <div className="hud-layer">
            <div className="hud-group">
                <div className="system-status-card">
                    <span className="status-indicator"></span>
                    ADK HYBRID CORE [V-RESTART READY]
                </div>
            </div>
            <div className="hud-group">
                <button className="hud-btn highlight" onClick={handleExportState}>
                    <ShieldIcon /> ZAPISZ STAN (EXPORT JSON)
                </button>
            </div>
        </div>

        <div className="builder-canvas">
            {currentSession?.workflow ? (
                <div className="workflow-canvas-container">
                    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={{workflowNode: ({data}: any) => (
                        <div className="custom-flow-node">
                            <div className="node-header"><CodeIcon/> <span className="node-type-badge">{data.type}</span></div>
                            <h3>{data.label}</h3>
                            <p>{data.description}</p>
                            {data.advice && <div className="node-advice">💡 {data.advice}</div>}
                        </div>
                    )}} fitView>
                        <Background color="#111" gap={25} />
                        <Controls />
                        <Panel position="top-right">
                             <button className="hud-btn" onClick={() => setDrawerState({ isOpen: true, mode: 'deployment', title: 'Manifest Orchestracji' })}>
                                 <RegistryIcon /> Deploy Manifest
                             </button>
                        </Panel>
                    </ReactFlow>
                </div>
            ) : (
                <div className="dashboard-grid">
                    <WorkLogPanel logs={workLog} />
                    <DockerWorkspaceManager />
                    <ArchitectAdvisor advice="Przed restartem systemu zalecane jest wykonanie 'Export JSON' z górnego paska HUD w celu zachowania wektora pracy." />
                    <div className="dashboard-panel full-span">
                        <div className="panel-header"><h3><NetworkIcon/> Mosty Wiedzy (External Storage)</h3></div>
                        <div className="hub-grid">
                            <div className="hub-card active">GitHub (Asymilacja repo)</div>
                            <div className="hub-card active">Google Drive (50GB Volume)</div>
                            <div className="hub-card active">NotebookLM (Knowledge)</div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="command-center-wrapper">
            <div className="command-bar">
                <div className="mode-indicator">{isLoading ? <ThinkingIcon /> : <ChatBubbleIcon />}</div>
                <input 
                    type="text" className="command-input" 
                    placeholder={isLoading ? "Przetwarzanie danych..." : "Wpisz polecenie (np. 'Zaktualizuj wektor pracy o nowe źródła')..."}
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
