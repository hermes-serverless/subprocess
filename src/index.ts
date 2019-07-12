import { QueueBuffer } from '@hermes-project/circular-buffer';
import execa, { ExecaChildProcess } from 'execa';
import { Readable, Writable } from 'stream';
import { MaxOutputSizeReached } from './errors';
import { pipeUntilLimit } from './pipeUtils';

export interface SubprocessConstructor {
  id: string
  path: string
  args?: string[]
  maxBufferSize: number
  maxOutputSize?: number
  logger?: any
}

export interface SubprocessIO {
  in?: Readable
  err?: Writable
  out?: Writable
}

export class Subprocess {
  private logger: any

  private maxOutputSize: number
  private maxBufferSize: number
  private limitReached: boolean

  private path: string
  private args: string[]
  private process: ExecaChildProcess
  private id: string

  private out: QueueBuffer
  private err: QueueBuffer
  private runError?: Error

  constructor({ path, args, id, maxBufferSize, maxOutputSize, logger }: SubprocessConstructor) {
    this.id = id
    this.path = path
    this.args = args ? args : []
    this.logger = logger
    this.maxOutputSize = maxOutputSize != null ? maxOutputSize : null
    this.maxBufferSize = maxBufferSize
    this.limitReached = false
  }

  public start(io: SubprocessIO) {
    if (this.logger) {
      this.logger.info(`[Subprocess] Spawn process: ${this.id}`, {
        path: this.path,
        args: this.args,
      })
    }

    try {
      this.process = execa(this.path, this.args, {
        ...(io.in != null ? { input: io.in } : {}),
      })

      this.err = this.setupOutputBuffer(io.err, this.process.stderr)
      this.out = this.setupOutputBuffer(io.out, this.process.stdout)
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[Subprocess] Error catch ${this.id}`, err)
      }
    }
  }

  public finish = async () => {
    try {
      await this.process
    } catch(err) {
      if(this.logger) {
        this.logger.error(`[Subpro]`)
      }
    }
  }

  public kill = () => {
    this.process.kill()
  }

  public getErr = (): string => {
    return this.err.getString()
  }

  public getOut = () => {
    return this.out.getString()
  }

  private setupOutputBuffer = (outputStream: Writable, stdStream: Readable) => {
    const onLimit = () => {
      if (this.limitReached) {
        if (outputStream) stdStream.unpipe(outputStream)
        return
      }

      this.limitReached = true
      if (this.runError == null) {
        this.runError = new MaxOutputSizeReached(this.maxOutputSize)
        this.process.emit('error', this.runError)
      }

      this.kill()
    }

    const queueBuffer = new QueueBuffer(this.maxBufferSize)

    const onData = (data: string) => {
      queueBuffer.push(data)
    }

    pipeUntilLimit({
      onLimit,
      onData,
      src: stdStream,
      dest: outputStream,
      limit: this.maxOutputSize,
    })

    return queueBuffer
  }

  private addName = (msg: string) => {
    return `[Subprocess ${this.id}] ${msg}`
  }
}
