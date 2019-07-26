import getStream from 'get-stream'
import makeArray from 'make-array'
import path from 'path'
import { PassThrough, Readable } from 'stream'
import { Subprocess } from '..'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH

const KB = 1000
const MB = 1000 * KB

const getArrStream = (streams: any) => {
  return Promise.all((makeArray(streams) as Readable[]).map(el => getStream(el)))
}

const go = async (p: Subprocess, { input, stdout, stderr, all }: any, expectErr?: boolean) => {
  const stdoutPromise = getArrStream(stdout)
  const stderrPromise = getArrStream(stderr)
  const allPromise = getArrStream(all)
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
    stdoutStrArr: await stdoutPromise,
    stderrStrArr: await stderrPromise,
    allStrArr: await allPromise,
  }
}

const checkStrArr = (strArr: string[], expectedStr: string) => {
  strArr.forEach(el => expect(el).toBe(expectedStr))
}

describe('Stdio and Stderr should work on general cases', () => {
  test('hello', async () => {
    const p = new Subprocess('hello.sh')
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr } = await go(p, { stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, 'Hello World\n')
    checkStrArr(stderrStrArr, '')
  })

  test('stdin', async () => {
    const p = new Subprocess('stdin')
    const input = new PassThrough()
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    input.end('ich bin du!')
    const { stdoutStrArr, stderrStrArr } = await go(p, { input, stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, 'ich bin du!')
    checkStrArr(stderrStrArr, '')
  })

  test('mixed-output', async () => {
    const p = new Subprocess('mixed-output', { args: ['100'] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, '.'.repeat(100))
    checkStrArr(allStrArr, '.'.repeat(100) + '+'.repeat(100))
    checkStrArr(stderrStrArr, '+'.repeat(100))
  })

  test('stdin-all', async () => {
    const p = new Subprocess('stdin')
    const input = new PassThrough()
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    input.end('ich bin du!')
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { input, stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, 'ich bin du!')
    checkStrArr(allStrArr, 'ich bin du!')
    checkStrArr(stderrStrArr, '')
  })

  test('stdin -> stderr', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    input.end('skrattar du förlorar du')
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { input, stdout, stderr, all })
    checkStrArr(stdoutStrArr, '')
    checkStrArr(stderrStrArr, 'skrattar du förlorar du')
    checkStrArr(allStrArr, 'skrattar du förlorar du')
  })

  test('10kb -> stdout', async () => {
    const p = new Subprocess('max-buffer', { args: ['stdout', '10000'] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, '.'.repeat(10000) + '\n')
    checkStrArr(allStrArr, '.'.repeat(10000) + '\n')
    checkStrArr(stderrStrArr, '')
  })

  test('10kb -> stderr', async () => {
    const p = new Subprocess('max-buffer', { args: ['stderr', '10000'] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stderrStrArr, '.'.repeat(10000) + '\n')
    checkStrArr(allStrArr, '.'.repeat(10000) + '\n')
    checkStrArr(stdoutStrArr, '')
  })

  test('5mb -> stdout', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stdout', `${size}`] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, '.'.repeat(size) + '\n')
    checkStrArr(allStrArr, '.'.repeat(size) + '\n')
    checkStrArr(stderrStrArr, '')
  })

  test('5mb -> stderr', async () => {
    const size = 5 * 1000 * 1000
    const p = new Subprocess('max-buffer', { args: ['stderr', `${size}`] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stderrStrArr, '.'.repeat(size) + '\n')
    checkStrArr(allStrArr, '.'.repeat(size) + '\n')
    checkStrArr(stdoutStrArr, '')
  })
})

describe('Streams work on non-zero code return', () => {
  test('fail-message', async () => {
    const p = new Subprocess('fail-message')
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr } = await go(p, { stdout, stderr }, true)
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, 'fail\n')
    checkStrArr(stderrStrArr, '')
  })
})

describe('Streams work when manual kill', () => {
  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py')
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const promise = go(p, { stdout, stderr }, true)
    setTimeout(p.kill, 1000)
    const { stdoutStrArr, stderrStrArr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, '14 characters\n15 RECEIVED\n')
    checkStrArr(stderrStrArr, '')
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py')
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const promise = go(p, { stdout, stderr }, false)
    setTimeout(p.kill, 1000)
    const { stdoutStrArr, stderrStrArr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, '14 characters\n15 RECEIVED\n')
    checkStrArr(stderrStrArr, '')
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py')
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const promise = go(p, { stdout, stderr }, true)
    setTimeout(p.kill, 1000)
    const { stdoutStrArr, stderrStrArr } = await promise
    expect(p.hasReachedLimit).toBe(false)
    checkStrArr(stdoutStrArr, '14 characters\n')
    checkStrArr(stderrStrArr, '')
  })
})

describe('Streams work until limit', () => {
  test('200 mb -> stdout without all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stdout', `${200 * MB}`] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr } = await go(p, { stdout, stderr }, true)
    expect(p.hasReachedLimit).toBe(true)
    checkStrArr(stdoutStrArr, '.'.repeat(maxOutputSize))
    checkStrArr(stderrStrArr, '')
  }, 10000)

  test('200 mb -> stderr without all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stderr', `${200 * MB}`] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr } = await go(p, { stdout, stderr }, true)
    expect(p.hasReachedLimit).toBe(true)
    checkStrArr(stdoutStrArr, '')
    checkStrArr(stderrStrArr, '.'.repeat(maxOutputSize))
  }, 10000)

  test('200 mb -> stdout with all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stdout', `${200 * MB}`] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all }, true)
    expect(p.hasReachedLimit).toBe(true)
    checkStrArr(stdoutStrArr, '.'.repeat(maxOutputSize))
    checkStrArr(stderrStrArr, '')
    expect(allStrArr[0].length).toBeGreaterThanOrEqual(maxOutputSize)
    expect(allStrArr[1].length).toBeGreaterThanOrEqual(maxOutputSize)
    checkStrArr(allStrArr, '.'.repeat(allStrArr[0].length))
  }, 10000)

  test('200 mb -> stderr with all', async () => {
    const maxOutputSize = 10 * MB
    const p = new Subprocess('max-buffer', { maxOutputSize, args: ['stderr', `${200 * MB}`] })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all }, true)
    expect(p.hasReachedLimit).toBe(true)
    checkStrArr(stdoutStrArr, '')
    checkStrArr(stderrStrArr, '.'.repeat(maxOutputSize))
    expect(allStrArr[0].length).toBeGreaterThanOrEqual(maxOutputSize)
    expect(allStrArr[1].length).toBeGreaterThanOrEqual(maxOutputSize)
    checkStrArr(allStrArr, '.'.repeat(allStrArr[0].length))
  }, 10000)
})

describe('Buffer and Streams work', () => {
  test('hello', async () => {
    const p = new Subprocess('hello.sh', { maxBufferSize: 10 })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr } = await go(p, { stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('llo World\n')
    expect(p.stderrBuffer).toBe('')
    checkStrArr(stdoutStrArr, 'Hello World\n')
    checkStrArr(stderrStrArr, '')
  })

  test('stdin', async () => {
    const p = new Subprocess('stdin', { maxBufferSize: 5 })
    const input = new PassThrough()
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    input.end('ich bin du!')
    const { stdoutStrArr, stderrStrArr } = await go(p, { input, stdout, stderr })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('n du!')
    expect(p.stderrBuffer).toBe('')
    checkStrArr(stdoutStrArr, 'ich bin du!')
    checkStrArr(stderrStrArr, '')
  })

  test('mixed-output', async () => {
    const p = new Subprocess('mixed-output', { args: ['100'], maxBufferSize: 50 })
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('.'.repeat(50))
    expect(p.stderrBuffer).toBe('+'.repeat(50))
    checkStrArr(stdoutStrArr, '.'.repeat(100))
    checkStrArr(allStrArr, '.'.repeat(100) + '+'.repeat(100))
    checkStrArr(stderrStrArr, '+'.repeat(100))
  })

  test('stdin-all', async () => {
    const p = new Subprocess('stdin')
    const input = new PassThrough()
    const stdout = [new PassThrough(), new PassThrough()]
    const stderr = [new PassThrough(), new PassThrough()]
    const all = [new PassThrough(), new PassThrough()]
    input.end('ich bin du!')
    const { stdoutStrArr, stderrStrArr, allStrArr } = await go(p, { input, stdout, stderr, all })
    expect(p.hasReachedLimit).toBe(false)
    expect(p.stdoutBuffer).toBe('ich bin du!')
    expect(p.stderrBuffer).toBe('')
    checkStrArr(stdoutStrArr, 'ich bin du!')
    checkStrArr(allStrArr, 'ich bin du!')
    checkStrArr(stderrStrArr, '')
  })
})
