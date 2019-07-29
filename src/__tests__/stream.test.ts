import path from 'path'
import { PassThrough } from 'stream'
import { Subprocess } from '..'
import { checkStreamEnd, go } from './utils'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH

const KB = 1000
const MB = 1000 * KB

describe('Stdio and Stderr should work on general cases', () => {
  test('hello', async () => {
    const p = new Subprocess('hello.sh')
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const { stdoutStr, stderrStr } = await go(p, { stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('Hello World\n')
    expect(stderrStr).toBe('')
  })

  test('stdin', async () => {
    const p = new Subprocess('stdin')
    const input = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    input.end('ich bin du!')
    const { stdoutStr, stderrStr } = await go(p, { input, stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('ich bin du!')
    expect(stderrStr).toBe('')
  })

  test('mixed-output', async () => {
    const p = new Subprocess('mixed-output', { args: ['100'] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('.'.repeat(100))
    expect(allStr).toBe('.'.repeat(100) + '+'.repeat(100))
    expect(stderrStr).toBe('+'.repeat(100))
  })

  test('stdin-all', async () => {
    const p = new Subprocess('stdin')
    const input = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    input.end('ich bin du!')
    const { stdoutStr, stderrStr, allStr } = await go(p, { input, stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('ich bin du!')
    expect(allStr).toBe('ich bin du!')
    expect(stderrStr).toBe('')
  })

  test('stdin -> stderr', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    input.end('skrattar du förlorar du')
    const { stdoutStr, stderrStr, allStr } = await go(p, { input, stdout, stderr, all })
    expect(stdoutStr).toBe('')
    expect(stderrStr).toBe('skrattar du förlorar du')
    expect(allStr).toBe('skrattar du förlorar du')
  })

  test('10kb -> stdout', async () => {
    const p = new Subprocess('max-buffer', { args: ['stdout', '10000'] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('.'.repeat(10000) + '\n')
    expect(allStr).toBe('.'.repeat(10000) + '\n')
    expect(stderrStr).toBe('')
  })

  test('10kb -> stderr', async () => {
    const p = new Subprocess('max-buffer', { args: ['stderr', '10000'] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(stderrStr).toBe('.'.repeat(10000) + '\n')
    expect(allStr).toBe('.'.repeat(10000) + '\n')
    expect(stdoutStr).toBe('')
  })

  test('5mb -> stdout', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stdout', `${size}`] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('.'.repeat(size) + '\n')
    expect(allStr).toBe('.'.repeat(size) + '\n')
    expect(stderrStr).toBe('')
  })

  test('5mb -> stderr', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stderr', `${size}`] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(stderrStr).toBe('.'.repeat(size) + '\n')
    expect(allStr).toBe('.'.repeat(size) + '\n')
    expect(stdoutStr).toBe('')
  })
})

describe('Streams work on non-zero code return', () => {
  test('fail-message', async () => {
    const p = new Subprocess('fail-message')
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const { stdoutStr, stderrStr } = await go(p, { stdout, stderr }, true)
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('fail\n')
    expect(stderrStr).toBe('')
  })
})

describe('Stream with end disabled work when limit is not reached', () => {
  test('No output - streams end are all false', async () => {
    const p = new Subprocess('mixed-output', { args: ['0', '0', '0'] })
    const stdout = { stream: new PassThrough(), end: false }
    const stderr = { stream: new PassThrough(), end: false }
    const all = { stream: new PassThrough(), end: false }
    const promise = go(p, { stdout, stderr, all }, true)
    const checks = Promise.all([
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, ''),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, ''),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(allStr.length).toBeGreaterThanOrEqual(endings[2].length)
  })

  test('5mb -> stdout - stdout end is false', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stdout', `${size}`] })
    const stdout = { stream: new PassThrough(), end: false }
    const stderr = new PassThrough()
    const all = new PassThrough()
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(size) + '\n'
    const checks = Promise.all([
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, txt),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, ''),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(allStr.length).toBeGreaterThanOrEqual(txt.length + endings[2].length)
  })

  test('5mb -> stdout - stderr end is false', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stdout', `${size}`] })
    const stdout = new PassThrough()
    const stderr = { stream: new PassThrough(), end: false }
    const all = new PassThrough()
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(size) + '\n'
    const checks = Promise.all([
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, txt),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, ''),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(allStr.length).toBeGreaterThanOrEqual(txt.length + endings[2].length)
  })

  test('5mb -> stderr - stderr end is false', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stderr', `${size}`] })
    const stdout = new PassThrough()
    const stderr = { stream: new PassThrough(), end: false }
    const all = new PassThrough()
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(size) + '\n'
    const checks = Promise.all([
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, ''),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, txt),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(allStr.length).toBeGreaterThanOrEqual(txt.length + endings[2].length)
  })

  test('5mb -> stdout - all end is false', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stdout', `${size}`] })
    const stdout = { stream: new PassThrough(), end: true }
    const stderr = new PassThrough()
    const all = { stream: new PassThrough(), end: false }
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(size) + '\n'
    const checks = Promise.all([
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, txt),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, ''),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(allStr.length).toBeGreaterThanOrEqual(txt.length + endings[2].length)
  })
})

describe('Stream with end disabled work when limit is reached', () => {
  test('5mb -> stdout - stdout end is false', async () => {
    const maxOutputSize = 1 * MB
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stdout', `${size}`] })
    const stdout = [
      { stream: new PassThrough(), end: false },
      { stream: new PassThrough(), end: true },
    ]
    const stderr = new PassThrough()
    const all = new PassThrough()
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(maxOutputSize)
    const checks = Promise.all([
      checkStreamEnd(p, stdout[0], async () => (await promise).stdoutStr[0], txt),
      checkStreamEnd(p, stdout[1], async () => (await promise).stdoutStr[1], txt),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, ''),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(true)
    expect(allStr.length).toBeGreaterThanOrEqual(txt.length + endings[3].length)
  })

  test('5mb -> stderr - stderr end is false', async () => {
    const maxOutputSize = 1 * MB
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stderr', `${size}`] })
    const stderr = [
      { stream: new PassThrough(), end: false },
      { stream: new PassThrough(), end: true },
    ]
    const stdout = new PassThrough()
    const all = new PassThrough()
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(maxOutputSize)
    const checks = Promise.all([
      checkStreamEnd(p, stderr[0], async () => (await promise).stderrStr[0], txt),
      checkStreamEnd(p, stderr[1], async () => (await promise).stderrStr[1], txt),
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, ''),
      checkStreamEnd(p, all, async () => (await promise).allStr),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(true)
    expect(allStr.length).toBeGreaterThanOrEqual(txt.length + endings[3].length)
  })

  test('5mb -> stderr - all end is false', async () => {
    const maxOutputSize = 1 * MB
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stderr', `${size}`] })
    const stderr = new PassThrough()
    const stdout = new PassThrough()
    const all = [
      { stream: new PassThrough(), end: false },
      { stream: new PassThrough(), end: true },
    ]
    const promise = go(p, { stdout, stderr, all }, true)
    const txt = '.'.repeat(maxOutputSize)
    const checks = Promise.all([
      checkStreamEnd(p, stdout, async () => (await promise).stdoutStr, ''),
      checkStreamEnd(p, stderr, async () => (await promise).stderrStr, txt),
      checkStreamEnd(p, all[0], async () => (await promise).allStr[0]),
      checkStreamEnd(p, all[1], async () => (await promise).allStr[1]),
    ])

    const endings = await checks
    const { allStr } = await promise
    expect(p.hasReachedLimit).toBe(true)
    expect(allStr[0].length).toBeGreaterThanOrEqual(txt.length + endings[2].length)
    expect(allStr[1].length).toBeGreaterThanOrEqual(txt.length + endings[3].length)
  })
})

describe('Streams work when manual kill', () => {
  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py')
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const promise = go(p, { stdout, stderr }, true)
    setTimeout(p.kill, 1000)
    const { stdoutStr, stderrStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('14 characters\n15 RECEIVED\n')
    expect(stderrStr).toBe('')
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py')
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const promise = go(p, { stdout, stderr }, false)
    setTimeout(p.kill, 1000)
    const { stdoutStr, stderrStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('14 characters\n15 RECEIVED\n')
    expect(stderrStr).toBe('')
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py')
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const promise = go(p, { stdout, stderr }, true)
    setTimeout(p.kill, 1000)
    const { stdoutStr, stderrStr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    expect(stdoutStr).toBe('14 characters\n')
    expect(stderrStr).toBe('')
  })

  test('End is false', () => {})
})

describe('Streams work until limit', () => {
  test('200 mb -> stdout without all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stdout', `${200 * MB}`] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const { stdoutStr, stderrStr } = await go(p, { stdout, stderr }, true)
    expect(p.hasReachedLimit).toBe(true)
    expect(stdoutStr).toBe('.'.repeat(maxOutputSize))
    expect(stderrStr).toBe('')
  }, 10000)

  test('200 mb -> stderr without all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stderr', `${200 * MB}`] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const { stdoutStr, stderrStr } = await go(p, { stdout, stderr }, true)
    expect(p.hasReachedLimit).toBe(true)
    expect(stdoutStr).toBe('')
    expect(stderrStr).toBe('.'.repeat(maxOutputSize))
  }, 10000)

  test('200 mb -> stdout with all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stdout', `${200 * MB}`] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all }, true)
    expect(p.hasReachedLimit).toBe(true)
    expect(stdoutStr).toBe('.'.repeat(maxOutputSize))
    expect(stderrStr).toBe('')
  }, 10000)

  test('200 mb -> stderr with all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stderr', `${200 * MB}`] })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all }, true)
    expect(p.hasReachedLimit).toBe(true)
    expect(stdoutStr).toBe('')
    expect(stderrStr).toBe('.'.repeat(maxOutputSize))
  }, 10000)
})

describe('Buffer and Streams work', () => {
  test('hello', async () => {
    const p = new Subprocess('hello.sh', { maxBufferSize: 10 })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const { stdoutStr, stderrStr } = await go(p, { stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('llo World\n')
    expect(p.stderrBuffer).toBe('')
    expect(stdoutStr).toBe('Hello World\n')
    expect(stderrStr).toBe('')
  })

  test('stdin', async () => {
    const p = new Subprocess('stdin', { maxBufferSize: 5 })
    const input = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    input.end('ich bin du!')
    const { stdoutStr, stderrStr } = await go(p, { input, stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('n du!')
    expect(p.stderrBuffer).toBe('')
    expect(stdoutStr).toBe('ich bin du!')
    expect(stderrStr).toBe('')
  })

  test('mixed-output', async () => {
    const p = new Subprocess('mixed-output', { args: ['100'], maxBufferSize: 50 })
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    const { stdoutStr, stderrStr, allStr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('.'.repeat(50))
    expect(p.stderrBuffer).toBe('+'.repeat(50))
    expect(stdoutStr).toBe('.'.repeat(100))
    expect(allStr).toBe('.'.repeat(100) + '+'.repeat(100))
    expect(stderrStr).toBe('+'.repeat(100))
  })

  test('stdin-all', async () => {
    const p = new Subprocess('stdin')
    const input = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const all = new PassThrough()
    input.end('ich bin du!')
    const { stdoutStr, stderrStr, allStr } = await go(p, { input, stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('ich bin du!')
    expect(p.stderrBuffer).toBe('')
    expect(stdoutStr).toBe('ich bin du!')
    expect(allStr).toBe('ich bin du!')
    expect(stderrStr).toBe('')
  })
})
