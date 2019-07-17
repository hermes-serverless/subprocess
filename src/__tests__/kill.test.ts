import path from 'path'
import { Subprocess } from '..'
import { MaxOutputSizeReached } from '../errors'
import { logger } from './logger'

process.env.PATH = path.join(__dirname, 'fixtures') + path.delimiter + process.env.PATH

describe('Manual kill works', () => {
  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py', { logger })
    expect.assertions(3)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      expect(p.processResult.killed).toBe(true)
      expect(p.hasReachedLimit).toBe(false)
      expect(p.checkError()).not.toBeUndefined()
    }
  })

  // TODO: Maybe this behavior is buggy...
  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py', { logger })
    expect.assertions(3)
    setTimeout(p.kill, 1000)
    await p.run()
    expect(p.processResult.killed).toBe(false)
    expect(p.hasReachedLimit).toBe(false)
    expect(p.checkError()).toBeUndefined()
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py', { logger })
    expect.assertions(3)
    try {
      setTimeout(p.kill, 1000)
      await p.run()
    } catch (err) {
      expect(p.processResult.killed).toBe(true)
      expect(p.hasReachedLimit).toBe(false)
      expect(p.checkError()).not.toBeUndefined()
    }
  })
})

describe('Kill by reaching limit', () => {
  test('Not enough time to kill', async () => {
    const p = new Subprocess('echo', {
      logger,
      args: [`this text is too big`],
      maxBufferSize: 9,
      maxOutputSize: 10,
    })

    expect.assertions(2)
    try {
      await p.run()
    } catch (err) {
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
    }
  })

  test('sigterm-catcher-exit-error.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-error.py', {
      logger,
      maxOutputSize: 13,
    })

    expect.assertions(3)
    try {
      await p.run()
    } catch (err) {
      expect(p.processResult.killed).toBe(true)
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
    }
  })

  test('sigterm-catcher-exit-success.py', async () => {
    const p = new Subprocess('sigterm-catcher-exit-success.py', {
      logger,
      maxOutputSize: 13,
    })

    expect.assertions(3)
    try {
      await p.run()
    } catch (err) {
      expect(p.processResult.killed).toBe(false)
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
    }
  })

  test('sleeper.py', async () => {
    const p = new Subprocess('sleeper.py', {
      logger,
      maxOutputSize: 13,
    })

    expect.assertions(3)
    try {
      await p.run()
    } catch (err) {
      expect(p.processResult.killed).toBe(true)
      expect(p.hasReachedLimit).toBe(true)
      expect(p.checkError()).toBeInstanceOf(MaxOutputSizeReached)
    }
  })
})
