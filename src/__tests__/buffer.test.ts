import path from 'path'
import { PassThrough } from 'stream'
import { Subprocess } from '..'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH
const KB = 1000
const MB = 1000 * KB

const checkBuffers = (p: any, { stdout = '', stderr = '' }) => {
  expect(p.stdoutBuffer).toBe(stdout)
  expect(p.stderrBuffer).toBe(stderr)
}

describe('Buffer should work on success', () => {
  test('stdin -> stdout', async () => {
    const p = new Subprocess('stdin', { args: ['stdout'] })
    const input = new PassThrough()
    input.end('skrattar du förlorar du')
    await p.run({ input })
    checkBuffers(p, { stdout: 'skrattar du förlorar du' })
  })

  test('stdin -> stderr', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.end('skrattar du förlorar du')
    await p.run({ input })
    checkBuffers(p, { stderr: 'skrattar du förlorar du' })
  })

  test('stdin -> stdout with other stdio streams', async () => {
    const p = new Subprocess('stdin', { args: ['stdout'] })
    const input = new PassThrough()
    input.end('skrattar du förlorar du')
    await p.run({ input, stdout: new PassThrough(), stderr: new PassThrough() })
    checkBuffers(p, { stdout: 'skrattar du förlorar du' })
  })

  test('stdin -> stderr with other stdio streams', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.end('skrattar du förlorar du')
    await p.run({ input, stdout: new PassThrough(), stderr: new PassThrough() })
    checkBuffers(p, { stderr: 'skrattar du förlorar du' })
  })

  test('stdin -> stdout with stderr stream', async () => {
    const p = new Subprocess('stdin', { args: ['stdout'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stderr: new PassThrough() })
    checkBuffers(p, { stdout: 'skrattar du förlorar du' })
  })

  test('stdin -> stderr with stderr streams', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stderr: new PassThrough() })
    checkBuffers(p, { stderr: 'skrattar du förlorar du' })
  })

  test('stdin -> stdout with stderr stream', async () => {
    const p = new Subprocess('stdin', { args: ['stdout'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stderr: new PassThrough() })
    expect(p.stdoutBuffer).toBe('skrattar du förlorar du')
    expect(p.stderrBuffer).toBe('')
  })

  test('stdin -> stderr with stdout streams', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stdout: new PassThrough() })
    checkBuffers(p, { stderr: 'skrattar du förlorar du' })
  })

  test('stdin -> stderr', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input })
    checkBuffers(p, { stderr: 'skrattar du förlorar du' })
  })

  test('5kb -> stdout', async () => {
    const p = new Subprocess('max-buffer', { args: ['stdout', '5000'] })
    await p.run()
    checkBuffers(p, { stdout: '.'.repeat(5000) + '\n' })
  })

  test('5kb -> stderr', async () => {
    const p = new Subprocess('max-buffer', { args: ['stderr', '5000'] })
    await p.run()
    checkBuffers(p, { stderr: '.'.repeat(5000) + '\n' })
  })

  test('echo-script', async () => {
    const p = new Subprocess('echo-script', { args: ['oi', 'eu', 'sou', 'o', 'goku'] })
    await p.run()
    checkBuffers(p, { stdout: ['oi', 'eu', 'sou', 'o', 'goku'].join('\n') + '\n' })
  })

  test('echo', async () => {
    const p = new Subprocess('echo', { args: ['oi'] })
    await p.run()
    checkBuffers(p, { stdout: 'oi\n' })
  })

  test('hello.sh', async () => {
    const p = new Subprocess('hello.sh')
    await p.run()
    checkBuffers(p, { stdout: 'Hello World\n' })
  })

  test('command with space', async () => {
    const p = new Subprocess('command with space', { args: ['ich', 'bin', 'du'] })
    await p.run()
    checkBuffers(p, { stdout: ['ich', 'bin', 'du'].join('\n') + '\n' })
  })
})

describe('Buffer limit should work', () => {
  test('250mb -> stdout', async () => {
    const p = new Subprocess('max-buffer', {
      args: ['stdout', `${250 * MB}`],
      maxBufferSize: 256 * KB,
    })

    await p.run()
    checkBuffers(p, { stdout: '.'.repeat(256 * KB - 1) + '\n' })
  }, 10000)

  test('250mb -> stderr', async () => {
    const p = new Subprocess('max-buffer', {
      args: ['stderr', `${250 * MB}`],
      maxBufferSize: 256 * KB,
    })

    await p.run()
    checkBuffers(p, { stderr: '.'.repeat(256 * KB - 1) + '\n' })
  }, 10000)
})

describe('Buffer should work on manual kill', () => {
  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py')
    expect.assertions(2)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '14 characters\n15 RECEIVED\n' })
    }
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py')
    setTimeout(p.kill, 1000)
    await p.run()
    checkBuffers(p, { stdout: '14 characters\n15 RECEIVED\n' })
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py')
    expect.assertions(2)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '14 characters\n' })
    }
  })

  test('mixed-output-sleep', async () => {
    const p = new Subprocess('mixed-output-sleep', { args: ['100'] })
    expect.assertions(2)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '.'.repeat(100), stderr: '+'.repeat(100) })
    }
  })
})

describe('Buffer should work on limit', () => {
  test('mixed-output1', async () => {
    const p = new Subprocess('mixed-output', { args: ['9', '2', '0'], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '.'.repeat(10), stderr: '+'.repeat(9) })
    }
  })

  test('mixed-output2', async () => {
    const p = new Subprocess('mixed-output', { args: ['9', '0', '2'], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '.'.repeat(9), stderr: '+'.repeat(10) })
    }
  })

  test('mixed-output3', async () => {
    const p = new Subprocess('mixed-output', { args: ['10', '10', '10'], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '.'.repeat(10), stderr: '+'.repeat(10) })
    }
  })

  test('echo', async () => {
    const p = new Subprocess('echo', { args: ['.'.repeat(100)], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '.'.repeat(10) })
    }
  })

  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py', { maxOutputSize: 13 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '14 characters' })
    }
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py', { maxOutputSize: 13 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '14 characters' })
    }
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py', { maxOutputSize: 13 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      checkBuffers(p, { stdout: '14 characters' })
    }
  })
})

describe('Buffer should work on non-zero exit code', () => {
  test('fail', async () => {
    const p = new Subprocess('fail')
    expect.assertions(3)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(false)
      expect(p.checkError()).not.toBeUndefined()
      expect(p.processResult.exitCode).toBe(2)
    }
  })

  test('exit', async () => {
    const p = new Subprocess('exit', { args: ['3'] })
    expect.assertions(3)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(false)
      expect(p.checkError()).not.toBeUndefined()
      expect(p.processResult.exitCode).toBe(3)
    }
  })
})
