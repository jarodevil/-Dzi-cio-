
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    ReactFlow,
    Background, 
    Controls, 
    applyNodeChanges, 
    applyEdgeChanges, 
    Panel,
    type Node, 
    type Edge, 
    type OnNodesChange, 
    type OnEdgesChange 
} from 'reactflow';

import { 
    Session, 
    MemoryStats, 
    WorkLogEntry, 
    SystemStateSnapshot, 
    ServerStatus, 
    ResearchResult, 
    GroundingSource 
} from './types';
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

const ServerMonitor = ({ status }: { status: ServerStatus }) => (
    <div className={`dashboard-panel server-monitor ${status.is_running ? 'online' : 'offline'}`}>
        <div className="panel-header">
            <h3><NetworkIcon/> ADK API Server</h3>
            <span className={`live-badge ${status.is_running ? 'active' : ''}`}>
                {status.is_running ? 'RUNNING' : 'STOPPED'}
            </span>
        </div>
        <div className="server-details">
            <div className="stat-row"><span>Port:</span> <code>{status.port}</code></div>
            <div className="stat-row"><span>Log Level:</span> <span className="log-badge">{status.log_level.toUpperCase()}</span></div>
            <div className="uptime-bar">
                <div className="uptime-label">Uptime: {Math.floor(status.uptime / 60)}m {status.uptime % 60}s</div>
                <div className="uptime-track"><div className="uptime-fill" style={{width: status.is_running ? '100%' : '0%'}}></div></div>
            </div>
        </div>
    </div>
);

const WorkLogPanel = ({ logs }: { logs: WorkLogEntry[] }) => (
    <div className="dashboard-panel log-panel">
        <div className="panel-header">
            <h3><RegistryIcon/> Konsola Systemowa</h3>
            <span className="live-badge sys">MONITOR</span>
        </div>
        <div className="log-viewer terminal-mode">
            {logs.length === 0 ? (
                <div className="log-empty">System IDLE. Oczekiwanie na wektor pracy...</div>
            ) : (
                logs.slice(-50).map(log => (
                    <div key={log.id} className={`log-entry ${log.type.toLowerCase()}`}>
                        <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="log-msg">[{log.type}] {log.message}</span>
                    </div>
                ))
            )}
        </div>
    </div>
);

const IntelPanel = ({ research }: { research: ResearchResult | null }) => (
    <div className="dashboard-panel intel-panel">
        <div className="panel-header">
            <h3><SparklesIcon/> Live Intel (Search Grounding)</h3>
            {research && <span className="live-badge sys">LATEST</span>}
        </div>
        <div className="intel-content">
            {!research ? (
                <div className="intel-placeholder">
                    Wykorzystaj polecenie z prefiksem <code>search:</code> aby pobrać aktualne dane z sieci.
                </div>
            ) : (
                <>
                    <div className="intel-text">{research.text}</div>
                    <div className="intel-sources">
                        <h4>Źródła uziemienia:</h4>
                        <ul>
                            {research.sources.map((source, idx) => (
                                <li key={idx}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer">
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    </div>
);

// --- Main App ---

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);
  
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
      is_running: false,
      port: 8080,
      agents_dir: 'agents/',
      active_agents: 0,
      uptime: 0,
      log_level: 'standard'
  });

  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
      persistent_usage: 124,
      buffer_usage: 5,
      noise_level: 42,
      is_locked: false,
      external_sources: [],
      vfs_health: 100
  });

  const addLog = useCallback((message: string, type: WorkLogEntry['type'] = 'INFO') => {
      setWorkLog(prev => [...prev, {
          id: generateId(),
          timestamp: Date.now(),
          type,
          message
      }]);
  }, []);

  const handleResearch = useCallback(async (query: string) => {
    setIsLoading(true);
    addLog(`Inicjalizacja Search Grounding dla: ${query}`, "ACTION");
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: query,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "Brak odpowiedzi tekstowej.";
        const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.filter(chunk => chunk.web)
            .map(chunk => ({
                title: chunk.web!.title || "Bez tytułu",
                uri: chunk.web!.uri
            })) || [];

        setResearchResult({
            text,
            sources,
            timestamp: Date.now()
        });

        addLog(`Pobrano dane z ${sources.length} źródeł zewnętrznych.`, "INFO");
    } catch (error) {
        addLog(`Błąd Search Grounding: ${error instanceof Error ? error.message : String(error)}`, "CRITICAL");
    } finally {
        setIsLoading(false);
    }
  }, [addLog]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const prompt = inputValue.trim();
    setInputValue('');

    // Check for search prefix
    if (prompt.toLowerCase().startsWith('search:')) {
        await handleResearch(prompt.substring(7).trim());
        return;
    }

    // Default flow: Architectural AI
    setIsLoading(true);
    addLog(`Uruchomienie asymilacji architektury: ${prompt.substring(0, 30)}...`, "ACTION");

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Jesteś ADK Hybrid Architect. Zadanie: "${prompt}". 
            Zaprojektuj rozwiązanie z uwzględnieniem infrastruktury Docker.
            Odpowiedz w formacie JSON z polami: nodes (tablica węzłów), edges (tablica krawędzi), name (nazwa projektu).`,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const data = JSON.parse(response.text || '{}');
        const newSession: Session = { 
            id: generateId(), prompt, timestamp: Date.now(), workflow: data, is_protected: true 
        };

        setSessions(prev => [...prev, newSession]);
        setCurrentSessionIndex(sessions.length);

        setNodes((data.nodes || []).map((n: any) => ({
            id: n.id || generateId(),
            type: 'default',
            data: { label: n.label || 'Node' },
            position: n.position || { x: Math.random() * 400, y: Math.random() * 400 },
        })));

        setEdges((data.edges || []).map((e: any) => ({
            id: e.id || generateId(),
            source: e.source,
            target: e.target,
            animated: true
        })));

        addLog(`Wygenerowano nowy workflow: ${data.name || 'Projekt bez nazwy'}`, "INFO");
    } catch (error) {
        addLog(`Błąd generowania workflow: ${error instanceof Error ? error.message : String(error)}`, "CRITICAL");
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, isLoading, addLog, handleResearch, sessions.length]);

  const handleCleanupAndRest = useCallback(() => {
    setIsLoading(true);
    addLog("Inicjalizacja procedury Deep Cleanup...", "ACTION");
    
    setTimeout(() => {
        setWorkLog(prev => {
            const crucial = prev.filter(l => l.type === 'ACTION' || l.type === 'CRITICAL');
            const recent = prev.filter(l => l.type === 'INFO').slice(-5);
            return [...crucial, ...recent].sort((a,b) => a.timestamp - b.timestamp);
        });

        setMemoryStats(prev => ({
            ...prev,
            noise_level: 0,
            buffer_usage: 0,
            is_locked: true
        }));

        addLog("Pamięć oczyszczona. Wektor pracy ustabilizowany.", "INFO");
        setIsLoading(false);
        setIsResting(true);
    }, 1500);
  }, [addLog]);

  const handleExportState = useCallback(() => {
    const snapshot: SystemStateSnapshot = {
        sessions,
        workLog,
        memoryStats,
        serverStatus,
        version: "3.9-grounded",
        exportTimestamp: Date.now()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `adk_grounded_snapshot.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog("Eksportowano stan z uziemionymi danymi.", "ACTION");
  }, [sessions, workLog, memoryStats, serverStatus, addLog]);

  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  if (isResting) {
      return (
          <div className="rest-mode-overlay">
              <div className="rest-card">
                  <div className="rest-header">
                      <ShieldIcon />
                      <h2>SYSTEM STABILIZED</h2>
                  </div>
                  <div className="rest-body">
                      <p>Wszystkie procesy zostały wstrzymane. Pamięć jest czysta.</p>
                      <button className="export-btn-large" onClick={handleExportState}>
                          POBIERZ SNAPSHOT & RESTARTUJ
                      </button>
                      <button className="back-btn" onClick={() => setIsResting(false)}>WRÓC DO EDYCJI</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="immersive-app">
        <div className="hud-layer">
            <div className="hud-group">
                <div className="system-status-card">
                    <span className={`status-indicator pulse`}></span>
                    ADK CORE v3.9 [GROUNDING ENABLED]
                </div>
            </div>
            <div className="hud-group">
                <button className="hud-btn cleanup-btn" onClick={handleCleanupAndRest} disabled={isLoading}>
                    <SparklesIcon /> OCZYŚĆ I ODPOCZNIJ
                </button>
                <button className="hud-btn highlight" onClick={handleExportState}>
                    <ShieldIcon /> SNAPSHOT JSON
                </button>
            </div>
        </div>

        <div className="builder-canvas">
            {currentSessionIndex >= 0 ? (
                <div className="workflow-canvas-container">
                    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
                        <Background color="#111" gap={25} />
                        <Controls />
                        <Panel position="top-right">
                             <button className="hud-btn" onClick={() => setCurrentSessionIndex(-1)}>
                                 <RegistryIcon /> Dashboard
                             </button>
                        </Panel>
                    </ReactFlow>
                </div>
            ) : (
                <div className="dashboard-grid">
                    <ServerMonitor status={serverStatus} />
                    <IntelPanel research={researchResult} />
                    <WorkLogPanel logs={workLog} />
                    <div className="dashboard-panel memory-card">
                        <div className="panel-header"><h3><ThinkingIcon/> Stan Pamięci</h3></div>
                        <div className="memory-stats-container">
                            <div className="stat-row"><span>Szum:</span> <span>{memoryStats.noise_level}%</span></div>
                            <div className="gauge"><div className="gauge-fill" style={{width: `${memoryStats.noise_level}%`}}></div></div>
                            <div className="stat-row"><span>Wektor:</span> <span>STABILNY</span></div>
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
                    placeholder="Wpisz komendę lub 'search: [pytanie]' aby użyć Search Grounding..."
                    value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                />
                <button className="cmd-btn" onClick={handleSendMessage} disabled={isLoading}><ArrowUpIcon /></button>
            </div>
        </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
