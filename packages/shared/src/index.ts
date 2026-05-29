// Y.js shared types for collaborative drawing

export interface DrawioShape {
  id: string
  type: 'rectangle' | 'circle' | 'diamond' | 'text' | 'image' | 'line' | 'arrow'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  style?: Record<string, string | number>
  content?: string
  metadata?: Record<string, unknown>
}

export interface DrawioConnection {
  id: string
  sourceId: string
  targetId: string
  label?: string
  style?: Record<string, string | number>
}

export interface DrawioPage {
  id: string
  name: string
  shapes: DrawioShape[]
  connections: DrawioConnection[]
}

export interface DrawioDocument {
  id: string
  pages: DrawioPage[]
  createdAt: number
  updatedAt: number
}

export type AwarenessUserState = {
  userId: string
  name: string
  color: string
  selectedShapeId?: string
  cursor?: { x: number; y: number }
}

export type ServerEvent =
  | { type: 'user-joined'; userId: string; userName: string }
  | { type: 'user-left'; userId: string }
  | { type: 'document-updated'; documentId: string; updatedBy: string }
  | { type: 'error'; message: string }

export type ClientEvent =
  | { type: 'cursor-move'; x: number; y: number }
  | { type: 'select-shape'; shapeId: string | null }
  | { type: 'request-document'; documentId: string }