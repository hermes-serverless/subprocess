import MemoryStream from 'memorystream'
import path from 'path'
import util from 'util'
import { Subprocess } from '..'
import { MaxOutputSizeReached } from '../errors'

const logger = {
  info(...arg: any[]) {
    console.log(util.inspect(arg))
  },
  error(...arg: any[]) {
    console.error(util.inspect(arg))
  },
}

test('No restrictions', async () => {
  const proc = new Subprocess('echo', {
    logger,
    args: ['hello'],
  })

  // @ts-ignore
  const stdout = new MemoryStream(null, {
    readable: false,
  })
  // @ts-ignore
  const stderr = new MemoryStream(null, {
    readable: false,
  })

  await proc.run({
    stdout,
    stderr,
  })

  expect(proc.checkError()).toBeUndefined()
  expect(proc.processResults().exitCode).toBe(0)
  expect(proc.getLimitReached()).toBe(false)
  expect(proc.getErr()).toBe('')
  expect(stderr.toString()).toBe('')
  expect(proc.getOut()).toBe('hello\n')
  expect(stdout.toString()).toBe('hello\n')
})

describe('Test kill functionality', () => {
  describe('Kill by calling proc.kill', () => {
    test('sigterm-catcher-exit-error.py', async () => {
      const proc = new Subprocess(
        path.join(__dirname, 'fixtures', 'sigterm-catcher-exit-error.py'),
        {
          logger,
        }
      )

      // @ts-ignore
      const stdout = new MemoryStream(null, { readable: false })
      expect.assertions(6)
      try {
        setTimeout(() => {
          proc.kill()
        }, 1000)
        await proc.run({ stdout })
      } catch (err) {
        expect(err.killed).toBe(true)
        expect(proc.getLimitReached()).toBe(false)
        expect(proc.checkError()).not.toBeUndefined()
        expect(proc.getErr()).toBe('')
        expect(proc.getOut()).toBe('14 characters\n15 RECEIVED\n')
        expect(stdout.toString()).toBe('14 characters\n15 RECEIVED\n')
      }
    })

    test('sigterm-catcher-exit-success.py', async () => {
      const proc = new Subprocess(
        path.join(__dirname, 'fixtures', 'sigterm-catcher-exit-success.py'),
        {
          logger,
        }
      )

      // @ts-ignore
      const stdout = new MemoryStream(null, { readable: false })
      expect.assertions(6)
      setTimeout(() => {
        proc.kill()
      }, 1000)
      const res = await proc.run({ stdout })
      expect(res.killed).toBe(false)
      expect(proc.getLimitReached()).toBe(false)
      expect(proc.checkError()).toBeUndefined()
      expect(proc.getErr()).toBe('')
      expect(proc.getOut()).toBe('14 characters\n15 RECEIVED\n')
      expect(stdout.toString()).toBe('14 characters\n15 RECEIVED\n')
    })

    test('sleeper.py', async () => {
      const proc = new Subprocess(path.join(__dirname, 'fixtures', 'sleeper.py'), {
        logger,
      })

      // @ts-ignore
      const stdout = new MemoryStream(null, { readable: false })
      expect.assertions(6)
      try {
        setTimeout(() => {
          proc.kill()
        }, 1000)
        await proc.run({ stdout })
      } catch (err) {
        expect(err.killed).toBe(true)
        expect(proc.getLimitReached()).toBe(false)
        expect(proc.checkError()).not.toBeUndefined()
        expect(proc.getErr()).toBe('')

        expect(proc.getOut()).toBe('14 characters\n')
        expect(stdout.toString()).toBe('14 characters\n')
      }
    })
  })

  describe('Kill by reaching output limit', () => {
    test('Not enough time to kill', async () => {
      const proc = new Subprocess('echo', {
        logger,
        args: [`this text is too big`],
        maxBufferSize: 9,
        maxOutputSize: 10,
      })

      // @ts-ignore
      const stdout = new MemoryStream(null, {
        readable: false,
      })

      await proc.run({
        stdout,
      })

      expect(proc.getLimitReached()).toBe(true)
      expect(proc.checkError()).toBeInstanceOf(MaxOutputSizeReached)
      expect(proc.getErr()).toBe('')
      expect(proc.getOut()).toBe('his text ')
      expect(stdout.toString()).toBe('this text ')
    })

    test('sigterm-catcher-exit-error.py', async () => {
      const proc = new Subprocess(
        path.join(__dirname, 'fixtures', 'sigterm-catcher-exit-error.py'),
        {
          logger,
          maxOutputSize: 13,
        }
      )

      // @ts-ignore
      const stdout = new MemoryStream(null, { readable: false })
      expect.assertions(6)
      try {
        await proc.run({ stdout })
      } catch (err) {
        expect(err.killed).toBe(true)
        expect(proc.getLimitReached()).toBe(true)
        expect(proc.checkError()).toBeInstanceOf(MaxOutputSizeReached)
        expect(proc.getErr()).toBe('')
        expect(proc.getOut()).toBe('14 characters')
        expect(stdout.toString()).toBe('14 characters')
      }
    })

    test('sigterm-catcher-exit-success.py', async () => {
      const proc = new Subprocess(
        path.join(__dirname, 'fixtures', 'sigterm-catcher-exit-success.py'),
        {
          logger,
          maxOutputSize: 13,
        }
      )

      // @ts-ignore
      const stdout = new MemoryStream(null, { readable: false })
      expect.assertions(6)
      const res = await proc.run({ stdout })
      expect(res.killed).toBe(false)
      expect(proc.getLimitReached()).toBe(true)
      expect(proc.checkError()).toBeInstanceOf(MaxOutputSizeReached)
      expect(proc.getErr()).toBe('')
      expect(proc.getOut()).toBe('14 characters')
      expect(stdout.toString()).toBe('14 characters')
    })

    test('sleeper.py', async () => {
      const proc = new Subprocess(path.join(__dirname, 'fixtures', 'sleeper.py'), {
        logger,
        maxOutputSize: 13,
      })

      // @ts-ignore
      const stdout = new MemoryStream(null, { readable: false })
      expect.assertions(6)
      try {
        await proc.run({ stdout })
      } catch (err) {
        expect(err.killed).toBe(true)
        expect(proc.getLimitReached()).toBe(true)
        expect(proc.checkError()).toBeInstanceOf(MaxOutputSizeReached)
        expect(proc.getErr()).toBe('')
        expect(proc.getOut()).toBe('14 characters')
        expect(stdout.toString()).toBe('14 characters')
      }
    })
  })
})
