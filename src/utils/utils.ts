// Defines a debounce function to limit the rate at which a function can fire.
export const debounce = (func: Function, delay: number) => {
  let timerId: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}
