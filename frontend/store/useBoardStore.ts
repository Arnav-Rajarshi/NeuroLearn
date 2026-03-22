'use client'

import { create } from 'zustand'
import { KnowledgeNode } from '@/types/node'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface BoardStore {
  nodes: KnowledgeNode[]
  selectedNodeId: string | null
  selectedContentCards: Set<string>
  chatMessages: ChatMessage[]

  selectNode: (id: string) => void
  setNodes: (nodes: KnowledgeNode[]) => void
  updateNodeContent: (id: string, content: KnowledgeNode['content']) => void

  toggleContentCard: (cardKey: string) => void
  selectAllContentCards: (cardKeys: string[]) => void
  clearAllContentCards: () => void

  addChatMessage: (message: ChatMessage) => void
  clearChatMessages: () => void
}

export const useBoardStore = create<BoardStore>((set) => ({

  /* ---------- STATE ---------- */

  nodes: [],
  selectedNodeId: null,
  selectedContentCards: new Set(),
  chatMessages: [],

  /* ---------- NODE CONTROLS ---------- */

  selectNode: (id: string) =>
    set({ selectedNodeId: id }),

  setNodes: (nodes: KnowledgeNode[]) =>
    set({
      nodes,
      selectedNodeId: nodes[0]?.id || null
    }),

  updateNodeContent: (id: string, content: KnowledgeNode['content']) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? { ...node, content }
          : node
      ),
    })),

  /* ---------- CONTENT CARD CONTROLS ---------- */

  toggleContentCard: (cardKey: string) =>
    set((state) => {
      const updated = new Set(state.selectedContentCards)

      if (updated.has(cardKey)) {
        updated.delete(cardKey)
      } else {
        updated.add(cardKey)
      }

      return { selectedContentCards: updated }
    }),

  selectAllContentCards: (cardKeys: string[]) =>
    set({ selectedContentCards: new Set(cardKeys) }),

  clearAllContentCards: () =>
    set({ selectedContentCards: new Set() }),

  /* ---------- CHAT SYSTEM ---------- */

  addChatMessage: (message: ChatMessage) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message]
    })),

  clearChatMessages: () =>
    set({ chatMessages: [] }),

}))