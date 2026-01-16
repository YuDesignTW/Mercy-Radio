import { TextSplitter } from './textSplitter'
import { gsap } from 'gsap'

// Hover glitch 字元池：佛教/心理成長單字元 + 隨機符號（保留原本風格）
const lettersAndSymbols = [
  // 佛教/修行常用字（單字元）
  '佛', '法', '僧', '禪', '空', '緣', '業', '戒', '定', '慧', '慈', '悲', '喜', '捨',
  '心', '念', '靜', '覺', '悟', '道', '善', '淨', '觀', '忍', '施', '福', '願', '明', '光',
  // 心理成長常用字（單字元）
  '安', '穩', '柔', '真', '誠', '醒', '行', '承', '放', '和', '愛', '信', '望', '勇',
  // 原本的隨機符號（保留）
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '!', '@', '#', '$', '%', '^', '&', '*', '-', '_', '+', '=', ';', ':', '<', '>', ',',
  // 補一些更「禪意」的全形符號（仍是單字元）
  '·', '—', '…', '。', '，', '、'
]

// Defines a class to create hover effects on text.
export class TextAnimator {
  private textElement: HTMLElement
  private originalChars: string[] = []
  private splitter!: TextSplitter

  constructor(textElement: HTMLElement) {
    if (!textElement || !(textElement instanceof HTMLElement)) {
      throw new Error('Invalid text element provided.')
    }

    this.textElement = textElement
    this.splitText()
  }

  splitText() {
    this.splitter = new TextSplitter(this.textElement, {
      splitTypeTypes: 'words, chars'
    })

    this.originalChars = this.splitter.getChars().map((char: any) => char.innerHTML)
  }

  animate() {
    this.reset()

    const chars = this.splitter.getChars()

    chars.forEach((char: any, position: number) => {
      const initialHTML = char.innerHTML

      gsap.fromTo(char, {
        opacity: 0
      },
      {
        duration: 0.03,
        onComplete: () => {
          gsap.set(char, { innerHTML: initialHTML, delay: 0.1 })
        },
        repeat: 2,
        repeatRefresh: true,
        repeatDelay: 0.05,
        delay: (position + 1) * 0.06,
        innerHTML: () => lettersAndSymbols[Math.floor(Math.random() * lettersAndSymbols.length)],
        opacity: 1
      })
    })

    gsap.fromTo(this.textElement, {
      '--anim': 0
    },
    {
      duration: 1,
      ease: 'expo',
      '--anim': 1
    })
  }

  animateBack() {
    gsap.killTweensOf(this.textElement)
    gsap.to(this.textElement, {
      duration: 0.6,
      ease: 'power4',
      '--anim': 0
    })
  }

  reset() {
    const chars = this.splitter.getChars()
    chars.forEach((char: any, index: number) => {
      gsap.killTweensOf(char)
      char.innerHTML = this.originalChars[index]
    })

    gsap.killTweensOf(this.textElement)
    gsap.set(this.textElement, { '--anim': 0 })
  }
}
