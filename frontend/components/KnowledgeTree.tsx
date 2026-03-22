'use client'

import { useState } from 'react'
import { useBoardStore } from '@/store/useBoardStore'
import { KnowledgeNode } from '@/types/node'

export function KnowledgeTree() {

  const nodes = useBoardStore((state) => state.nodes)
  const selectedNodeId = useBoardStore((state) => state.selectedNodeId)

  const selectNode = useBoardStore((state) => state.selectNode)
  const setNodes = useBoardStore((state) => state.setNodes)
  const updateNodeContent = useBoardStore((state) => state.updateNodeContent)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)

      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }

      return newSet
    })
  }

  // ---------- Expand Node ----------
  const expandNode = async (node: KnowledgeNode) => {

    const alreadyExpanded = nodes.some((n) => n.parentId === node.id)

    if (alreadyExpanded) return
    if (node.level >= 5) return

    try {

      const res = await fetch("http://localhost:8000/expand-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: node.title
        })
      })

      const data = await res.json()

      if (!data?.subtopics) return

      const newNodes: KnowledgeNode[] = data.subtopics.map(
        (topic: any, index: number) => {

          let title = ""

          if (typeof topic === "string") {
            title = topic
          } 
          else if (typeof topic === "object" && topic.title) {
            title = topic.title
          } 
          else {
            title = JSON.stringify(topic)
          }

          return {
            id: `${node.id}-${index}`,
            title: title,
            level: node.level + 1,
            parentId: node.id,
            content: {
              definition: "",
              explanation: "",
              example: "",
              application: "",
              mistake: ""
            },
            version: 1
          }
        }
      )

      // prevent duplicates
      const uniqueNodes = newNodes.filter(
        (newNode) =>
          !nodes.some(
            (n) =>
              n.title === newNode.title &&
              n.parentId === node.id
          )
      )

      setNodes([...nodes, ...uniqueNodes])

    } catch (err) {
      console.error("AI expansion failed", err)
    }
  }

  // ---------- Generate Node Content ----------
  const generateContent = async (node: KnowledgeNode) => {

    try {

      const res = await fetch("http://localhost:8000/generate-node-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: String(node.title)
        })
      })

      const data = await res.json()

      updateNodeContent(node.id, {
        definition: data.definition || "",
        explanation: data.explanation || "",
        example: data.example || "",
        application: data.application || "",
        mistake: data.mistake || ""
      })

    } catch (err) {
      console.error("AI content generation failed", err)
    }
  }

  // ---------- Click Handler ----------
  const handleClick = async (node: KnowledgeNode) => {

    selectNode(node.id)

    const wasExpanded = expandedNodes.has(node.id)

    toggleNode(node.id)

    if (!wasExpanded) {
      expandNode(node)
    }

    if (!node.content.definition) {
      generateContent(node)
    }
  }

  // ---------- Render Node ----------
  const renderNode = (node: KnowledgeNode) => {

    const isSelected = node.id === selectedNodeId
    const paddingLeft = `${node.level * 1.5}rem`
    const isExpanded = expandedNodes.has(node.id)

    return (
      <div key={node.id} style={{ paddingLeft }}>

        <button
          onClick={() => handleClick(node)}
          className={`w-full text-left px-3 py-2 rounded transition-colors duration-200 flex items-center gap-2 ${
            isSelected
              ? 'bg-slate-100 border-l-2 border-slate-800 text-slate-900'
              : 'hover:bg-slate-50 text-slate-700'
          }`}
        >

          <span className="text-xs">
            {isExpanded ? "▾" : "▸"}
          </span>

          <span className="text-sm font-medium">
            {String(node.title)}
          </span>

        </button>

      </div>
    )
  }

  // ---------- Visible Tree ----------
  const visibleNodes = nodes.filter((node) => {

    if (!node.parentId) return true

    return expandedNodes.has(node.parentId)
  })

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 p-4 overflow-y-auto">

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          Knowledge Tree
        </h2>

        <p className="text-xs text-slate-500 mt-1">
          Click a node to expand AI topics
        </p>
      </div>

      <div className="space-y-1">
        {visibleNodes.map((node) => renderNode(node))}
      </div>

    </div>
  )
}