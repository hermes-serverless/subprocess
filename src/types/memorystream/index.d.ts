import { Duplex, Stream } from 'stream'

type DataType = string | Buffer | Stream

export interface Options {
  readable?: boolean
  writable?: boolean
  maxbufsize?: number
  bufoverflow?: number
  frequence?: number
}

export class MemoryStream extends Duplex {
  constructor(data?: DataType | DataType[], options?: Options)
}

export = MemoryStream
