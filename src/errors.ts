export class MaxOutputSizeReached extends Error {
  constructor(maxSize: number) {
    super(`Max output size reached: ${maxSize}`)
  }
}
