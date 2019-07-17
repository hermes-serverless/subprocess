import util from 'util'
export const logger = {
  info(...arg: any[]) {
    console.log(util.inspect(arg))
  },
  error(...arg: any[]) {
    console.error(util.inspect(arg))
  },
}
