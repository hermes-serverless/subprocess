import getStream from 'get-stream'
import path from 'path'
import { PassThrough } from 'stream'
import { Subprocess } from '..'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH

const KB = 1000
const MB = 1000 * KB

const go = async (p: Subprocess, { input, stdout, stderr, all }: any, expectErr?: boolean) => {
  const stdoutPromise = stdout != null ? getStream(stdout) : Promise.resolve('')
  const stderrPromise = stderr != null ? getStream(stderr) : Promise.resolve('')
  const allPromise = all != null ? getStream(all) : Promise.resolve('')
  try {
    await p.run({
      input,
      stdout,
      stderr,
      all,
    })
  } catch (err) {
    if (!expectErr) throw err
  }
  return {
    stdoutStr: await stdoutPromise,
    stderrStr: await stderrPromise,
    allStr: await allPromise,
  }
}

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
