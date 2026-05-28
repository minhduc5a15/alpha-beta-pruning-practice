/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { RotateCcw, FastForward, Edit3, Trash2, Home, CheckCircle2, Code, X, Dices, Settings2, PlayCircle, Hammer, PanelLeft, PanelRight, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { getInitialState } from './data';
import { NodeState, TreeNodeData, TruthRecord } from './types';
import NodeCard from './components/NodeCard';
import LeafNode from './components/LeafNode';
import EditorNode from './components/EditorNode';
import { generateAlphaBetaSteps, StepAction, calculateTruthData } from './engine';
import { useTreeStore } from './store';

interface AppProps {
  mode: 'practice' | 'editor';
}

export default function App({ mode }: AppProps) {
  const { 
    treeData, 
    clearTree, 
    resetToExample, 
    generateRandomTree, 
    randomConfig, 
    setRandomConfig 
  } = useTreeStore();

  const [userStates, setUserStates] = useState<Record<string, NodeState>>(getInitialState(treeData));
  const [truthData, setTruthData] = useState<Record<string, TruthRecord>>(calculateTruthData(treeData));
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{x1:number, y1:number, x2:number, y2:number, pruned:boolean}[]>([]);

  // Canvas Transform State
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Auto Run States
  const [isStepMode, setIsStepMode] = useState(false);
  const [steps, setSteps] = useState<StepAction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState<{message: string, id: number}[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Tree Input States
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isRandomConfigOpen, setIsRandomConfigOpen] = useState(false);
  const [inputText, setInputText] = useState(JSON.stringify(treeData, null, 2));
  const [inputError, setInputError] = useState<string | null>(null);

  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isFooterOpen, setIsFooterOpen] = useState(false);

  const isEditorMode = mode === 'editor';

  const { nodeIds, parentMap, firstChildMap, nextSiblingMap, prevSiblingMap } = React.useMemo(() => {
    const ids: string[] = [];
    const pMap: Record<string, string> = {};
    const fcMap: Record<string, string> = {};
    const nsMap: Record<string, string> = {};
    const psMap: Record<string, string> = {};
    
    const traverse = (n: TreeNodeData, parentId?: string) => {
      ids.push(n.id);
      if (parentId) pMap[n.id] = parentId;
      if (n.children && n.children.length > 0) {
        fcMap[n.id] = n.children[0].id;
        for (let i = 0; i < n.children.length; i++) {
          const current = n.children[i];
          if (i > 0) psMap[current.id] = n.children[i - 1].id;
          if (i < n.children.length - 1) nsMap[current.id] = n.children[i + 1].id;
          traverse(current, n.id);
        }
      }
    };
    traverse(treeData);
    return { nodeIds: ids, parentMap: pMap, firstChildMap: fcMap, nextSiblingMap: nsMap, prevSiblingMap: psMap };
  }, [treeData]);

  useEffect(() => {
    setInputText(JSON.stringify(treeData, null, 2));
  }, [treeData]);

  const handleApplyTree = () => {
    try {
      const parsed = JSON.parse(inputText);
      if (!parsed.id || !parsed.type) throw new Error("Cấu trúc cây không hợp lệ (thiếu id hoặc type)");
      useTreeStore.getState().setTreeData(parsed);
      setIsInputOpen(false);
      setInputError(null);
    } catch (e: any) {
      setInputError(e.message);
    }
  };

  useEffect(() => {
    setUserStates(getInitialState(treeData));
    setTruthData(calculateTruthData(treeData));
    setShowResults(false);
    setIsStepMode(false);
    setSteps([]);
    setCurrentStepIndex(-1);
    setLogs([]);
    setActiveNodeId(null);
  }, [treeData]);

  useEffect(() => {
    if (activeNodeId) {
      const element = document.getElementById(`node-${activeNodeId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [activeNodeId]);

  const resetAll = () => {
     setUserStates(getInitialState(treeData));
     setShowResults(false);
     setIsStepMode(false);
     setSteps([]);
     setCurrentStepIndex(-1);
     setLogs([]);
     setActiveNodeId(null);
  };

  const startStepMode = () => {
    resetAll();
    const newSteps = generateAlphaBetaSteps(treeData);
    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsStepMode(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStepMode) {
        if (e.key === 'ArrowRight') {
          setCurrentStepIndex(prev => Math.min(steps.length, prev + 1));
        } else if (e.key === 'ArrowLeft') {
          setCurrentStepIndex(prev => Math.max(0, prev - 1));
        }
        return;
      }

      // Practice mode navigation
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Delete'];
      if (keys.includes(e.key)) {
        e.preventDefault();
        if (!activeNodeId) {
          setActiveNodeId(nodeIds[0]);
          return;
        }

        if (e.key === 'ArrowRight') {
          const nextId = nextSiblingMap[activeNodeId];
          if (nextId) setActiveNodeId(nextId);
        } else if (e.key === 'ArrowLeft') {
          const prevId = prevSiblingMap[activeNodeId];
          if (prevId) setActiveNodeId(prevId);
        } else if (e.key === 'ArrowUp') {
          const parentId = parentMap[activeNodeId];
          if (parentId) setActiveNodeId(parentId);
        } else if (e.key === 'ArrowDown') {
          const childId = firstChildMap[activeNodeId];
          if (childId) setActiveNodeId(childId);
        } else if (e.key === 'Delete') {
          const currentState = userStates[activeNodeId];
          if (currentState) {
            setUserStates(prev => ({
              ...prev,
              [activeNodeId]: {
                ...currentState,
                isPruned: !currentState.isPruned
              }
            }));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStepMode, steps.length, activeNodeId, nodeIds, parentMap, firstChildMap, nextSiblingMap, prevSiblingMap, userStates]);

  useEffect(() => {
    if (!isStepMode) return;

    const nextStates: Record<string, NodeState> = getInitialState(treeData);
    const nextLogs: {message: string, id: number}[] = [];
    let actNodeId: string | null = null;

    for (let i = 0; i < currentStepIndex; i++) {
        const step = steps[i];
        let newLog = '';
        switch (step.type) {
          case 'VISIT_NODE':
            actNodeId = step.id;
            if (nextStates[step.id]) {
                nextStates[step.id].alphas = [step.alpha];
                nextStates[step.id].betas = [step.beta];
            }
            break;
          case 'EVALUATE_LEAF':
            actNodeId = step.id;
            break;
          case 'UPDATE_ALPHA':
            actNodeId = step.id;
            if (nextStates[step.id]) {
                const currentAlphas = [...nextStates[step.id].alphas];
                if (currentAlphas[currentAlphas.length - 1] !== step.newAlpha) {
                    currentAlphas.push(step.newAlpha);
                }
                nextStates[step.id].alphas = currentAlphas;
            }
            break;
          case 'UPDATE_BETA':
            actNodeId = step.id;
            if (nextStates[step.id]) {
                const currentBetas = [...nextStates[step.id].betas];
                if (currentBetas[currentBetas.length - 1] !== step.newBeta) {
                    currentBetas.push(step.newBeta);
                }
                nextStates[step.id].betas = currentBetas;
            }
            break;
          case 'RETURN_VALUE':
            if (nextStates[step.id]) {
                nextStates[step.id].v = step.value;
            }
            actNodeId = step.id;
            break;
          case 'PRUNE_BRANCH':
            actNodeId = step.parentId;
            const markPruned = (nId: string) => {
                if (nextStates[nId]) nextStates[nId].isPruned = true;
                const pruneRecursive = (tNode: TreeNodeData, target: string, inTarget = false) => {
                   if (tNode.id === target) inTarget = true;
                   if (inTarget && nextStates[tNode.id]) nextStates[tNode.id].isPruned = true;
                   if (tNode.children) {
                      tNode.children.forEach(c => pruneRecursive(c, target, inTarget));
                   }
                };
                pruneRecursive(treeData, nId);
            };
            markPruned(step.id);
            break;
          case 'MESSAGE':
            newLog = step.message;
            if (step.id) actNodeId = step.id;
            break;
        }
        if (newLog) {
           nextLogs.push({ message: newLog, id: i });
        }
    }

    setUserStates(nextStates);
    setLogs(nextLogs);
    setActiveNodeId(actNodeId);
  }, [currentStepIndex, isStepMode, steps, treeData]);

  const handleUpdateNode = (id: string, partial: Partial<NodeState>) => {
     setUserStates(prev => ({ ...prev, [id]: { ...prev[id], ...partial } }));
     setShowResults(false);
  };

  const drawLines = () => {
    if (!containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const newLines: any[] = [];

    const traverse = (node: TreeNodeData) => {
       if (node.children) {
          node.children.forEach(child => {
             const p1 = document.getElementById(`node-${node.id}`);
             const p2 = document.getElementById(`node-${child.id}`);
             if (p1 && p2) {
                const b1 = p1.getBoundingClientRect();
                const b2 = p2.getBoundingClientRect();
                
                // We need coordinates relative to containerRef.current, 
                // but account for the CSS transform (scale).
                // Dividing by transform.scale gets us the "local" coordinates.
                newLines.push({
                   x1: (b1.left + b1.width / 2 - container.left) / transform.scale,
                   y1: (b1.bottom - container.top) / transform.scale,
                   x2: (b2.left + b2.width / 2 - container.left) / transform.scale,
                   y2: (b2.top - container.top) / transform.scale,
                   pruned: userStates[child.id]?.isPruned
                });
             }
             traverse(child);
          });
       }
    };
    traverse(treeData);
    setLines(newLines);
  };

  useLayoutEffect(() => {
     const timer = setTimeout(drawLines, 50);
     window.addEventListener('resize', drawLines);
     return () => {
         clearTimeout(timer);
         window.removeEventListener('resize', drawLines);
     };
  }, [userStates, showResults, treeData, isEditorMode, transform.scale]);

  // Infinite Canvas Logic
  const handleWheel = (e: React.WheelEvent) => {
    // Zoom with scroll wheel (no Ctrl needed)
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.1, transform.scale * delta), 3);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Pan with Middle Click (button 1)
    if (e.button === 1) { 
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.button === 1) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const resetView = () => {
    centerTree();
  };

  const centerTree = () => {
    if (viewportRef.current && containerRef.current) {
      const vWidth = viewportRef.current.clientWidth;
      const vHeight = viewportRef.current.clientHeight;
      const cWidth = containerRef.current.offsetWidth;
      const cHeight = containerRef.current.offsetHeight;
      
      setTransform({
        scale: 1,
        x: (vWidth - cWidth) / 2,
        y: (vHeight - cHeight) / 2
      });
    }
  };

  // Center on mount and when tree data changes
  useLayoutEffect(() => {
    const timer = setTimeout(centerTree, 100);
    return () => clearTimeout(timer);
  }, [treeData]);

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
     e.stopPropagation();
     if (!isStepMode) {
        setActiveNodeId(id);
     }
  };

  const handleContainerClick = () => {
     if (!isStepMode) {
        setActiveNodeId(null);
     }
  };

  const renderTree = (node: TreeNodeData) => {
     return (
        <div key={node.id} className="flex flex-col items-center gap-8 relative w-fit">
           {isEditorMode ? (
              <EditorNode node={node} />
           ) : node.type === 'LEAF' ? (
              <LeafNode 
                 id={node.id} 
                 value={node.value!} 
                 state={userStates[node.id]} 
                 truth={truthData[node.id]}
                 onUpdate={(partial) => handleUpdateNode(node.id, partial)}
                 showResults={showResults}
                 isActive={activeNodeId === node.id}
                 isStepMode={isStepMode}
                 onClick={!isStepMode ? (e) => handleNodeClick(e, node.id) : undefined}
              />
           ) : (
              <NodeCard 
                 id={node.id} 
                 type={node.type} 
                 state={userStates[node.id]} 
                 truth={truthData[node.id]}
                 onUpdate={(partial) => handleUpdateNode(node.id, partial)}
                 showResults={showResults}
                 isActive={activeNodeId === node.id}
                 isStepMode={isStepMode}
                 onClick={!isStepMode ? (e) => handleNodeClick(e, node.id) : undefined}
              />
           )}
           {node.children && node.children.length > 0 && (
              <div className="flex gap-4 justify-center min-w-max">
                 {node.children.map(renderTree)}
              </div>
           )}
        </div>
     );
  };

  if(!userStates || Object.keys(userStates).length === 0) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-[#0F1115] text-[#E2E8F0] font-sans overflow-hidden select-none" onClick={handleContainerClick}>
      {/* Left Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isLeftOpen ? 240 : 64 }}
        className="relative z-30 flex flex-col border-r border-[#1E293B] bg-[#111827]/40 backdrop-blur-xl transition-all duration-300"
      >
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between overflow-hidden whitespace-nowrap">
           <AnimatePresence mode="wait">
             {isLeftOpen ? (
               <motion.div 
                 key="logo"
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -10 }}
                 className="flex flex-col"
               >
                 <h1 className="text-lg font-bold text-emerald-400 tracking-tighter leading-none">ALPHA-BETA</h1>
                 <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Laboratory</span>
               </motion.div>
             ) : (
               <motion.div 
                 key="short-logo"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="w-8 h-8 rounded bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center"
               >
                 <span className="text-emerald-400 font-bold text-xs">AB</span>
               </motion.div>
             )}
           </AnimatePresence>
           <button 
             onClick={() => setIsLeftOpen(!isLeftOpen)}
             className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
           >
             {isLeftOpen ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
           <div className="px-3 mb-6">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Điều hướng</div>
              <div className="space-y-1">
                 <NavLink to="/practice" className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${isActive ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}>
                    <PlayCircle size={20} className="shrink-0"/>
                    <AnimatePresence>
                       {isLeftOpen && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Luyện tập</motion.span>
                       )}
                    </AnimatePresence>
                 </NavLink>
                 <NavLink to="/editor" className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}>
                    <Hammer size={20} className="shrink-0"/>
                    <AnimatePresence>
                       {isLeftOpen && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Thiết kế cây</motion.span>
                       )}
                    </AnimatePresence>
                 </NavLink>
              </div>
           </div>

           <div className="px-3 mb-6">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Thao tác cây</div>
              <div className="space-y-1">
                 {isEditorMode && (
                   <button 
                     onClick={clearTree}
                     className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 cursor-pointer"
                   >
                     <Trash2 size={20} className="shrink-0"/>
                     <AnimatePresence>
                        {isLeftOpen && (
                           <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Xóa cây</motion.span>
                        )}
                     </AnimatePresence>
                   </button>
                 )}
                 <button 
                   onClick={() => setIsInputOpen(true)}
                   className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700 cursor-pointer"
                 >
                   <Code size={20} className="shrink-0"/>
                   <AnimatePresence>
                      {isLeftOpen && (
                         <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Dữ liệu JSON</motion.span>
                      )}
                   </AnimatePresence>
                 </button>
                 <div className="flex gap-1">
                    <button 
                      onClick={() => generateRandomTree()}
                      className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700 overflow-hidden cursor-pointer"
                    >
                      <Dices size={20} className="shrink-0"/>
                      <AnimatePresence>
                         {isLeftOpen && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Ngẫu nhiên</motion.span>
                         )}
                      </AnimatePresence>
                    </button>
                    {isLeftOpen && (
                      <button 
                        onClick={() => setIsRandomConfigOpen(true)}
                        className="p-2 text-slate-500 hover:text-white transition-all hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <Settings2 size={18}/>
                      </button>
                    )}
                 </div>
                 <button 
                   onClick={resetToExample}
                   className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700 cursor-pointer"
                 >
                   <Home size={20} className="shrink-0"/>
                   <AnimatePresence>
                      {isLeftOpen && (
                         <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Cây mẫu</motion.span>
                      )}
                   </AnimatePresence>
                 </button>
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-[#1E293B] text-[9px] text-slate-600 font-mono text-center">
           {isLeftOpen ? "v1.0.0-PROTOTYPE" : "v1.0"}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <main 
          ref={viewportRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`flex-1 overflow-hidden relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:40px_40px] touch-none ${isDragging ? 'cursor-move' : 'cursor-default'}`}
        >
           <div 
             className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
             style={{ 
               transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
             }}
           >
              <div className="min-w-max p-[500px] relative flex justify-center" ref={containerRef}>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                      {lines.map((l, i) => (
                         <path 
                            key={i} 
                            d={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`} 
                            stroke={l.pruned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'} 
                            strokeWidth="2" 
                            strokeDasharray={l.pruned ? '4,4' : 'none'} 
                            fill="none" 
                            className="transition-all duration-300"
                         />
                      ))}
                  </svg>
                  
                  <div className="relative z-10">
                      {renderTree(treeData)}
                  </div>
              </div>
           </div>

           {/* Floating Canvas Controls */}
           <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2">
              <div className="bg-[#1E293B]/80 backdrop-blur-md border border-[#334155] rounded-lg p-1 shadow-2xl flex flex-col">
                 <button onClick={() => setTransform(p => ({...p, scale: Math.min(3, p.scale + 0.1)}))} className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors cursor-pointer" title="Phóng to (Cuộn chuột)"><ZoomIn size={18}/></button>
                 <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.1)}))} className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors cursor-pointer" title="Thu nhỏ (Cuộn chuột)"><ZoomOut size={18}/></button>
                 <div className="h-px bg-[#334155] mx-1 my-1"></div>
                 <button onClick={resetView} className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors cursor-pointer" title="Căn giữa"><Maximize size={18}/></button>
              </div>
           </div>

           {/* Modals remain here... */}
           {isRandomConfigOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                 <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#111827]">
                       <h2 className="font-bold text-slate-100 uppercase text-xs tracking-wider">Cấu hình Random</h2>
                       <button onClick={() => setIsRandomConfigOpen(false)} className="text-slate-400 hover:text-white">
                          <X size={16} />
                       </button>
                    </div>
                    <div className="p-6 space-y-6">
                       <div className="space-y-3">
                          <div className="flex justify-between">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Độ sâu tối đa: {randomConfig.maxDepth}</label>
                          </div>
                          <input 
                             type="range" min="1" max="5" step="1" 
                             value={randomConfig.maxDepth}
                             onChange={(e) => setRandomConfig({...randomConfig, maxDepth: parseInt(e.target.value)})}
                             className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                       </div>
                       <div className="space-y-3">
                          <div className="flex justify-between">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Độ rộng tối đa: {randomConfig.maxBreadth}</label>
                          </div>
                          <input 
                             type="range" min="2" max="5" step="1" 
                             value={randomConfig.maxBreadth}
                             onChange={(e) => setRandomConfig({...randomConfig, maxBreadth: parseInt(e.target.value)})}
                             className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                       </div>
                    </div>
                    <div className="p-3 bg-[#111827] flex justify-end">
                       <button 
                          onClick={() => { generateRandomTree(); setIsRandomConfigOpen(false); }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-2"
                       >
                          <Dices size={12}/> TẠO CÂY MỚI
                       </button>
                    </div>
                 </div>
              </div>
           )}

           {isInputOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                 <div className="bg-[#111827] border border-[#334155] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#1E293B]">
                       <div className="flex items-center gap-2">
                          <Code size={18} className="text-emerald-400" />
                          <h2 className="font-bold text-slate-100 uppercase text-sm tracking-wider">Cấu hình cây bằng JSON</h2>
                       </div>
                       <button onClick={() => setIsInputOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                          <X size={20} />
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                       <div className="w-full md:w-64 bg-[#0F1115] border-r border-[#334155] p-4 overflow-y-auto text-[11px] text-slate-400">
                          <h3 className="text-emerald-400 font-bold mb-3 uppercase tracking-widest text-[10px]">Hướng dẫn định dạng</h3>
                          <div className="space-y-4">
                             <section>
                                <p className="font-bold text-slate-200 mb-1">Cấu trúc nút (Node):</p>
                                <ul className="list-disc list-inside space-y-1">
                                   <li><code className="text-emerald-300">id</code>: Chuỗi duy nhất</li>
                                   <li><code className="text-emerald-300">type</code>: <span className="text-slate-200">"MAX"</span>, <span className="text-slate-200">"MIN"</span>, <span className="text-slate-200">"LEAF"</span></li>
                                   <li><code className="text-emerald-300">children</code>: Mảng các nút con</li>
                                   <li><code className="text-emerald-300">value</code>: Giá trị số (chỉ cho LEAF)</li>
                                </ul>
                             </section>
                             <section>
                                <p className="font-bold text-slate-200 mb-1">Ví dụ tối giản:</p>
                                <pre className="bg-black/50 p-2 rounded text-[9px] text-emerald-400/80 leading-relaxed overflow-x-auto">
{`{
  "id": "A",
  "type": "MAX",
  "children": [
    { "id": "L1", "type": "LEAF", "value": 10 },
    { "id": "L2", "type": "LEAF", "value": 5 }
  ]
}`}
                                </pre>
                             </section>
                          </div>
                       </div>
                       <div className="flex-1 flex flex-col overflow-hidden">
                          <textarea 
                             value={inputText}
                             onChange={(e) => setInputText(e.target.value)}
                             className="flex-1 w-full bg-[#0F1115] p-4 font-mono text-xs text-emerald-300 outline-none resize-none placeholder:text-slate-700"
                             placeholder="Dán mã JSON của cây vào đây..."
                          />
                          {inputError && (
                             <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/30 text-rose-400 text-[10px] font-mono whitespace-pre-wrap">
                                Lỗi: {inputError}
                             </div>
                          )}
                       </div>
                    </div>
                    <div className="p-3 bg-[#1E293B] border-t border-[#334155] flex justify-end gap-3">
                       <button onClick={() => setIsInputOpen(false)} className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">ĐÓNG</button>
                       <button onClick={handleApplyTree} className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
                          <CheckCircle2 size={14} /> CẬP NHẬT CÂY
                       </button>
                    </div>
                 </div>
              </div>
           )}
        </main>

        <motion.footer 
          initial={false}
          animate={{ height: isFooterOpen ? 128 : 40 }}
          className="bg-[#111827] border-t border-[#1E293B] z-20 shrink-0 flex flex-col overflow-hidden"
        >
          <div 
            onClick={() => setIsFooterOpen(!isFooterOpen)}
            className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isStepMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Trạng thái Duyệt</h3>
            </div>
            <div className="text-slate-500">
              {isFooterOpen ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
            </div>
          </div>

          <div className="flex-1 p-3 pt-0 flex gap-4 min-h-0">
            <div className="flex-1 bg-[#1E293B]/50 rounded-lg p-2 border border-[#334155] flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-1 z-10 shrink-0">
                 <h3 className="text-[10px] font-bold text-emerald-400 uppercase">Nhật ký thuật toán</h3>
                 {isStepMode && (
                    <div className="text-[9px] text-slate-400 font-medium bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                       Phím <span className="font-bold text-slate-200">←</span> / <span className="font-bold text-slate-200">→</span>
                    </div>
                 )}
              </div>
              <div className="space-y-0.5 overflow-y-auto flex-1 font-mono text-[10px] scroll-smooth pr-1" ref={el => {
                 if (el) el.scrollTop = el.scrollHeight;
              }}>
                {logs.length === 0 && <div className="text-slate-500 italic mt-1 text-[10px]">
                    {isEditorMode ? "Chế độ chỉnh sửa: Bấm (+) để thêm nút con hoặc nhập giá trị để tạo nút lá." : "Sử dụng Sidebar bên phải để chạy thuật toán."}
                </div>}
                {logs.map((log, i) => (
                   <div key={log.id} className="flex gap-2 leading-tight">
                     <span className="text-slate-500 w-5 shrink-0">[{i + 1}]</span>
                     <span className={`${log.message.includes('Cắt tỉa') ? 'text-rose-400 font-bold' : log.message.includes('cập nhật') ? 'text-emerald-300' : 'text-slate-300'}`}>
                        {log.message}
                     </span>
                   </div>
                ))}
              </div>
            </div>
            <div className="w-56 flex flex-col gap-2 shrink-0">
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <span className="text-[9px] font-bold text-rose-300 uppercase">Cắt tỉa</span>
                </div>
                <p className="text-[9px] text-rose-200/60 leading-tight mt-1">Nếu α ≥ β, các nhánh còn lại bên phải sẽ không cần xét.</p>
              </div>
            </div>
          </div>
        </motion.footer>
      </div>

      {/* Right Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isRightOpen ? 240 : 64 }}
        className="relative z-30 flex flex-col border-l border-[#1E293B] bg-[#111827]/40 backdrop-blur-xl transition-all duration-300"
      >
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between overflow-hidden whitespace-nowrap">
           <button 
             onClick={() => setIsRightOpen(!isRightOpen)}
             className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
           >
             {isRightOpen ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
           </button>
           <AnimatePresence mode="wait">
             {isRightOpen && (
               <motion.div 
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 10 }}
                 className="text-right"
               >
                 <h2 className="text-sm font-bold text-indigo-400 tracking-wider uppercase leading-none">Điều khiển</h2>
                 <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Thuật toán</span>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
           {!isEditorMode ? (
             <>
               <div className="px-3 mb-6">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-3">Chạy thuật toán</div>
                  <div className="space-y-3">
                     <button 
                        onClick={isStepMode ? () => setIsStepMode(false) : startStepMode}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all shadow-lg cursor-pointer ${
                            isStepMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                     >
                        <FastForward size={20} fill={isStepMode ? "none" : "currentColor"} className="shrink-0"/>
                        <AnimatePresence>
                           {isRightOpen && (
                              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-black uppercase tracking-tighter whitespace-nowrap">
                                 {isStepMode ? 'Dừng bước' : 'Chạy từng bước'}
                              </motion.span>
                           )}
                        </AnimatePresence>
                     </button>
                     
                     <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={resetAll}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-[#334155] transition-all cursor-pointer"
                        >
                            <RotateCcw size={20} className="shrink-0"/>
                            <AnimatePresence>
                               {isRightOpen && (
                                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Làm lại</motion.span>
                               )}
                            </AnimatePresence>
                        </button>

                        <button 
                            onClick={() => { setIsStepMode(false); setShowResults(true); setTimeout(drawLines, 50); }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
                        >
                            <CheckCircle2 size={20} className="shrink-0"/>
                            <AnimatePresence>
                               {isRightOpen && (
                                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Kiểm tra</motion.span>
                               )}
                            </AnimatePresence>
                        </button>
                     </div>
                  </div>
               </div>

               <div className="px-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-3">Chú giải</div>
                  <div className="space-y-3 px-2">
                     <div className="flex items-center gap-3">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-emerald-500"></div>
                        <AnimatePresence>
                           {isRightOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">MAX Node</motion.span>}
                        </AnimatePresence>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-rose-500"></div>
                        <AnimatePresence>
                           {isRightOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">MIN Node</motion.span>}
                        </AnimatePresence>
                     </div>
                  </div>
               </div>
             </>
           ) : (
             <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                   <Edit3 size={24} className="text-amber-400"/>
                </div>
                <AnimatePresence>
                   {isRightOpen && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                         <h3 className="text-xs font-bold text-amber-300 uppercase mb-2">Chế độ thiết kế</h3>
                         <p className="text-[10px] text-slate-500 leading-relaxed mb-6">
                            Đang trong quá trình chỉnh sửa cấu trúc cây.
                         </p>
                         <NavLink to="/practice" className="block w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer">
                            XONG, LUYỆN TẬP
                         </NavLink>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
           )}
        </div>
      </motion.aside>
    </div>
  );
}
