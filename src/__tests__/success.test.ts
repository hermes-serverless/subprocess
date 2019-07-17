import path from 'path'
import { Subprocess } from '..'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH

describe('Check if Process finishes success', () => {
  test('command with space', async () => {
    const p = new Subprocess('command with space', { args: ['Hello World'] })
    await p.run()
    expect(p.checkError()).toBeUndefined()
    expect(p.processResult.exitCode).toBe(0)
    expect(p.hasReachedLimit).toBe(false)
  })

  test('echo', async () => {
    const p = new Subprocess('echo', { args: ['Hello World'] })
    await p.run()
    expect(p.checkError()).toBeUndefined()
    expect(p.processResult.exitCode).toBe(0)
    expect(p.hasReachedLimit).toBe(false)
  })

  test('hello.sh', async () => {
    const p = new Subprocess('hello.sh')
    await p.run()
    expect(p.checkError()).toBeUndefined()
    expect(p.processResult.exitCode).toBe(0)
    expect(p.hasReachedLimit).toBe(false)
  })
})
