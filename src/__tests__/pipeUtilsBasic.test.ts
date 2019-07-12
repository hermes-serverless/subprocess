import { canTransferData, pipeUntilLimit, willSurpassLimit } from '../pipeUtils'
import { checkMD5, checkSize, getReadStream, TestFileManager } from './testUtils'

const TIMEOUT = 30 * 1000
const MB = 1000

describe('Check canTransferData', () => {
  test.each([[1, 2], [2, 3], [0, 1], [1000, null], [2000, null], [0, null]])(
    'Test if returns true',
    (dataTransfered: number, limit: null | number) => {
      expect(canTransferData(dataTransfered, limit)).toBe(true)
    }
  )

  test.each([[2, 2], [3, 3], [4, 3], [10, 1], [0, 0], [1, 0]])(
    'Test if returns false',
    (dataTransfered: number, limit: null | number) => {
      expect(canTransferData(dataTransfered, limit)).toBe(false)
    }
  )
})

describe('Check willSurpassLimit', () => {
  test.each([['ab', 1, 2], ['abc', 1, 2], ['a', 0, 0], ['abcd', 1, 4]])(
    'Test if returns true',
    (dataToWrite: string, dataTransfered: number, limit: null | number) => {
      expect(willSurpassLimit(dataToWrite, dataTransfered, limit)).toBe(true)
    }
  )

  test.each([
    ['', 1, 1],
    ['a', 1, 2],
    ['abc', 0, 3],
    ['abcd', 5, null],
    ['abcdefg', 5, null],
    ['abcdef', 2000000, null],
  ])(
    'Test if returns false',
    (dataToWrite: string, dataTransfered: number, limit: null | number) => {
      expect(willSurpassLimit(dataToWrite, dataTransfered, limit)).toBe(false)
    }
  )
})

describe('Check if streaming for pipeUntilLimit is working properly', () => {
  const testFiles = new TestFileManager('pipeUntilLimit')

  testFiles.createStreamFile({ baseSizeKB: 10 * MB })
  testFiles.createStreamFile({ baseSizeKB: 100 * MB })
  testFiles.createStreamFile({ baseSizeKB: 500 * MB, zero: true })
  testFiles.createStreamFile({ baseSizeKB: 1000 * MB, zero: true })
  testFiles.createTextFile({ text: 'ola eu sou o goku', testname: 'goku' })
  testFiles.createTextFile({ text: 'a', repeats: 100, testname: '1e2a' })
  testFiles.createTextFile({ text: 'a', repeats: 1000, testname: '1e3a' })
  testFiles.createTextFile({ text: 'a', repeats: 10000, testname: '1e4a' })
  testFiles.createTextFile({ text: 'a', repeats: 100000, testname: '1e5a' })
  testFiles.createTextFile({ text: 'a', repeats: 1000000, testname: '1e6a' })
  testFiles.createTextFile({ text: 'b', repeats: 1000000, testname: '1e6b' })
  testFiles.createTextFile({ text: 'c', repeats: 1000000, testname: '1e6c' })
  testFiles.createTextFile({ text: 'a', repeats: 10000000, testname: '1e7a' })
  testFiles.createTextFile({ text: 'b', repeats: 10000000, testname: '1e7b' })

  beforeAll(async () => {
    await testFiles.waitForFilesCreation()
  }, TIMEOUT)

  afterAll(() => {
    testFiles.cleanUpTestFiles()
  }, TIMEOUT)

  test.each(testFiles.files)(
    '%s',
    async (_, bytes, testFile) => {
      const { file, filepath } = testFiles.getWriteStream()
      const src = getReadStream(testFile)

      const srcListeners = [
        src.listenerCount('close'),
        src.listenerCount('error'),
        src.listenerCount('end'),
        src.listenerCount('data'),
      ]

      const fileListeners = [
        file.listenerCount('drain'),
        file.listenerCount('error'),
        file.listenerCount('finish'),
      ]

      await pipeUntilLimit({
        src,
        dest: file,
      })

      expect([
        src.listenerCount('close'),
        src.listenerCount('error'),
        src.listenerCount('end'),
        src.listenerCount('data'),
      ]).toEqual(srcListeners)

      expect([
        file.listenerCount('drain'),
        file.listenerCount('error'),
        file.listenerCount('finish'),
      ]).toEqual(fileListeners)

      src.destroy()
      expect(checkSize(testFile, filepath)).toBe(true)
      expect(checkMD5(testFile, filepath)).toBe(true)
    },
    TIMEOUT
  )
})
