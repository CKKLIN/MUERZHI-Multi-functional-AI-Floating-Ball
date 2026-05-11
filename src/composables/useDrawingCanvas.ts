import { ref } from 'vue'

export interface Point {
  x: number
  y: number
}

export interface Stroke {
  points: Point[]
  color: string
  width: number
  tool: 'pen' | 'eraser' | 'arrow' | 'rectangle'
}

export function useDrawingCanvas() {
  const isDrawing = ref(false)
  const strokes = ref<Stroke[]>([])
  const currentStroke = ref<Stroke | null>(null)
  const tool = ref<'pen' | 'eraser' | 'arrow' | 'rectangle'>('pen')
  const color = ref('#ff0000')
  const lineWidth = ref(3)
  const startPos = ref<Point | null>(null)

  function startStroke(x: number, y: number) {
    isDrawing.value = true
    startPos.value = { x, y }

    if (tool.value === 'pen' || tool.value === 'eraser') {
      currentStroke.value = {
        points: [{ x, y }],
        color: tool.value === 'eraser' ? '#000' : color.value,
        width: tool.value === 'eraser' ? lineWidth.value * 3 : lineWidth.value,
        tool: tool.value,
      }
    }
  }

  function addPoint(x: number, y: number) {
    if (!isDrawing.value) return

    if (tool.value === 'pen' || tool.value === 'eraser') {
      currentStroke.value?.points.push({ x, y })
    }
  }

  function endStroke(x: number, y: number) {
    if (!isDrawing.value) return
    isDrawing.value = false

    if (tool.value === 'arrow') {
      if (startPos.value) {
        currentStroke.value = {
          points: [startPos.value, { x, y }],
          color: color.value,
          width: lineWidth.value,
          tool: 'arrow',
        }
      }
    } else if (tool.value === 'rectangle') {
      if (startPos.value) {
        currentStroke.value = {
          points: [startPos.value, { x, y }],
          color: color.value,
          width: lineWidth.value,
          tool: 'rectangle',
        }
      }
    }

    if (currentStroke.value) {
      strokes.value.push(currentStroke.value)
      currentStroke.value = null
    }
    startPos.value = null
  }

  function undoLastStroke() {
    strokes.value.pop()
  }

  function clearStrokes() {
    strokes.value = []
  }

  function redraw(ctx: CanvasRenderingContext2D) {
    const allStrokes = currentStroke.value
      ? [...strokes.value, currentStroke.value]
      : strokes.value

    for (const stroke of allStrokes) {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
      }

      ctx.strokeStyle = stroke.color
      ctx.fillStyle = stroke.color
      ctx.lineWidth = stroke.width

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        if (stroke.points.length < 2) {
          ctx.beginPath()
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
          ctx.stroke()
        }
      } else if (stroke.tool === 'arrow' && stroke.points.length === 2) {
        const [start, end] = stroke.points
        const dx = end.x - start.x
        const dy = end.y - start.y
        const angle = Math.atan2(dy, dx)
        const headLen = 12

        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        // 箭头头部
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
      } else if (stroke.tool === 'rectangle' && stroke.points.length === 2) {
        const [start, end] = stroke.points
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
      }

      ctx.restore()
    }
  }

  return {
    isDrawing,
    strokes,
    currentStroke,
    tool,
    color,
    lineWidth,
    startPos,
    startStroke,
    addPoint,
    endStroke,
    undoLastStroke,
    clearStrokes,
    redraw,
  }
}
