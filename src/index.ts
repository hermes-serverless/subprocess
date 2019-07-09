import { QueueBuffer } from '@hermes-project/circular-buffer';
import { Waiter } from '@hermes-project/custom-promises';
import { ChildProcess, spawn } from 'child_process';
import { Readable, Writable } from 'stream';
import { MaxOutputSizeReached, NonZeroReturnCode } from './errors';

export interface SubprocessConstructor {
  args?: string[]
  id: string
  maxOutputBufferSize: number
  maxOutputSize: number
  path: string
  Logger?: any
}

export interface SubprocessIO {
  in?: Readable
  err?: Writable
  out?: Writable
}

export class Subprocess {
  private Logger: any

  private maxOutputSize: number
  private maxOutputBufferSize: number

  private path: string
  private args: string[]
  private process: ChildProcess
  private id: string

  private returnCode: number
  private returnSig: string

  private out: QueueBuffer
  private err: QueueBuffer
  private outputSize: number
  private runError?: Error

  private doneProcess: Waiter<any>

  constructor({
    path,
    args,
    id,
    maxOutputBufferSize,
    maxOutputSize,
    Logger,
  }: SubprocessConstructor) {
    this.Logger = Logger
    this.id = id
    this.path = path
    this.maxOutputBufferSize = maxOutputBufferSize
    this.maxOutputSize = maxOutputSize
    this.args = args ? args : []
    this.doneProcess = new Waiter()
  }

  public start(io: SubprocessIO) {
    if (this.Logger) {
      this.Logger.info(`[Subprocess] Spawn process: ${this.id}`, {
        path: this.path,
        args: this.args,
      })
    }

    try {
      this.process = spawn(this.path, this.args)

      this.process.on('close', (ret: number, signal: string) => {
        if (this.Logger) {
          this.Logger.info(`[Subprocess] Process closed: ${this.id}`, { ret, signal })
        }

        if (ret !== 0 && !this.runError) this.runError = new NonZeroReturnCode(ret)
        this.doneProcess.resolve()
        this.returnCode = ret
        this.returnSig = signal
      })

      this.err = this.setupOutputBuffer(io.err, this.process.stderr)
      this.out = this.setupOutputBuffer(io.out, this.process.stdout)

      this.process.on('error', (err: any) => {
        if (this.Logger) {
          this.Logger.error(`[Subprocess] Error event catch ${this.id}`, err)
        }
      })

      if (io.in) {
        io.in.pipe(this.process.stdin).on('error', (e: any) => {
          if (this.Logger) {
            this.Logger.error(`[Subprocess] Pipe error ${this.id}`, e)
          }
        })
      }
    } catch (err) {
      if (this.Logger) {
        this.Logger.error(`[Subprocess] Error catch ${this.id}`, err)
      }
      this.doneProcess.reject(err)
    }
  }

  public getErr() {
    return this.err.getString()
  }

  public getOut() {
    return this.out.getString()
  }

  public getExitCode() {
    return this.returnCode
  }

  public getExitSignal() {
    return this.returnSig
  }

  public finish() {
    return this.doneProcess.finish()
  }

  public getError() {
    return this.runError
  }

  public kill() {
    this.process.kill()
  }

  private setupOutputBuffer = (outputStream: Writable, stdStream: Readable) => {
    this.outputSize = 0
    const queueBuffer = new QueueBuffer(this.maxOutputBufferSize)
    if (outputStream) stdStream.pipe(outputStream)
    stdStream.on('data', (data: Buffer) => {
      const str = data.toString('utf-8')
      this.outputSize += str.length
      if (this.outputSize > this.maxOutputSize && this.runError == null) {
        this.runError = new MaxOutputSizeReached(this.maxOutputSize)
        this.process.emit('error', this.runError)
        if (outputStream) stdStream.unpipe(outputStream)
        this.kill()
      }
      queueBuffer.push(str)
    })

    return queueBuffer
  }
}
