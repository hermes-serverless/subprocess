import { Waiter } from '@hermes-project/custom-promises'
import { Readable, Writable } from 'stream'

interface PipeUntilLimitArgs {
  src: Readable
  dest: Writable
  limit?: number
  onData?: (data: Buffer | string) => void
  onLimit?: () => void
}

export const canTransferData = (dataTransfered: number, limit: null | number) => {
  return limit == null || dataTransfered < limit
}

export const willSurpassLimit = (
  dataToWrite: string | Buffer,
  dataTransfered: number,
  limit: null | number
) => {
  return limit != null && dataTransfered + dataToWrite.length > limit
}

export const pipeUntilLimit = (args: PipeUntilLimitArgs) => {
  const { src, dest, onData: onDataCallback, onLimit: onLimitCallback } = args
  const limit = args.limit != null ? args.limit : null

  let dataTransfered = 0
  let isDrained = true

  const finishSrc = new Waiter()
  const finishPipe = new Waiter()

  let isSrcCleaned = false
  const cleanupSrc = () => {
    if (isSrcCleaned) return
    isSrcCleaned = true
    src.removeListener('close', closeSrc)
    src.removeListener('error', onError)
    src.removeListener('end', closeSrc)
    src.removeListener('data', onData)
  }

  let isDestCleaned = false
  const cleanupDest = () => {
    if (isDestCleaned) return
    isDestCleaned = true
    dest.removeListener('drain', onDrain)
    dest.removeListener('error', onError)
    dest.removeListener('close', onDestFinish)
  }

  let closedSrc = false
  const closeSrc = () => {
    if (closedSrc) return
    closedSrc = true
    cleanupSrc()
    src.resume()
    finishSrc.resolve()
    if (isDrained) dest.end()
  }

  const onData = (chunk: Buffer) => {
    let dataToWrite = chunk
    const exceedLimit = willSurpassLimit(dataToWrite, dataTransfered, limit)
    if (limit <= 0 && onDataCallback) onDataCallback(Buffer.from(''))

    if (canTransferData(dataTransfered, limit)) {
      if (exceedLimit) {
        const allowedSize = limit - dataTransfered
        dataToWrite = dataToWrite.slice(0, allowedSize)
      }

      const ret = dest.write(dataToWrite)
      dataTransfered += dataToWrite.length
      if (onDataCallback) onDataCallback(dataToWrite)
      if (!ret) {
        isDrained = false
        src.pause()
      }
    }

    if (exceedLimit) {
      if (onLimitCallback) onLimitCallback()
      closeSrc()
    }
  }

  const onDrain = () => {
    isDrained = true
    if (finishSrc.isDone()) dest.end()
    src.resume()
  }

  const onDestFinish = () => {
    cleanupDest()
    finishPipe.resolve()
  }

  const onError = (err: any) => {
    console.error(err)
    cleanupSrc()
    cleanupDest()
    finishSrc.reject(err)
    finishPipe.reject(err)
  }

  dest.on('drain', onDrain)
  dest.on('error', onError)
  dest.on('close', onDestFinish)
  src.on('close', closeSrc)
  src.on('error', onError)
  src.on('end', closeSrc)
  src.on('data', onData)

  return finishPipe.finish()
}
