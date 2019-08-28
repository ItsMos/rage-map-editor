Function.prototype.debounce = function (delay) {
  let args = Array.from(arguments)
  args.shift()
  if (this.debounceTimer) clearTimeout(this.debounceTimer)
  this.debounceTimer = setTimeout(() => {
    this(...args)
  }, delay)
}