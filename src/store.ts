import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TreeNodeData } from './types';
import { INITIAL_TREE_DATA } from './data';

export interface RandomConfig {
  maxDepth: number;
  maxBreadth: number;
  minValue: number;
  maxValue: number;
  rootType: 'MAX' | 'MIN' | 'RANDOM';
}

interface TreeStore {
  treeData: TreeNodeData;
  isEditorMode: boolean;
  setTreeData: (tree: TreeNodeData) => void;
  setEditorMode: (isEditor: boolean) => void;
  resetToExample: () => void;
  updateNode: (id: string, updates: Partial<TreeNodeData>) => void;
  addChild: (parentId: string) => void;
  removeChild: (parentId: string, childId: string) => void;
  clearTree: () => void;
  generateRandomTree: (config?: RandomConfig) => void;
  randomConfig: RandomConfig;
  setRandomConfig: (config: RandomConfig) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

export const useTreeStore = create<TreeStore>()(
  persist(
    (set, get) => ({
      treeData: INITIAL_TREE_DATA,
      isEditorMode: false,
      randomConfig: { 
        maxDepth: 3, 
        maxBreadth: 3,
        minValue: 1,
        maxValue: 20,
        rootType: 'MAX'
      },
      setRandomConfig: (config) => set({ randomConfig: config }),
      setTreeData: (tree) => set({ treeData: tree }),
      setEditorMode: (isEditor) => set({ isEditorMode: isEditor }),
      resetToExample: () => set({ treeData: INITIAL_TREE_DATA, isEditorMode: false }),
      clearTree: () => set({ 
        treeData: { id: 'ROOT', type: 'MAX', children: [] },
        isEditorMode: true 
      }),
      generateRandomTree: (config) => set(() => {
        const { maxDepth, maxBreadth, minValue, maxValue, rootType } = config || get().randomConfig;
        
        const createRandomNode = (id: string, type: 'MAX' | 'MIN' | 'LEAF', depth: number): TreeNodeData => {
          const shouldBeLeaf = depth >= maxDepth || (depth >= 1 && Math.random() < 0.1);
          
          if (shouldBeLeaf) {
            const range = maxValue - minValue + 1;
            return {
              id,
              type: 'LEAF',
              value: Math.floor(Math.random() * range) + minValue,
            };
          }
          const childCount = Math.floor(Math.random() * (maxBreadth - 1)) + 2; 
          const children: TreeNodeData[] = [];
          const nextType = type === 'MAX' ? 'MIN' : 'MAX';
          for (let i = 0; i < childCount; i++) {
            children.push(createRandomNode(`${id}${i + 1}`, nextType, depth + 1));
          }
          return { id, type, children };
        };

        let startType: 'MAX' | 'MIN' = 'MAX';
        if (rootType === 'MIN') startType = 'MIN';
        else if (rootType === 'RANDOM') startType = Math.random() < 0.5 ? 'MAX' : 'MIN';

        return { treeData: createRandomNode('A', startType, 0), isEditorMode: false };
      }),
      updateNode: (id, updates) => set((state) => {
        const updateRecursive = (node: TreeNodeData): TreeNodeData => {
          if (node.id === id) {
            const newNode = { ...node, ...updates };
            // If it becomes a leaf, clear children
            if (updates.type === 'LEAF') newNode.children = [];
            // If it's no longer a leaf, clear value
            if (updates.type !== 'LEAF') delete newNode.value;
            return newNode;
          }
          if (node.children) {
            return { ...node, children: node.children.map(updateRecursive) };
          }
          return node;
        };
        return { treeData: updateRecursive(state.treeData) };
      }),
      addChild: (parentId) => set((state) => {
        const addRecursive = (node: TreeNodeData): TreeNodeData => {
          if (node.id === parentId) {
            const children = node.children || [];
            const newChildType = node.type === 'MAX' ? 'MIN' : 'MAX';
            return { 
              ...node, 
              type: node.type === 'LEAF' ? 'MAX' : node.type, // Change leaf to node if adding child
              children: [...children, { id: generateId(), type: newChildType, children: [] }] 
            };
          }
          if (node.children) {
            return { ...node, children: node.children.map(addRecursive) };
          }
          return node;
        };
        return { treeData: addRecursive(state.treeData) };
      }),
      removeChild: (parentId, childId) => set((state) => {
        const removeRecursive = (node: TreeNodeData): TreeNodeData => {
          if (node.id === parentId) {
            return { ...node, children: (node.children || []).filter(c => c.id !== childId) };
          }
          if (node.children) {
            return { ...node, children: node.children.map(removeRecursive) };
          }
          return node;
        };
        return { treeData: removeRecursive(state.treeData) };
      }),
    }),
    {
      name: 'alpha-beta-tree-storage',
    }
  )
);
