import { TreeNodeData, TruthRecord, NodeState } from './types';

export const TREE_DATA: TreeNodeData = {
  id: 'A', type: 'MAX', children: [
    { id: 'B', type: 'MIN', children: [
      { id: 'D', type: 'MAX', children: [
        { id: 'H', type: 'MIN', children: [{id:'L1', type:'LEAF', value:6}, {id:'L2', type:'LEAF', value:11}] },
        { id: 'I', type: 'MIN', children: [{id:'L3', type:'LEAF', value:4}, {id:'L4', type:'LEAF', value:2}] }
      ]},
      { id: 'E', type: 'MAX', children: [
        { id: 'J', type: 'MIN', children: [{id:'L5', type:'LEAF', value:14}] },
        { id: 'K', type: 'MIN', children: [{id:'L6', type:'LEAF', value:9}, {id:'L7', type:'LEAF', value:4}] }
      ]}
    ]},
    { id: 'C', type: 'MIN', children: [
      { id: 'F', type: 'MAX', children: [
        { id: 'L', type: 'MIN', children: [{id:'L8', type:'LEAF', value:3}] },
        { id: 'M', type: 'MIN', children: [{id:'L9', type:'LEAF', value:7}] }
      ]},
      { id: 'G', type: 'MAX', children: [
        { id: 'N', type: 'MIN', children: [{id:'L10', type:'LEAF', value:9}] },
        { id: 'O', type: 'MIN', children: [{id:'L11', type:'LEAF', value:12}, {id:'L12', type:'LEAF', value:20}] }
      ]}
    ]}
  ]
};

export const INITIAL_TREE_DATA: TreeNodeData = TREE_DATA;

export function getInitialState(tree: TreeNodeData): Record<string, NodeState> {
  const state: Record<string, NodeState> = {};
  const iter = (node: TreeNodeData) => {
    state[node.id] = { v: '', alphas: [], betas: [], isPruned: false };
    if (node.children) node.children.forEach(iter);
  }
  iter(tree);
  return state;
}

export const INITIAL_USER_STATE = getInitialState(TREE_DATA);
