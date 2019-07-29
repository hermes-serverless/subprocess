import { Waiter } from '@hermes-serverless/custom-promises'
import { randomBytes } from 'crypto'
import getStream from 'get-stream'
import makeArray from 'make-array'
import { Subprocess } from '..'

export const go = async (
  p: Subprocess,
  { input, stdout, stderr, all }: any,
  expectErr?: boolean
) => {
  const stdoutPromise = Promise.all(makeArray(stdout).map((el: any) => getStream(el.stream || el)))
  const stderrPromise = Promise.all(makeArray(stderr).map((el: any) => getStream(el.stream || el)))
  const allPromise = Promise.all(makeArray(all).map((el: any) => getStream(el.stream || el)))

  const getRes = async (p: Promise<any>) => {
    const r = await p
    if (r.length === 0) return ''
    if (r.length === 1) return r[0]
    return r
  }

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
    stdoutStr: await getRes(stdoutPromise),
    stderrStr: await getRes(stderrPromise),
    allStr: await getRes(allPromise),
  }
}

export const checkStreamEnd = async (
  p: Subprocess,
  str: any,
  textPromise: () => Promise<any>,
  expectedTxt?: string
) => {
  const stream = str.stream || str
  const end = str.end != null ? str.end : true
  const id = randomBytes(8).toString('hex')
  const errcb = jest.fn()
  stream.on('error', errcb)
  try {
    await p.processDone
  } catch (err) {}
  stream.end(id)
  const wait = new Waiter()
  setTimeout(async () => {
    try {
      const txt = await textPromise()
      if (end) {
        expect(errcb).toBeCalledTimes(1)
        expect(txt.endsWith(id)).toBe(false)
      } else {
        expect(errcb).not.toBeCalled()
        expect(txt.endsWith(id)).toBe(true)
      }
      if (expectedTxt != null) expect(txt).toBe(expectedTxt + (end ? '' : id))
      wait.resolve()
    } catch (err) {
      wait.reject(err)
    }
  }, 500)
  await wait.finish()
  return end ? '' : id
}
