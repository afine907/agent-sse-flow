import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRecordingBuffer, downloadJSONL, parseJSONL } from '../src/recording'

describe('createRecordingBuffer', () => {
  it('starts in non-recording state', () => {
    const buffer = createRecordingBuffer()
    expect(buffer.isRecording).toBe(false)
    expect(buffer.count).toBe(0)
    expect(buffer.startTime).toBeNull()
  })

  it('starts recording', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    expect(buffer.isRecording).toBe(true)
    expect(buffer.startTime).toBeGreaterThan(0)
    expect(buffer.count).toBe(0)
  })

  it('stops recording', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.stop()
    expect(buffer.isRecording).toBe(false)
  })

  it('pushes events while recording', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"start","message":"Hello"}')
    buffer.push('{"type":"message","message":"World"}')
    expect(buffer.count).toBe(2)
  })

  it('ignores pushes when not recording', () => {
    const buffer = createRecordingBuffer()
    buffer.push('{"type":"start","message":"Hello"}')
    expect(buffer.count).toBe(0)
  })

  it('ignores pushes after stop', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"start"}')
    buffer.stop()
    buffer.push('{"type":"end"}')
    expect(buffer.count).toBe(1)
  })

  it('produces valid JSONL output', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"start","message":"Hello"}')
    buffer.push('{"type":"end","message":"Bye"}')
    buffer.stop()

    const jsonl = buffer.toJSONL()
    const lines = jsonl.split('\n').filter(l => l.trim())
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0])).toEqual({ type: 'start', message: 'Hello' })
    expect(JSON.parse(lines[1])).toEqual({ type: 'end', message: 'Bye' })
  })

  it('returns empty JSONL when no events captured', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.stop()
    expect(buffer.toJSONL()).toBe('')
  })

  it('returns copy of lines via getLines', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"start"}')
    const lines = buffer.getLines()
    expect(lines).toEqual(['{"type":"start"}'])
    // Modifying returned array should not affect buffer
    lines.push('{"type":"injected"}')
    expect(buffer.count).toBe(1)
  })

  it('resets the buffer', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"start"}')
    buffer.reset()
    expect(buffer.isRecording).toBe(false)
    expect(buffer.count).toBe(0)
    expect(buffer.startTime).toBeNull()
    expect(buffer.toJSONL()).toBe('')
  })

  it('restart clears previous data', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"old"}')
    buffer.stop()

    buffer.start()
    buffer.push('{"type":"new"}')
    buffer.stop()

    const jsonl = buffer.toJSONL()
    expect(jsonl).toContain('"type":"new"')
    expect(jsonl).not.toContain('"type":"old"')
    expect(buffer.count).toBe(1)
  })
})

describe('downloadJSONL', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    clickSpy = vi.fn()
    mockAnchor = { href: '', download: '', click: clickSpy }

    // Mock URL.createObjectURL and revokeObjectURL on the global URL object
    if (!URL.createObjectURL) {
      (URL as any).createObjectURL = vi.fn(() => 'blob:mock')
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    }
    if (!URL.revokeObjectURL) {
      (URL as any).revokeObjectURL = vi.fn()
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    }

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement
      return document.createElement(tag)
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers a download with auto-generated filename', () => {
    downloadJSONL('{"type":"start"}\n')
    expect(clickSpy).toHaveBeenCalled()
  })

  it('uses custom filename when provided', () => {
    downloadJSONL('data', 'custom.jsonl')
    expect(mockAnchor.download).toBe('custom.jsonl')
  })
})

describe('parseJSONL', () => {
  it('parses valid JSONL lines', () => {
    const jsonl = '{"type":"start","message":"Hello"}\n{"type":"end","message":"Bye"}\n'
    const result = parseJSONL(jsonl)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ type: 'start', message: 'Hello' })
    expect(result[1]).toEqual({ type: 'end', message: 'Bye' })
  })

  it('skips empty lines', () => {
    const jsonl = '{"type":"start"}\n\n\n{"type":"end"}\n'
    const result = parseJSONL(jsonl)
    expect(result).toHaveLength(2)
  })

  it('skips malformed JSON lines', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const jsonl = '{"type":"start"}\nnot-json\n{"type":"end"}\n'
    const result = parseJSONL(jsonl)
    expect(result).toHaveLength(2)
    consoleSpy.mockRestore()
  })

  it('skips non-object JSON values', () => {
    const jsonl = '"string"\n123\n{"type":"start"}\n'
    const result = parseJSONL(jsonl)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: 'start' })
  })

  it('returns empty array for empty input', () => {
    expect(parseJSONL('')).toEqual([])
  })

  it('handles JSONL without trailing newline', () => {
    const jsonl = '{"type":"start"}\n{"type":"end"}'
    const result = parseJSONL(jsonl)
    expect(result).toHaveLength(2)
  })

  it('roundtrips with createRecordingBuffer', () => {
    const buffer = createRecordingBuffer()
    buffer.start()
    buffer.push('{"type":"start","message":"Hello"}')
    buffer.push('{"type":"tool_call","tool":"search","args":{"q":"test"}}')
    buffer.push('{"type":"end","message":"Done"}')
    buffer.stop()

    const jsonl = buffer.toJSONL()
    const parsed = parseJSONL(jsonl)
    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toEqual({ type: 'start', message: 'Hello' })
    expect(parsed[1]).toEqual({ type: 'tool_call', tool: 'search', args: { q: 'test' } })
    expect(parsed[2]).toEqual({ type: 'end', message: 'Done' })
  })
})
