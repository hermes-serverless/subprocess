import path from 'path'
import { PassThrough } from 'stream'
import { Subprocess } from '..'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH
const KB = 1000
const MB = 1000 * KB

describe('Buffer should work on success', () => {
  test('stdin -> stdout', async () => {
    const p = new Subprocess('stdin', { args: ['stdout'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input })
    expect(p.stdoutBuffer).toBe('skrattar du förlorar du')
    expect(p.stderrBuffer).toBe('')
  })

  test('stdin -> stderr', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input })
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('skrattar du förlorar du')
  })

  test('stdin -> stdout with other stdio streams', async () => {
    const p = new Subprocess('stdin', { args: ['stdout'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stdout: new PassThrough(), stderr: new PassThrough() })
    expect(p.stdoutBuffer).toBe('skrattar du förlorar du')
    expect(p.stderrBuffer).toBe('')
  })

  test('stdin -> stderr with other stdio streams', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stdout: new PassThrough(), stderr: new PassThrough() })
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('skrattar du förlorar du')
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

  test('stdin -> stderr with stderr streams', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input, stderr: new PassThrough() })
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('skrattar du förlorar du')
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
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('skrattar du förlorar du')
  })

  test('stdin -> stderr', async () => {
    const p = new Subprocess('stdin', { args: ['stderr'] })
    const input = new PassThrough()
    input.write('skrattar du förlorar du')
    input.end()
    await p.run({ input })
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('skrattar du förlorar du')
  })

  test('5kb -> stdout', async () => {
    const p = new Subprocess('max-buffer', { args: ['stdout', '5000'] })
    await p.run()
    expect(p.stdoutBuffer).toBe('.'.repeat(5000) + '\n')
    expect(p.stderrBuffer).toBe('')
  })

  test('5kb -> stderr', async () => {
    const p = new Subprocess('max-buffer', { args: ['stderr', '5000'] })
    await p.run()
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('.'.repeat(5000) + '\n')
  })

  test('echo-script', async () => {
    const p = new Subprocess('echo-script', { args: ['oi', 'eu', 'sou', 'o', 'goku'] })
    await p.run()
    expect(p.stdoutBuffer).toBe(['oi', 'eu', 'sou', 'o', 'goku'].join('\n') + '\n')
    expect(p.stderrBuffer).toBe('')
  })

  test('echo', async () => {
    const p = new Subprocess('echo', { args: ['oi'] })
    await p.run()
    expect(p.stdoutBuffer).toBe('oi\n')
    expect(p.stderrBuffer).toBe('')
  })

  test('hello.sh', async () => {
    const p = new Subprocess('hello.sh')
    await p.run()
    expect(p.stdoutBuffer).toBe('Hello World\n')
    expect(p.stderrBuffer).toBe('')
  })

  test('command with space', async () => {
    const p = new Subprocess('command with space', { args: ['ich', 'bin', 'du'] })
    await p.run()
    expect(p.stdoutBuffer).toBe(['ich', 'bin', 'du'].join('\n') + '\n')
    expect(p.stderrBuffer).toBe('')
  })
})

describe('Buffer limit should work', () => {
  test('500mb -> stdout', async () => {
    const p = new Subprocess('max-buffer', {
      args: ['stdout', `${500 * MB}`],
      maxBufferSize: 256 * KB,
    })

    await p.run()
    expect(p.stdoutBuffer).toBe('.'.repeat(256 * KB - 1) + '\n')
    expect(p.stderrBuffer).toBe('')
  }, 10000)

  test('500mb -> stderr', async () => {
    const p = new Subprocess('max-buffer', {
      args: ['stderr', `${500 * MB}`],
      maxBufferSize: 256 * KB,
    })

    await p.run()
    expect(p.stdoutBuffer).toBe('')
    expect(p.stderrBuffer).toBe('.'.repeat(256 * KB - 1) + '\n')
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
      expect(p.stdoutBuffer).toBe('14 characters\n15 RECEIVED\n')
      expect(p.stderrBuffer).toBe('')
    }
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py')
    setTimeout(p.kill, 1000)
    await p.run()
    expect(p.stdoutBuffer).toBe('14 characters\n15 RECEIVED\n')
    expect(p.stderrBuffer).toBe('')
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py')
    expect.assertions(2)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('14 characters\n')
      expect(p.stderrBuffer).toBe('')
    }
  })

  test('mixed-output-sleep', async () => {
    const p = new Subprocess('mixed-output-sleep', { args: ['100'] })
    expect.assertions(2)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('.'.repeat(100))
      expect(p.stderrBuffer).toBe('+'.repeat(100))
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
      expect(p.stdoutBuffer).toBe('.'.repeat(10))
      expect(p.stderrBuffer).toBe('+'.repeat(9))
    }
  })

  test('mixed-output2', async () => {
    const p = new Subprocess('mixed-output', { args: ['9', '0', '2'], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('.'.repeat(9))
      expect(p.stderrBuffer).toBe('+'.repeat(10))
    }
  })

  test('mixed-output3', async () => {
    const p = new Subprocess('mixed-output', { args: ['10', '10', '10'], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('.'.repeat(10))
      expect(p.stderrBuffer).toBe('+'.repeat(10))
    }
  })

  test('echo', async () => {
    const p = new Subprocess('echo', { args: ['.'.repeat(100)], maxOutputSize: 10 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('.'.repeat(10))
      expect(p.stderrBuffer).toBe('')
    }
  })

  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py', { maxOutputSize: 13 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('14 characters')
      expect(p.stderrBuffer).toBe('')
    }
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py', { maxOutputSize: 13 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('14 characters')
      expect(p.stderrBuffer).toBe('')
    }
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py', { maxOutputSize: 13 })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.stdoutBuffer).toBe('14 characters')
      expect(p.stderrBuffer).toBe('')
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
