import { useMemo } from 'react'
import type { TimelineData, TimelineTask } from '../utils/timelineMarkdown'

interface TimelineDiagramProps {
  data: TimelineData
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTaskEndDate(task: TimelineTask): Date {
  if (task.end) {
    return parseDate(task.end)
  }
  if (task.duration && task.start) {
    const start = parseDate(task.start)
    return new Date(start.getTime() + task.duration * 24 * 60 * 60 * 1000)
  }
  return task.start ? parseDate(task.start) : new Date()
}

function getTaskDuration(task: TimelineTask): number {
  if (!task.start) return 0
  const start = parseDate(task.start)
  const end = getTaskEndDate(task)
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
}

export function TimelineDiagram({ data }: TimelineDiagramProps) {
  const { tasks, startDate, endDate, totalDays } = useMemo(() => {
    if (data.tasks.length === 0) {
      return { tasks: [], startDate: new Date(), endDate: new Date(), totalDays: 1 }
    }

    const startDate = new Date(Math.min(...data.tasks.map(t => t.start ? parseDate(t.start).getTime() : Date.now())))
    const endDate = new Date(Math.max(...data.tasks.map(t => getTaskEndDate(t).getTime())))
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))

    return { tasks: data.tasks, startDate, endDate, totalDays }
  }, [data.tasks])

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-sm italic">
        No tasks to display. Add tasks to your timeline.
      </div>
    )
  }

  return (
    <div className="timeline-diagram p-4 bg-card border rounded-lg overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4">{data.title}</h3>

      <div className="min-w-[600px]">
        {/* Header with dates */}
        <div className="flex mb-2">
          <div className="w-48 flex-shrink-0 text-xs text-muted-foreground font-medium">Task</div>
          <div className="flex-1 flex text-xs text-muted-foreground">
            <span>{formatDate(startDate)}</span>
            <span className="ml-auto">{formatDate(endDate)}</span>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {tasks.map((task) => {
            const taskStart = task.start ? parseDate(task.start) : startDate
            const offsetDays = Math.max(0, Math.floor((taskStart.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
            const duration = getTaskDuration(task)
            const leftPercent = (offsetDays / totalDays) * 100
            const widthPercent = (duration / totalDays) * 100
            const progress = task.progress ?? 0

            return (
              <div key={task.id} className="flex items-center">
                <div className="w-48 flex-shrink-0 pr-4">
                  <div className="text-sm font-medium truncate">{task.name}</div>
                  <div className="text-xs text-muted-foreground">{progress}% complete</div>
                </div>

                <div className="flex-1 relative h-8 bg-muted rounded overflow-hidden">
                  {/* Task bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded bg-primary/80"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(2, widthPercent)}%`,
                    }}
                  >
                    {/* Progress indicator */}
                    <div
                      className="h-full bg-primary rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Dependency indicators */}
                  {task.dependencies && (
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                        <polygon points="0,4 8,0 8,8" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary rounded" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/40 rounded" />
            <span>Remaining</span>
          </div>
        </div>
      </div>
    </div>
  )
}
