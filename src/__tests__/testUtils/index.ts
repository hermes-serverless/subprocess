import fs from 'fs'
import md5 from 'md5-file'
import os from 'os'
import path from 'path'

export const getTestFilesPath = (subfolder: string) => {
  return path.join(os.tmpdir(), 'subprocessTestFiles', subfolder)
}

export const checkMD5 = (originalFile: string, createdFile: string) => {
  const md5Original = md5.sync(originalFile)
  const md5Created = md5.sync(createdFile)
  return md5Original === md5Created
}

export const checkSize = (originalFile: string, createdFile: string) => {
  const original = fs.statSync(originalFile)
  const created = fs.statSync(createdFile)
  return original.size === created.size
}

export const getReadStream = (testFile: string) => {
  return fs.createReadStream(testFile)
}

export { TestFileManager } from './TestFileManager'
