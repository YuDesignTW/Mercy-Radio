import { ref } from 'vue'

/**
 * 圖片序列管理
 * 結構：
 * - 節點0圖片 (0.webp)
 * - 過場01序列 (01.mov 轉換的圖片序列)
 * - 節點1圖片 (01.webp)
 * - 過場02序列 (02.mov 轉換的圖片序列)
 * - 節點2圖片 (02.webp)
 * - 過場03序列 (03.mov 轉換的圖片序列)
 * - 節點3圖片 (03.webp)
 */

interface ImageSequenceConfig {
  // 節點圖片
  nodeImages: string[]
  // 過場動畫圖片序列（每個過場是一個圖片陣列）
  transitionSequences: string[][]
}

export function useImageSequence() {
  const loadedImages = ref<HTMLImageElement[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const loadingProgress = ref(0) // 載入進度 0-100

  // 預設配置：從 .mov 文件提取的高解析度圖片序列（2366x1318，原始解析度）
  const config: ImageSequenceConfig = {
    // 節點圖片（放在 public 目錄下，Vite 會自動處理）
    nodeImages: [
      '/0.webp',
      '/01.webp',
      '/02.webp',
      '/03.webp'
    ],
    // 過場動畫序列
    // 從 .mov 文件提取的原始解析度圖片序列（2366x1318）
    // 格式：/morphing/01/01-001.webp, /morphing/01/01-002.webp, ...
    transitionSequences: [
      // 過場01 (從節點0到節點1) - 227 張圖片
      generateSequencePaths('01', 227),
      // 過場02 (從節點1到節點2) - 286 張圖片
      generateSequencePaths('02', 286),
      // 過場03 (從節點2到節點3) - 295 張圖片
      generateSequencePaths('03', 295)
    ]
  }

  /**
   * 生成過場動畫的圖片路徑序列
   * @param name 過場名稱 (例如 '01', '02', '03')
   * @param count 圖片數量
   */
  function generateSequencePaths(name: string, count: number): string[] {
    const paths: string[] = []
    // FFmpeg 生成的圖片從 001 開始，不是 000
    for (let i = 1; i <= count; i++) {
      const fileName = `/morphing/${name}/${name}-${i.toString().padStart(3, '0')}.webp`
      paths.push(fileName)
    }
    return paths
  }

  /**
   * 構建完整的圖片序列陣列
   * 順序：節點0 → 過場01 → 節點1 → 過場02 → 節點2 → 過場03 → 節點3
   */
  function buildImageSequence(): string[] {
    const sequence: string[] = []
    
    // 節點0
    sequence.push(config.nodeImages[0])
    
    // 過場01
    sequence.push(...config.transitionSequences[0])
    
    // 節點1
    sequence.push(config.nodeImages[1])
    
    // 過場02
    sequence.push(...config.transitionSequences[1])
    
    // 節點2
    sequence.push(config.nodeImages[2])
    
    // 過場03
    sequence.push(...config.transitionSequences[2])
    
    // 節點3
    sequence.push(config.nodeImages[3])
    
    return sequence
  }

  /**
   * 載入所有圖片，並追蹤載入進度
   */
  async function loadImages(onProgress?: (progress: number) => void): Promise<void> {
    if (isLoading.value || isLoaded.value) return
    
    isLoading.value = true
    loadingProgress.value = 0
    
    try {
      const imagePaths = buildImageSequence()
      const totalImages = imagePaths.length
      let loadedCount = 0
      
      const imagePromises = imagePaths.map((src) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image()
          
          img.onload = () => {
            loadedCount++
            // 計算進度：0-90% 用於圖片載入（保留 10% 給其他資源）
            const progress = Math.floor((loadedCount / totalImages) * 90)
            loadingProgress.value = progress
            if (onProgress) {
              onProgress(progress)
            }
            resolve(img)
          }
          
          img.onerror = () => {
            console.warn(`Failed to load image: ${src}`)
            // 創建一個空白圖片作為佔位符
            const placeholder = new Image()
            placeholder.width = 2366
            placeholder.height = 1318
            loadedCount++
            const progress = Math.floor((loadedCount / totalImages) * 90)
            loadingProgress.value = progress
            if (onProgress) {
              onProgress(progress)
            }
            resolve(placeholder)
          }
          
          img.src = src
        })
      })
      
      loadedImages.value = await Promise.all(imagePromises)
      isLoaded.value = true
      loadingProgress.value = 90 // 圖片載入完成，90%
      if (onProgress) {
        onProgress(90)
      }
      console.log(`Loaded ${loadedImages.value.length} images`)
    } catch (error) {
      console.error('Error loading images:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 獲取指定索引的圖片
   */
  function getImage(index: number): HTMLImageElement | null {
    if (index < 0 || index >= loadedImages.value.length) {
      return null
    }
    return loadedImages.value[index]
  }

  /**
   * 獲取總圖片數量
   */
  function getTotalImages(): number {
    return loadedImages.value.length
  }

  return {
    loadImages,
    getImage,
    getTotalImages,
    isLoading,
    isLoaded,
    loadingProgress
  }
}


