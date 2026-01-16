import { debounce } from './utils'

// SplitType is loaded globally from CDN
declare global {
  const SplitType: any
}

// Defines a class to split text into lines, words and characters for animation.
export class TextSplitter {
  private textElement: HTMLElement
  private splitText: any
  private onResize: (() => void) | null
  private previousContainerWidth: number | null = null

  constructor(textElement: HTMLElement, options: { splitTypeTypes?: string; resizeCallback?: () => void } = {}) {
    if (!textElement || !(textElement instanceof HTMLElement)) {
      throw new Error('Invalid text element provided.')
    }

    const { resizeCallback, splitTypeTypes } = options

    this.textElement = textElement
    this.onResize = typeof resizeCallback === 'function' ? resizeCallback : null

    const splitOptions = splitTypeTypes ? { types: splitTypeTypes } : {}
    this.splitText = new SplitType(this.textElement, splitOptions)

    if (this.onResize) {
      this.initResizeObserver()
    }
  }

  initResizeObserver() {
    this.previousContainerWidth = null

    const resizeObserver = new ResizeObserver(
      debounce((entries: ResizeObserverEntry[]) => this.handleResize(entries), 100)
    )
    resizeObserver.observe(this.textElement)
  }

  handleResize(entries: ResizeObserverEntry[]) {
    const [{ contentRect }] = entries
    const width = Math.floor(contentRect.width)
    if (this.previousContainerWidth && this.previousContainerWidth !== width) {
      this.splitText.split()
      if (this.onResize) {
        this.onResize()
      }
    }
    this.previousContainerWidth = width
  }

  revert() {
    return this.splitText.revert()
  }

  getLines() {
    return this.splitText.lines
  }

  getWords() {
    return this.splitText.words
  }

  getChars() {
    return this.splitText.chars
  }
}
