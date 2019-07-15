import { QueueBuffer } from '@hermes-project/circular-buffer'
import { flowUntilLimit } from '@hermes-serverless/stream-utils'
import execa from '@tiagonapoli/execa'
import { randomBytes } from 'crypto'
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
  stderr?: Writable
  stdout?: Writable
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
  private proc: execa.ExecaChildProcess<string>
  private procRes: execa.ExecaReturnValue<string>

  private out: QueueBuffer
  private err: QueueBuffer
  private runError?: Error

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

  public run = async (io?: SubprocessIO): Promise<execa.ExecaReturnValue<string>> => {
    const { input, stderr, stdout } = (io || {}) as SubprocessIO

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

      this.err = this.setupOutputBuffer(this.proc.stderr, stderr)
      this.out = this.setupOutputBuffer(this.proc.stdout, stdout)
      this.proc.all.resume()
      this.procRes = await this.proc
      return this.procRes
    } catch (err) {
      if (this.logger) this.logger.error(this.addName(`Error on run function`), err)
      if (!this.runError) this.runError = err
      throw err
    }
  }

  public processResults = (): execa.ExecaReturnValue<string> => {
    return this.procRes
  }

  public kill = () => {
    return this.proc.kill()
  }

  public getErr = (): string => {
    return this.err.getString()
  }

  public getOut = () => {
    return this.out.getString()
  }

  public checkError = () => {
    return this.runError
  }

  public getLimitReached = () => {
    return this.limitReached
  }

  private setupOutputBuffer = (stdStream: Readable, outputStream?: Writable) => {
    const onLimit = () => {
      if (this.limitReached) {
        if (outputStream) stdStream.unpipe(outputStream)
        return
      }

      this.limitReached = true
      if (this.runError == null) this.runError = new MaxOutputSizeReached(this.maxOutputSize)
      this.kill()
    }

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
      ...(outputStream != null ? { dest: outputStream } : {}),
    }).catch(err => {
      if (this.logger) {
        this.logger.error(this.addName(`FlowUntilLimit error`), err)
      }
    })

    return queueBuffer
  }

  private addName = (msg: string) => {
    return `[Subprocess ${this.id}] ${msg}`
  }
}
