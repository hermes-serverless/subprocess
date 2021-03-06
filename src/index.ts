import { QueueBuffer } from '@hermes-serverless/circular-buffer'
import {
  flowUntilLimit,
  normalizeToWritableWithEnd,
  WritableWithEnd,
} from '@hermes-serverless/stream-utils'
import { randomBytes } from 'crypto'
import execa, { ExecaChildProcess, ExecaReturnValue } from 'execa'
import { Readable, Writable } from 'stream'
import { MaxOutputSizeReached } from './errors'

export interface SubprocessOptions {
  id?: string
  args?: string[]
  maxBufferSize?: number
  maxOutputSize?: number
  logger?: any
}

export interface SubprocessIO {
  input?: Readable
  stderr?: Writable | WritableWithEnd | (Writable | WritableWithEnd)[]
  stdout?: Writable | WritableWithEnd | (Writable | WritableWithEnd)[]
  all?: Writable | WritableWithEnd | (Writable | WritableWithEnd)[]
}

export interface ProcessResult {
  command: string
  exitCode: number
  exitCodeName: string
  failed: boolean
  timedOut: boolean
  killed: boolean
  isCanceled: boolean
  signal?: string
  error?: Error
}

const DEFAULT_BUFFER_SIZE = 10 * 1000

export class Subprocess {
  private logger: any
  private maxOutputSize: number
  private maxBufferSize: number
  private limitReached: boolean

  private id: string

  private command: string
  private args: string[]
  private proc: ExecaChildProcess<string>
  private procRes: ProcessResult

  private out: QueueBuffer
  private err: QueueBuffer

  constructor(command: string, options?: SubprocessOptions) {
    const { id, args, logger, maxOutputSize, maxBufferSize } = {
      id: randomBytes(8).toString('hex'),
      args: [] as string[],
      logger: null,
      maxOutputSize: null,
      maxBufferSize: DEFAULT_BUFFER_SIZE,
      ...(options != null ? options : {}),
    } as SubprocessOptions

    this.id = id
    this.command = command
    this.args = args
    this.logger = logger
    this.maxOutputSize = maxOutputSize
    this.maxBufferSize = maxBufferSize
    this.limitReached = false
  }

  public run = async (io?: SubprocessIO): Promise<ProcessResult> => {
    const { input, stderr, stdout, all } = (io || {}) as SubprocessIO
    const stderrArr = normalizeToWritableWithEnd(stderr)
    const stdoutArr = normalizeToWritableWithEnd(stdout)
    const allArr = normalizeToWritableWithEnd(all)

    if (this.logger) {
      this.logger.info(this.addName(`Spawn process`), {
        command: this.command,
        args: this.args,
      })
    }

    try {
      this.proc = execa(this.command, this.args, {
        ...(input != null ? { input } : {}),
        buffer: false,
      })

      const onLimit = () => {
        if (this.limitReached) return
        this.limitReached = true
        this.kill()
      }

      this.err = this._setupOutputBuffer(this.proc.stderr, stderrArr, onLimit)
      this.out = this._setupOutputBuffer(this.proc.stdout, stdoutArr, onLimit)
      if (allArr.length > 0) {
        allArr.forEach(el => {
          this.proc.all.pipe(
            el.stream,
            { end: el.end }
          )
        })
      } else this.proc.all.resume()

      this.procRes = this._createProcResult(await this.proc)
    } catch (err) {
      if (this.logger) this.logger.error(this.addName(`Error on run function`), err)
      this.procRes = this._createProcResult(
        err,
        this.limitReached ? new MaxOutputSizeReached(this.maxOutputSize) : new Error(err.message)
      )
      throw this.procRes.error
    }

    if (this.limitReached) {
      this.procRes.error = new MaxOutputSizeReached(this.maxOutputSize)
      throw this.procRes.error
    }

    return this.procRes
  }

  get stderrBuffer(): string {
    return this.err.getString()
  }

  get stdoutBuffer(): string {
    return this.out.getString()
  }

  get hasReachedLimit(): boolean {
    return this.limitReached
  }

  get processResult(): ProcessResult {
    return this.procRes
  }

  get processDone(): ExecaChildProcess<string> {
    return this.proc
  }

  public checkError = () => {
    return this.procRes.error
  }

  public kill = () => {
    return this.proc.kill()
  }

  public _setupOutputBuffer = (
    stdStream: Readable,
    outputStream: WritableWithEnd[],
    onLimit: () => void
  ) => {
    const queueBuffer = new QueueBuffer(this.maxBufferSize)

    const onData = (data: Buffer | string) => {
      if (Buffer.isBuffer(data)) {
        queueBuffer.push(data.toString())
      } else queueBuffer.push(data)
    }

    flowUntilLimit(stdStream, {
      onLimit,
      onData,
      limit: this.maxOutputSize,
      dest: outputStream,
    }).catch(err => {
      if (this.logger) {
        this.logger.error(this.addName(`FlowUntilLimit error`), err)
      }
    })

    return queueBuffer
  }

  public _createProcResult = (
    {
      command,
      exitCode,
      exitCodeName,
      failed,
      timedOut,
      killed,
      isCanceled,
      signal,
    }: ExecaReturnValue,
    error?: Error
  ) => {
    return {
      command,
      exitCode,
      exitCodeName,
      failed,
      timedOut,
      killed,
      isCanceled,
      signal,
      error,
    }
  }

  private addName = (msg: string) => {
    return `[Subprocess ${this.id}] ${msg}`
  }
}
