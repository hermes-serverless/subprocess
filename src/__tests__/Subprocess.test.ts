// import MemoryStream from 'memorystream'
// import util from 'util'
// import { Subprocess } from '../'
// import { MaxOutputSizeReached, NonZeroReturnCode } from '../errors'

test.todo('todo')

// const logger = {
//   info(...arg: any[]) {
//     console.log(util.inspect(arg))
//   },
//   error(...arg: any[]) {
//     console.error(util.inspect(arg))
//   },
// }

// test('Simple echo', async () => {
//   const proc = new Subprocess({
//     logger,
//     path: `echo`,
//     args: ['hello'],
//     id: '1',
//     maxOutputBufferSize: 10,
//     maxOutputSize: 10,
//   })

//   const out = new MemoryStream(null, {
//     readable: false,
//   })

//   proc.start({
//     out,
//   })

//   await proc.finish()
//   expect(proc.getError()).toBeUndefined()
//   expect(proc.getExitCode()).toBe(0)
//   expect(proc.getErr()).toBe('')

//   expect(proc.getOut()).toBe('hello\n')
//   expect(out.toString()).toBe('hello\n')
// }, 200)

// test('Invalid command', async () => {
//   const proc = new Subprocess({
//     logger,
//     path: `echo hello`,
//     id: '1',
//     maxOutputBufferSize: 10,
//     maxOutputSize: 10,
//   })

//   const out = new MemoryStream(null, {
//     readable: false,
//   })

//   proc.start({
//     out,
//   })

//   await proc.finish()

//   expect(proc.getError()).toBeInstanceOf(NonZeroReturnCode)
//   expect(proc.getExitCode()).not.toBe(0)
//   expect(proc.getErr()).toBe('')
//   expect(proc.getOut()).toBe('')
//   expect(out.toString()).toBe('')
// }, 200)

// describe('Maximum output testes', () => {
//   test('', async () => {
//     const proc = new Subprocess({
//       logger,
//       path: `echo`,
//       args: [`this text is too big`],
//       id: '1',
//       maxOutputBufferSize: 10,
//       maxOutputSize: 10,
//     })

//     const out = new MemoryStream(null, {
//       readable: false,
//     })

//     proc.start({
//       out,
//     })

//     await proc.finish()

//     expect(proc.getError()).toBeInstanceOf(MaxOutputSizeReached)
//     expect(proc.getErr()).toBe('')
//     expect(proc.getOut()).toBe('s too big\n')
//     expect(out.toString()).toBe('this text is too big\n')
//   }, 200)

//   test('Maximum output size error', async () => {
//     const proc = new Subprocess({
//       logger,
//       path: `echo`,
//       args: [`this text is too big`],
//       id: '1',
//       maxOutputBufferSize: 10,
//       maxOutputSize: 10,
//     })

//     const out = new MemoryStream(null, {
//       readable: false,
//     })

//     proc.start({
//       out,
//     })

//     await proc.finish()

//     expect(proc.getError()).toBeInstanceOf(MaxOutputSizeReached)
//     expect(proc.getErr()).toBe('')
//     expect(proc.getOut()).toBe('s too big\n')
//     expect(out.toString()).toBe('this text is too big\n')
//   }, 200)
// })
