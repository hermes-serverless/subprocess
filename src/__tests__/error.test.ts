import path from 'path'
import { Subprocess } from '..'
import { MaxOutputSizeReached } from '../errors'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH

describe('Exit code non-zero', () => {
  test('fail', async () => {
    const p = new Subprocess('fail')
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.checkError()).not.toBeUndefined()
      expect(p.processResult.exitCode).toBe(2)
    }
  })

  test('exit', async () => {
    const p = new Subprocess('exit', { args: ['3'] })
    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.checkError()).not.toBeUndefined()
      expect(p.processResult.exitCode).toBe(3)
    }
  })
})

describe('MaxBufferLimitReached test', () => {
  test('echo', async () => {
    const p = new Subprocess('echo', {
      args: [`this text is too big`],
      maxOutputSize: 10,
    })

    expect.assertions(4)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
      expect(err).toBe(p.checkError())
      expect(p.processResult.exitCode).toBe(0)
    }
  })

  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py', {
      maxOutputSize: 13,
    })

    expect.assertions(4)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
      expect(err).toBe(p.checkError())
      expect(p.processResult.exitCode).toBe(1)
    }
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py', {
      maxOutputSize: 13,
    })

    expect.assertions(4)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
      expect(err).toBe(p.checkError())
      expect(p.processResult.exitCode).toBe(0)
    }
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py', {
      maxOutputSize: 13,
    })

    expect.assertions(4)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
      expect(err).toBe(p.checkError())
      expect(p.processResult.exitCode).toBeUndefined()
    }
  })
})
