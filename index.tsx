
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

import { AgentWorkflow, Session, WorkflowNode, SystemStatus, AgentFile } from './types';
import { generateId } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import SideDrawer from './components/SideDrawer';
import { 
    CodeIcon, 
    ArrowUpIcon, 
    NetworkIcon,
    RegistryIcon,
    ShieldIcon
} from './components/Icons';

const SystemConsole = ({ status }: { status: SystemStatus }) => (
    <div className="system-console">
        <div className="console-line"><span className="prompt">$</span> adk --version <span className="output">1.2.4</span></div>
        <div className="console-line"><span className="prompt">$</span> active nodes <span className="output">{status.active_ports.length}</span></div>
        <div className="console-line active-pulse">● Multi-Agent A2A Mesh Ready</div>
    </div>
);

const AgentNode = ({ node }: { node: WorkflowNode }) => {
    const isRemote = node.type === 'A2A_REMOTE_AGENT';
    const isRoot = node.type === 'ADK_ROOT_SERVER';
    
    let color = 'var(--a2a-color)';
    if (isRemote) color = '#f43f5e'; // Rose for remote
    if (node.type === 'INFRA_PLUGIN') color = 'var(--infra-color)';

    return (
        <div className={`workflow-node node-type-${node.type.toLowerCase()}`} style={{ left: node.position.x, top: node.position.y, borderColor: color }}>
            <div className="node-header">
                <span className="node-type-label">{node.type.replace('_', ' ')}</span>
                {node.metadata.port && <span className="port-tag">:{node.metadata.port}</span>}
            </div>
            <div className="node-body">
                <div className="node-title">{node.label}</div>
                <div className="node-desc">{node.description}</div>
            </div>
            {isRemote && node.metadata.endpoint_url && (
                <div className="node-url-badge">{node.metadata.endpoint_url}</div>
            )}
        </div>
    );
};

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'deployment' | 'files' | 'card' | null;
      title: string;
      activeNodeId?: string;
  }>({ isOpen: false, mode: null, title: '' });

  const workflowSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
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
            type: { type: Type.STRING, enum: ['ADK_ROOT_SERVER', 'A2A_REMOTE_AGENT', 'INFRA_PLUGIN', 'TOOL_EXECUTOR'] },
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
                },
                agent_card: { type: Type.OBJECT }
              }
            }
          }
        }
      },
      edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING } } } }
    },
    required: ['name', 'deployment_plan', 'nodes', 'edges']
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
            
            STRUCTURE RULES:
            1. Use 'A2A_REMOTE_AGENT' for sub-agents (e.g. dice roller, prime checker).
            2. For remote agents, generate 'agent.py' using 'to_a2a()' and start command with 'uvicorn'.
            3. For the root agent, use 'A2ARemoteA2aAgent' to connect to remote ones.
            4. Root command MUST use 'adk api_server --a2a --port 8000'.
            5. Provide full Python code in 'metadata.files'.`,
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

  return (
    <>
        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
        >
            {drawerState.mode === 'deployment' && (
                <div className="deployment-panel">
                    <h3>Step 1: Start Remote Workers</h3>
                    {currentSession?.workflow?.deployment_plan.worker_cmds.map(w => (
                        <div key={w.name} className="cmd-group">
                            <label>{w.name}</label>
                            <pre className="cli-block"><code>{w.cmd}</code></pre>
                        </div>
                    ))}
                    
                    <h3 style={{marginTop: '24px'}}>Step 2: Start Orchestrator</h3>
                    <pre className="cli-block accent"><code>{currentSession?.workflow?.deployment_plan.orchestrator_cmd}</code></pre>
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

        <div className="immersive-app production-studio">
            <DottedGlowBackground gap={50} speedScale={0.15} color="rgba(244, 63, 94, 0.05)" glowColor="rgba(0, 112, 243, 0.2)" />
            
            <div className="builder-canvas">
                {currentSession?.workflow ? (
                    <div className="workflow-canvas">
                        <svg className="edge-layer">
                            {currentSession.workflow.edges.map((edge, i) => {
                                const s = currentSession.workflow!.nodes.find(n => n.id === edge.source);
                                const t = currentSession.workflow!.nodes.find(n => n.id === edge.target);
                                return s && t ? <line key={i} x1={s.position.x + 120} y1={s.position.y + 45} x2={t.position.x + 120} y2={t.position.y + 45} className="edge-line a2a-flow" /> : null;
                            })}
                        </svg>
                        {currentSession.workflow.nodes.map(node => (
                            <div key={node.id} onClick={() => setDrawerState({ isOpen: true, mode: 'files', title: `Source: ${node.label}`, activeNodeId: node.id })}>
                                <AgentNode node={node} />
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
                    <input type="text" placeholder="Describe Mesh (e.g. 'Main agent with remote Dice and Weather sub-agents')" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                    <button className="send-button" onClick={handleSendMessage} disabled={isLoading}><ArrowUpIcon /></button>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
