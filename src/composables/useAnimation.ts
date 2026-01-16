import { ref } from 'vue'

/**
 * 動畫控制
 * progress 範圍：0-3
 * 0 = 節點0
 * 1 = 節點1
 * 2 = 節點2
 * 3 = 節點3
 */

export function useAnimation() {
  const progress = ref(0)
  let animationId: number | null = null
  let startTime: number | null = null
  let startValue = 0
  let targetValue = 0

  /**
   * 動畫到指定節點
   * @param nodeIndex 目標節點索引 (0-3)
   */
  function animateTo(nodeIndex: number): void {
    // 停止當前動畫
    if (animationId) {
      cancelAnimationFrame(animationId)
    }

    // 開始新動畫
    startTime = null
    startValue = progress.value
    targetValue = nodeIndex
    animationId = requestAnimationFrame(animate)
  }

  /**
   * 動畫函數
   */
  function animate(timestamp: number): void {
    if (startTime === null) {
      startTime = timestamp
    }

    const elapsed = timestamp - startTime
    const duration = 1000 // 1 秒動畫時間

    if (elapsed < duration) {
      const animProgress = elapsed / duration
      // 使用 easing 函數讓動畫更平滑
      const eased = easeInOutCubic(animProgress)
      
      const diff = targetValue - startValue
      progress.value = startValue + diff * eased
      
      animationId = requestAnimationFrame(animate)
    } else {
      // 確保精確到達目標值
      progress.value = targetValue
      animationId = null
      startTime = null
    }
  }

  /**
   * Easing 函數：三次緩動
   */
  function easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  return {
    progress,
    animateTo
  }
}


