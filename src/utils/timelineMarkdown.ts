import {
  type BlockLike,
  type DurableBlockCodec,
  type DurableFencePayloadInput,
  injectDurableMarkdownBlocks,
  preProcessDurableMarkdownBlocks,
  readCodeBlockLanguage,
  readInlineText,
} from './durableMarkdownBlocks'

export const TIMELINE_BLOCK_TYPE = 'timelineBlock'

const TOKEN_PREFIX = '@@TOLARIA_TIMELINE_BLOCK:'
const TOKEN_SUFFIX = '@@'

export interface TimelineTask {
  id: string
  name: string
  start: string
  end?: string
  duration?: number
  dependencies?: string | string[]
  progress?: number
}

export interface TimelineData {
  title: string
  tasks: TimelineTask[]
}

interface TimelinePayload {
  source: string
  data: TimelineData
}

interface TimelineSource {
  data: TimelineData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeTimelinePayload(payload: unknown): TimelinePayload | null {
  if (!isRecord(payload)) return null
  if (typeof payload.source !== 'string') return null
  if (!isRecord(payload.data)) return null
  const data = payload.data as Record<string, unknown>
  if (typeof data.title !== 'string') return null
  if (!Array.isArray(data.tasks)) return null
  return { source: payload.source, data: data as unknown as TimelineData }
}

function readTimelineFenceMetadata(info: string): Record<string, never> | null {
  const language = info.trim().split(/\s+/u)[0]?.toLowerCase()
  return language === 'timeline' || language === 'gantt' || language === 'plan' ? {} : null
}

function parseTimelineYaml(diagram: string): TimelineData | null {
  const lines = diagram.split('\n')
  let title = 'Timeline'
  const tasks: TimelineTask[] = []
  let currentTask: Partial<TimelineTask> | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Title: "..."
    const titleMatch = trimmed.match(/^title:\s*"([^"]+)"/i)
    if (titleMatch) {
      title = titleMatch[1]
      continue
    }

    // Task definition
    const taskMatch = trimmed.match(/^-\s*id:\s*(\S+)/)
    if (taskMatch) {
      if (currentTask && currentTask.id) {
        tasks.push(currentTask as TimelineTask)
      }
      currentTask = { id: taskMatch[1] }
      continue
    }

    if (!currentTask) continue

    // name: "..."
    const nameMatch = trimmed.match(/^\s+name:\s*"([^"]+)"/)
    if (nameMatch) {
      currentTask.name = nameMatch[1]
      continue
    }

    // start: YYYY-MM-DD
    const startMatch = trimmed.match(/^\s+start:\s*(\d{4}-\d{2}-\d{2})/)
    if (startMatch) {
      currentTask.start = startMatch[1]
      continue
    }

    // end: YYYY-MM-DD
    const endMatch = trimmed.match(/^\s+end:\s*(\d{4}-\d{2}-\d{2})/)
    if (endMatch) {
      currentTask.end = endMatch[1]
      continue
    }

    // duration: N
    const durationMatch = trimmed.match(/^\s+duration:\s*(\d+)/)
    if (durationMatch) {
      currentTask.duration = parseInt(durationMatch[1], 10)
      continue
    }

    // progress: N
    const progressMatch = trimmed.match(/^\s+progress:\s*(\d+)/)
    if (progressMatch) {
      currentTask.progress = parseInt(progressMatch[1], 10)
      continue
    }

    // dependencies: id or [id1, id2]
    const depMatch = trimmed.match(/^\s+dependencies:\s*(.+)/)
    if (depMatch) {
      const depValue = depMatch[1].trim()
      if (depValue.startsWith('[')) {
        currentTask.dependencies = depValue
          .slice(1, -1)
          .split(',')
          .map(d => d.trim().replace(/^["']|["']$/g, ''))
      } else {
        currentTask.dependencies = depValue.replace(/^["']|["']$/g, '')
      }
    }
  }

  if (currentTask && currentTask.id) {
    tasks.push(currentTask as TimelineTask)
  }

  return tasks.length > 0 ? { title, tasks } : null
}

function buildTimelinePayload({ lines, start, end }: DurableFencePayloadInput): TimelinePayload {
  const diagram = lines.slice(start + 1, end).join('\n')
  const data = parseTimelineYaml(diagram) ?? { title: 'Timeline', tasks: [] }
  return {
    source: lines.slice(start, end + 1).join(''),
    data,
  }
}

function buildTimelineBlock(block: BlockLike, payload: TimelinePayload): BlockLike {
  return {
    ...block,
    type: TIMELINE_BLOCK_TYPE,
    props: {
      ...(block.props ?? {}),
      source: payload.source,
      data: JSON.stringify(payload.data),
    },
    content: undefined,
    children: [],
  }
}

export function timelineFenceSource({ data }: TimelineSource): string {
  const lines = [`title: "${data.title}"`, 'tasks:']
  for (const task of data.tasks) {
    lines.push(`  - id: ${task.id}`)
    lines.push(`    name: "${task.name}"`)
    if (task.start) lines.push(`    start: ${task.start}`)
    if (task.end) lines.push(`    end: ${task.end}`)
    if (task.duration) lines.push(`    duration: ${task.duration}`)
    if (task.progress !== undefined) lines.push(`    progress: ${task.progress}`)
    if (task.dependencies) {
      const deps = Array.isArray(task.dependencies) ? task.dependencies : [task.dependencies]
      lines.push(`    dependencies: [${deps.join(', ')}]`)
    }
  }
  return '```timeline\n' + lines.join('\n') + '\n```'
}

function readTimelineCodeBlock(block: BlockLike): TimelinePayload | null {
  if (block.type !== 'codeBlock') return null

  const diagram = readInlineText(block.content)
  if (diagram === null) return null

  const language = readCodeBlockLanguage({ block })
  if (!readTimelineFenceMetadata(language ?? '')) return null

  const data = parseTimelineYaml(diagram)
  if (!data) return null

  return {
    data,
    source: timelineFenceSource({ data }),
  }
}

function isTimelineBlock(block: BlockLike): boolean {
  return block.type === TIMELINE_BLOCK_TYPE
    && typeof block.props?.source === 'string'
    && typeof block.props?.data === 'string'
}

function timelineMarkdown(block: BlockLike): string {
  const source = block.props?.source
  if (source) return source

  const dataStr = block.props?.data
  if (dataStr) {
    try {
      const data = JSON.parse(dataStr) as TimelineData
      return timelineFenceSource({ data })
    } catch {
      // Fall through to default
    }
  }

  return '```timeline\n```'
}

export const timelineMarkdownCodec: DurableBlockCodec = {
  tokenPrefix: TOKEN_PREFIX,
  tokenSuffix: TOKEN_SUFFIX,
  readFenceMetadata: readTimelineFenceMetadata,
  buildPayload: buildTimelinePayload,
  decodePayload: decodeTimelinePayload,
  buildBlock: (block, payload) => buildTimelineBlock(block, payload as TimelinePayload),
  readCodeBlock: readTimelineCodeBlock,
  isBlock: isTimelineBlock,
  serializeBlock: timelineMarkdown,
}

export function preProcessTimelineMarkdown({ markdown }: { markdown: string }): string {
  return preProcessDurableMarkdownBlocks({ markdown, codecs: [timelineMarkdownCodec] })
}

export function injectTimelineInBlocks(blocks: unknown[]): unknown[] {
  return injectDurableMarkdownBlocks({ blocks, codecs: [timelineMarkdownCodec] })
}
