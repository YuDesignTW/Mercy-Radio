<template>
  <div class="app" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <!-- 載入畫面 -->
    <LoadingScreen :isLoading="isLoading" :progress="loadingProgress" />
    
    <div class="content" v-if="!isLoading">
      <div class="canvas-wrapper">
        <canvas ref="canvasRef"></canvas>
      </div>
      <div class="text-container" :class="{ 'node-2': currentNodeIndex === 2 }">
        <h2 class="content__title">{{ currentPlaylist.title }}</h2>
        <ul class="list">
          <li
            v-for="(song, songIndex) in currentPlaylist.songs"
            :key="`song-${Math.round(progress)}-${songIndex}`"
            class="list__item"
            :class="{ 
              'is-playing': isPlayingSong(song),
              'equalizer-left': equalizerPosition === 'left',
              'equalizer-between': equalizerPosition === 'between',
              'equalizer-right': equalizerPosition === 'right',
              'equalizer-replace': equalizerPosition === 'replace-number',
              'equalizer-above': equalizerPosition === 'above-text'
            }"
            :ref="el => setItemRef(el, songIndex)"
            @click="handleSongClick(song, songIndex)"
          >
            <div v-if="isPlayingSong(song)" class="equalizer">
              <div
                v-for="(bar, barIndex) in equalizerBars"
                :key="barIndex"
                class="equalizer-bar"
                :style="{ height: `${bar}%` }"
              ></div>
            </div>
            <span class="list__item-col hover-effect hover-effect--bg-south">
              {{ song }}
            </span>
          </li>
        </ul>
      </div>
      <a href="https://yu-design.tw/" target="_blank" rel="noopener noreferrer" class="logo-link">
        <img src="/logo.png" alt="Yu Design" class="logo-img" />
      </a>
      <div class="color-switcher" @click="cycleTextColor">
        <div class="color-dot" :style="{ background: currentTextColor }"></div>
      </div>
      <div class="switcher-container">
        <div class="switcher">
          <div
            v-for="(_, index) in nodes"
            :key="index"
            :class="['switcher-dot', { active: Math.round(progress) === index }]"
            @click="goToNode(index)"
            :aria-label="`切換到節點 ${index}`"
          >
            <!-- 播放時只在該分頁點上顯示小等化器 -->
            <div 
              v-if="audioState.isPlaying && playingPlaylistIndex === index" 
              class="switcher-equalizer"
              :class="{ 'is-active-dot': Math.round(progress) === index }"
            >
              <div 
                class="switcher-equalizer-bar"
                :style="{ height: `${switcherEqualizerHeight}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useImageSequence } from './composables/useImageSequence'
import { useAnimation } from './composables/useAnimation'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { TextAnimator } from './utils/textAnimator'
import LoadingScreen from './components/LoadingScreen.vue'

const itemRefs = ref<(HTMLElement | null)[]>([])
const animators = ref<Map<number, TextAnimator[]>>(new Map())

// 載入狀態
const isLoading = ref(true)
const loadingProgress = ref(0)

// 音頻播放器
const audioPlayer = useAudioPlayer()
const { playSong, pauseSong, isPlayingSong, getFrequencyData, state: audioState } = audioPlayer

// 等化器數據
const equalizerBars = ref<number[]>(Array(5).fill(0))
let equalizerAnimationId: number | null = null

// 追蹤播放音樂時的分頁索引
const playingPlaylistIndex = ref<number | null>(null)

// 分頁器上的等化器高度（單條，變化更明顯）
const switcherEqualizerHeight = computed(() => {
  if (equalizerBars.value.length === 0) return 30
  // 使用所有條的平均值，但增加動態範圍讓變化更明顯
  const avg = equalizerBars.value.reduce((a, b) => a + b, 0) / equalizerBars.value.length
  // 將範圍擴展：20-100 映射到 15-100（最低15%，最高100%保持不變）
  // 使用平方根讓變化更明顯
  const normalized = (avg - 20) / 80 // 0-1
  const enhanced = Math.pow(normalized, 0.7) // 使用0.7次方讓變化更明顯
  return Math.max(15, 15 + enhanced * 85) // 15-100
})

// 文字顏色切換
const textColors = ['#999999', '#ffffff', '#FF6B35', '#39FF14', '#FFA500'] // 灰、白、太空橘、螢光綠、橘黃
const currentColorIndex = ref(0)
const currentTextColor = computed(() => textColors[currentColorIndex.value])

const cycleTextColor = () => {
  currentColorIndex.value = (currentColorIndex.value + 1) % textColors.length
}

// 等化器位置方案：'left' | 'between' | 'right' | 'replace-number' | 'above-text'
const equalizerPosition = ref<'left' | 'between' | 'right' | 'replace-number' | 'above-text'>('right')

const setItemRef = (el: any, index: number) => {
  if (el) {
    // 處理 Vue 組件實例或 DOM 元素
    const element = el instanceof HTMLElement ? el : (el.$el || el)
    if (element instanceof HTMLElement) {
      itemRefs.value[index] = element
    }
  }
}

// 播放指定索引的歌曲
const playSongByIndex = async (songIndex: number) => {
  const playlist = currentPlaylist.value
  if (!playlist || songIndex < 0 || songIndex >= playlist.songs.length) {
    return
  }
  
  const song = playlist.songs[songIndex]
  const playlistIndex = Math.round(progress.value)
  
  // 記錄播放時的分頁索引
  playingPlaylistIndex.value = playlistIndex
  
  // 計算全局歌曲索引：每個分頁有5首歌，總共20首歌
  // 分頁0: 0-4, 分頁1: 5-9, 分頁2: 10-14, 分頁3: 15-19
  const globalSongIndex = playlistIndex * 5 + songIndex
  
  const songPath = `/music/${playlistIndex}/${songIndex}.mp3`
  const altSongPath = `/music/${globalSongIndex}.mp3` // 使用全局索引作為備用路徑
  
  try {
    // 先嘗試子目錄結構
    await playSong(songPath, song)
  } catch (error) {
    // 如果第一個路徑失敗，嘗試備用路徑（根目錄）
    console.log(`嘗試備用路徑: ${altSongPath}`)
    try {
      await playSong(altSongPath, song)
    } catch (altError) {
      console.error('播放音樂失敗:', error, altError, `路徑1: ${songPath}, 路徑2: ${altSongPath}`)
      // 即使文件不存在，也顯示等化器效果（演示用）
      audioState.value.isPlaying = true
      audioState.value.currentSong = song
      startEqualizerAnimation()
      return
    }
  }
  
  // 等待一下讓狀態更新
  await nextTick()
  
  // 啟動等化器動畫
  if (isPlayingSong(song)) {
    startEqualizerAnimation()
  }
}

// 處理歌曲點擊
const handleSongClick = async (song: string, songIndex: number) => {
  const wasPlaying = isPlayingSong(song)
  
  // 如果正在播放同一首歌，則暫停
  if (wasPlaying) {
    pauseSong()
    stopEqualizerAnimation()
    return
  }
  
  // 播放選中的歌曲
  await playSongByIndex(songIndex)
}

// 播放下一首歌曲
const playNextSong = async () => {
  const playlist = currentPlaylist.value
  if (!playlist || playlist.songs.length === 0) {
    return
  }
  
  // 找到當前播放的歌曲索引
  const currentSong = audioState.value.currentSong
  let currentIndex = -1
  
  if (currentSong) {
    currentIndex = playlist.songs.findIndex(song => song === currentSong)
  }
  
  // 計算下一首的索引（循環）
  const nextIndex = (currentIndex + 1) % playlist.songs.length
  
  console.log('播放下一首:', nextIndex, playlist.songs[nextIndex])
  await playSongByIndex(nextIndex)
}

// 啟動等化器動畫
const startEqualizerAnimation = () => {
  // 如果已經在運行，先停止再重新開始
  if (equalizerAnimationId) {
    stopEqualizerAnimation()
  }
  
  const updateEqualizer = () => {
    // 檢查是否還有歌曲在播放
    if (!audioState.value.isPlaying || !audioState.value.currentSong) {
      stopEqualizerAnimation()
      return
    }
    
    const frequencyData = getFrequencyData()
    if (frequencyData) {
      // 將頻率數據轉換為等化器條的高度（0-100%）
      const barCount = 5
      const dataLength = frequencyData.length
      const step = Math.floor(dataLength / barCount)
      
      equalizerBars.value = Array.from({ length: barCount }, (_, i) => {
        const index = i * step
        const value = frequencyData[index] || 0
        // 將 0-255 映射到 20-100（最小高度 20% 讓它更明顯）
        return 20 + (value / 255) * 80
      })
    } else {
      // 如果沒有頻率數據，使用隨機動畫
      equalizerBars.value = equalizerBars.value.map(() => 
        20 + Math.random() * 60
      )
    }
    
    equalizerAnimationId = requestAnimationFrame(updateEqualizer)
  }
  
  updateEqualizer()
}

// 停止等化器動畫
const stopEqualizerAnimation = () => {
  if (equalizerAnimationId) {
    cancelAnimationFrame(equalizerAnimationId)
    equalizerAnimationId = null
  }
  equalizerBars.value = Array(5).fill(0)
  playingPlaylistIndex.value = null
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

// 節點配置：0, 1, 2, 3 - 對應四張專輯
const nodes = [
  { 
    color: '#D3D5D4',
    title: 'Relaxation & Calm',
    songs: [
      'Inner Calm',
      'Zen Garden',
      'Peaceful Mind',
      'Tranquil Waters',
      'Serenity Path'
    ]
  },
  { 
    color: '#A2C5AC',
    title: 'Focus & Clarity',
    songs: [
      'Deep Focus',
      'Mental Clarity',
      'Concentration Flow',
      'Mindful Work',
      'Productive Energy'
    ]
  },
  { 
    color: '#9DB5B2',
    title: 'Meditation & Peace',
    songs: [
      'Gentle Breeze',
      'Soft Rain',
      'Evening Peace',
      'Calm Ocean',
      'Restful Moments'
    ]
  },
  { 
    color: '#878E99',
    title: 'Sleep & Dreams',
    songs: [
      'Nightfall',
      'Dreamscape',
      'Lullaby',
      'Moonlight',
      'Starlight Sleep'
    ]
  }
]

// 計算當前顯示的專輯
const currentPlaylist = computed(() => {
  const currentIndex = Math.round(progress.value)
  return nodes[currentIndex] || nodes[0]
})

// 計算當前節點索引
const currentNodeIndex = computed(() => Math.round(progress.value))

// 圖片序列配置
// 結構：節點0 → 過場01 → 節點1 → 過場02 → 節點2 → 過場03 → 節點3
const imageSequence = useImageSequence()
const { progress, animateTo } = useAnimation()

// Canvas 尺寸變數，避免重複計算
let canvasDisplayWidth = 0
let canvasDisplayHeight = 0
let canvasDpr = 1

// 初始化 Canvas - 全螢幕滿版
const initCanvas = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  
  // 直接使用視窗尺寸（全螢幕滿版）
  const containerWidth = window.innerWidth
  const containerHeight = window.innerHeight
  
  // 全螢幕滿版，直接使用視窗尺寸
  canvasDisplayWidth = containerWidth
  canvasDisplayHeight = containerHeight
  
  // 設置 canvas 實際像素尺寸（考慮設備像素比以獲得清晰度）
  canvasDpr = window.devicePixelRatio || 1
  canvas.width = canvasDisplayWidth * canvasDpr
  canvas.height = canvasDisplayHeight * canvasDpr
  
  // 設置 canvas 顯示尺寸（全螢幕滿版）
  canvas.style.width = `${canvasDisplayWidth}px`
  canvas.style.height = `${canvasDisplayHeight}px`
  
  // 強制移除可 focus 性和選取行為
  canvas.setAttribute('tabindex', '-1')
  canvas.style.outline = 'none'
  canvas.style.userSelect = 'none'
  canvas.style.webkitUserSelect = 'none'
  
  // 縮放繪圖上下文以匹配設備像素比（只在初始化時設置一次）
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0)
    // 關閉圖像平滑，避免邊緣虛線效果
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
  }
}

// 渲染函數
let currentIndex = -1
let animationFrameId: number | null = null

const render = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 將 progress (0-3) 映射到圖片索引
  // progress 0 = 節點0
  // progress 0-1 = 過場01
  // progress 1 = 節點1
  // progress 1-2 = 過場02
  // progress 2 = 節點2
  // progress 2-3 = 過場03
  // progress 3 = 節點3
  
  const totalImages = imageSequence.getTotalImages()
  const index = Math.round(normalize(progress.value, 0, 3) * (totalImages - 1))
  
  // 如果尺寸改變或索引改變，都需要重新繪製
  const shouldRedraw = index !== currentIndex || canvasDisplayWidth === 0 || canvasDisplayHeight === 0
  
  if (shouldRedraw && index >= 0 && index < totalImages) {
    currentIndex = index
    const image = imageSequence.getImage(index)
    if (image && canvasDisplayWidth > 0 && canvasDisplayHeight > 0) {
      // 使用固定的 canvas 顯示尺寸（全螢幕滿版）
      const displayWidth = canvasDisplayWidth
      const displayHeight = canvasDisplayHeight
      
      // 計算圖片比例
      const imageAspectRatio = image.width / image.height
      const canvasAspectRatio = displayWidth / displayHeight
      
      let drawWidth = displayWidth
      let drawHeight = displayHeight
      let offsetX = 0
      let offsetY = 0
      
      // 使用 cover 模式：填滿整個 canvas，保持比例，可能會裁剪
      if (imageAspectRatio > canvasAspectRatio) {
        // 圖片較寬，以高度為準（填滿高度，寬度會超出）
        drawWidth = displayHeight * imageAspectRatio
        offsetX = (displayWidth - drawWidth) / 2
      } else {
        // 圖片較高，以寬度為準（填滿寬度，高度會超出）
        drawHeight = displayWidth / imageAspectRatio
        offsetY = (displayHeight - drawHeight) / 2
      }
      
      // 設置圖像平滑
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // 保存上下文狀態
      ctx.save()
      
      // 清除整個 canvas（確保清除所有像素，包括邊緣）
      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, displayWidth, displayHeight)
      ctx.clearRect(0, 0, displayWidth, displayHeight)
      
      // 設置裁剪區域為整個 canvas（避免邊緣問題）
      ctx.beginPath()
      ctx.rect(0, 0, displayWidth, displayHeight)
      ctx.clip()
      
      // 繪製圖片（cover 模式，填滿整個 canvas）
      // 確保圖片完全覆蓋 canvas，避免邊緣留白
      const finalOffsetX = Math.floor(offsetX)
      const finalOffsetY = Math.floor(offsetY)
      const finalDrawWidth = Math.ceil(drawWidth)
      const finalDrawHeight = Math.ceil(drawHeight)
      
      // 如果圖片沒有完全覆蓋 canvas 邊緣，稍微擴展繪製區域
      if (finalOffsetX > 0) {
        // 左邊有空白，向右擴展
        ctx.drawImage(
          image,
          finalOffsetX - 0.5,
          finalOffsetY,
          finalDrawWidth + 0.5,
          finalDrawHeight
        )
      } else if (finalOffsetX + finalDrawWidth < displayWidth) {
        // 右邊有空白，向左擴展
        ctx.drawImage(
          image,
          finalOffsetX,
          finalOffsetY,
          finalDrawWidth + 0.5,
          finalDrawHeight
        )
      } else if (finalOffsetY > 0) {
        // 上邊有空白，向下擴展
        ctx.drawImage(
          image,
          finalOffsetX,
          finalOffsetY - 0.5,
          finalDrawWidth,
          finalDrawHeight + 0.5
        )
      } else if (finalOffsetY + finalDrawHeight < displayHeight) {
        // 下邊有空白，向上擴展
        ctx.drawImage(
          image,
          finalOffsetX,
          finalOffsetY,
          finalDrawWidth,
          finalDrawHeight + 0.5
        )
      } else {
        // 正常繪製
        ctx.drawImage(
          image,
          finalOffsetX,
          finalOffsetY,
          finalDrawWidth,
          finalDrawHeight
        )
      }
      
      // 恢復上下文狀態
      ctx.restore()
    }
  }
  
  animationFrameId = requestAnimationFrame(render)
}

const normalize = (value: number, min: number, max: number): number => {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

const goToNode = (nodeIndex: number) => {
  animateTo(nodeIndex)
}

// 觸摸滑動手勢支持（手機版本）
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
const minSwipeDistance = 50 // 最小滑動距離（像素）
const maxVerticalDistance = 100 // 最大垂直滑動距離（避免與垂直滾動衝突）

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    touchStartTime = Date.now()
  }
}

const handleTouchMove = (e: TouchEvent) => {
  // 可以添加實時反饋（可選）
  e.preventDefault() // 防止頁面滾動
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!touchStartX || !touchStartY) return
  
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const touchEndTime = Date.now()
  
  const deltaX = touchEndX - touchStartX
  const deltaY = Math.abs(touchEndY - touchStartY)
  const deltaTime = touchEndTime - touchStartTime
  
  // 重置觸摸狀態
  touchStartX = 0
  touchStartY = 0
  touchStartTime = 0
  
  // 檢查是否為有效的水平滑動
  // 1. 水平距離要大於垂直距離（確保是左右滑動）
  // 2. 水平距離要達到最小滑動距離
  // 3. 垂直距離不能太大（避免與滾動衝突）
  // 4. 時間不能太長（快速滑動）
  if (Math.abs(deltaX) > Math.abs(deltaY) && 
      Math.abs(deltaX) > minSwipeDistance && 
      deltaY < maxVerticalDistance &&
      deltaTime < 500) {
    
    const currentIndex = Math.round(progress.value)
    
    if (deltaX > 0) {
      // 向右滑動 = 上一頁
      if (currentIndex > 0) {
        goToNode(currentIndex - 1)
      }
    } else {
      // 向左滑動 = 下一頁
      if (currentIndex < nodes.length - 1) {
        goToNode(currentIndex + 1)
      }
    }
  }
}

// 窗口大小變化處理
const handleResize = () => {
  initCanvas()
  // 強制重新繪製當前圖片，避免黑屏
  currentIndex = -1
}

const initTextAnimations = async () => {
  await nextTick()
  
  itemRefs.value.forEach((item, index) => {
    if (!item) return
    
    const cols = Array.from(item.querySelectorAll('.hover-effect')) as HTMLElement[]
    const itemAnimators = cols.map(col => new TextAnimator(col))
    animators.value.set(index, itemAnimators)

    item.addEventListener('mouseenter', () => {
      itemAnimators.forEach(animator => animator.animate())
    })
    item.addEventListener('mouseleave', () => {
      itemAnimators.forEach(animator => animator.animateBack())
    })
  })
}

onMounted(async () => {
  // 開始載入動畫
  isLoading.value = true
  loadingProgress.value = 0
  
  // 真實追蹤圖片載入進度
  await imageSequence.loadImages((progress) => {
    // 圖片載入進度：0-90%
    loadingProgress.value = progress
  })
  
  // 圖片載入完成後，進行其他初始化（佔用剩餘 10%）
  loadingProgress.value = 95
  
  // 載入完成
  loadingProgress.value = 100
  
  // 等待一小段時間讓用戶看到 100%
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 載入完成，隱藏載入畫面
  isLoading.value = false
  
  // 等待 DOM 更新，確保所有元素都已經渲染
  await nextTick()
  
  // 初始化 canvas（必須在 DOM 渲染後）
  initCanvas()
  
  // 監聽窗口大小變化，重新調整 canvas
  window.addEventListener('resize', handleResize)
  
  // 監聽歌曲播放結束事件，自動播放下一首
  window.addEventListener('song-ended', playNextSong)
  
  // 開始渲染 canvas（必須在 canvas 元素存在後）
  render()
  
  // 初始化文字動畫（必須在 DOM 渲染後）
  await initTextAnimations()
})

// 當專輯切換時重新初始化動畫並觸發所有文字動畫
const currentPlaylistKey = computed(() => Math.round(progress.value))

watch(currentPlaylistKey, async () => {
  await nextTick()
  
  // 清理舊的動畫器
  animators.value.forEach(animators => {
    animators.forEach(animator => animator.reset())
  })
  animators.value.clear()
  
  // 重新初始化
  await initTextAnimations()
  
  // 如果正在播放音樂，確保等化器動畫繼續運行
  if (audioState.value.isPlaying && audioState.value.currentSong) {
    if (!equalizerAnimationId) {
      startEqualizerAnimation()
    }
  }
  
  // 觸發所有文字的動畫
  setTimeout(() => {
    animators.value.forEach(animators => {
      animators.forEach(animator => {
        animator.animate()
        // 動畫完成後恢復
        setTimeout(() => {
          animator.animateBack()
        }, 1500)
      })
    })
  }, 100)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  stopEqualizerAnimation()
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('song-ended', playNextSong)
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
}

.content {
  display: flex;
  height: 100vh;
  overflow: hidden;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  position: relative;
}

.switcher-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 10;
  pointer-events: none;
}

.switcher {
  display: flex;
  align-items: center;
  gap: 16px;
  background: transparent;
  padding: 0;
  pointer-events: auto;
}

.switcher-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--text-color);
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.5;
  padding: 4px;
  margin: -4px;
  flex-shrink: 0;
  position: relative;
}

.switcher-dot:hover {
  opacity: 0.8;
  transform: scale(1.2);
}

.switcher-dot.active {
  opacity: 1;
  width: 20px;
  border-radius: 3px;
  transform: scale(1);
  background-color: var(--text-color);
}

/* 分頁點上的小等化器 - 寬度與分頁點一致 */
.switcher-equalizer {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 20px;
  width: 6px; /* 預設與非 active 分頁點一樣寬 */
  gap: 0;
  opacity: 1;
  transition: width 0.3s ease, opacity 0.3s ease;
  pointer-events: none;
}

.switcher-equalizer.is-active-dot {
  width: 20px; /* active 分頁點時與分頁點一樣寬 */
}

.switcher-equalizer-bar {
  width: 100%; /* 填滿容器寬度 */
  background-color: var(--text-color);
  min-height: 6px;
  border-radius: 2px;
  transition: height 0.1s ease-out;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
}

/* 手機版本等化器 */
@media screen and (max-width: 768px) {
  .switcher-equalizer {
    top: -35px;
    height: 24px;
    width: 6px; /* 預設與非 active 分頁點一樣寬 */
  }
  
  .switcher-equalizer.is-active-dot {
    width: 20px; /* active 分頁點時與分頁點一樣寬 */
  }
  
  .switcher-equalizer-bar {
    width: 100%; /* 填滿容器寬度 */
    min-height: 8px;
  }
}

.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
}

.canvas-wrapper canvas {
  display: block;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  /* 尺寸由 JavaScript 動態設置，不在 CSS 中設置 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  /* 移除默認的邊框和輪廓 */
  -webkit-tap-highlight-color: transparent;
  /* 完全移除 focus ring 和選取行為 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 移除所有 focus 狀態的 outline */
  outline: none !important;
}

/* 移除 :focus-visible 狀態的 outline（現代瀏覽器鍵盤導航時會顯示） */
.canvas-wrapper canvas:focus,
.canvas-wrapper canvas:focus-visible,
.canvas-wrapper canvas:focus-within {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

.text-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  pointer-events: none;
  width: 100%;
  max-width: 90vw;
  padding: 0 2rem;
  font-family: "JetBrains Mono", monospace;
  font-weight: 300;
  text-transform: uppercase;
}

/* 手機版本：文字容器靠底部 */
@media screen and (max-width: 768px) {
  .text-container {
    top: auto;
    bottom: 40px;
    transform: translateX(-50%);
  }
}

.content__title {
  font-size: 12px;
  color: #999999;
  margin-bottom: 2rem;
  pointer-events: none;
}

/* 動態文字顏色 */
.text-container {
  --text-color: v-bind(currentTextColor);
}

.text-container .content__title,
.text-container .list__item,
.text-container .list__item::before {
  color: var(--text-color);
}

/* 第三個節點（index 2）強制使用白色 */
.text-container.node-2 .content__title,
.text-container.node-2 .list__item,
.text-container.node-2 .list__item::before {
  color: white;
}

.list {
  margin: 0;
  padding: 0;
  width: 100%;
  list-style: none;
  display: flex;
  flex-direction: column;
  counter-reset: item 0;
}

.list__item {
  font-size: clamp(1.2rem, 5vw, 2rem);
  cursor: pointer;
  width: 100%;
  display: grid;
  color: #cccccc;
  grid-column-gap: 2rem;
  padding: 0.85rem 0;
  grid-template-columns: 100%;
  justify-content: space-between;
  align-items: start;
  justify-items: start;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
  position: relative;
}

/* 手機版本文字更大 */
@media screen and (max-width: 768px) {
  .list__item {
    font-size: clamp(1.5rem, 6vw, 2.5rem);
    padding: 1rem 0;
  }
  
  .content__title {
    font-size: 14px;
  }
}

.list__item::before {
  color: #999999;
  content: counter(item, decimal-leading-zero);
  counter-increment: item;
  font-weight: 500;
  padding: 3px 3px 0;
  line-height: 0.8;
  font-size: 0.8rem;
}

/* 動態文字顏色 - 使用 CSS 變數 */
.text-container {
  --text-color: v-bind(currentTextColor);
}

.text-container .content__title,
.text-container .list__item,
.text-container .list__item::before {
  color: var(--text-color);
}

/* 切換器顏色也跟著變化 */
.switcher-container {
  --text-color: v-bind(currentTextColor);
}

/* 切換器顏色也跟著變化 */
.switcher-container {
  --text-color: v-bind(currentTextColor);
}

.switcher-dot {
  background-color: var(--text-color);
  opacity: 0.3;
}

.switcher-dot.active {
  opacity: 1;
  background-color: var(--text-color);
}

/* 第三個節點（index 2）在桌面版本使用白色，手機版本使用動態顏色 */
.text-container.node-2 .content__title,
.text-container.node-2 .list__item,
.text-container.node-2 .list__item::before {
  color: white;
}

@media screen and (max-width: 768px) {
  .text-container.node-2 .content__title,
  .text-container.node-2 .list__item,
  .text-container.node-2 .list__item::before {
    color: var(--text-color);
  }
}

/* 播放中的歌曲樣式 */
.list__item.is-playing {
  position: relative;
}

/* 等化器基礎樣式 */
.equalizer {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
  width: 27px;
  flex-shrink: 0;
}

/* ========== 方案A：在數字和文字之間（預設） ========== */
.equalizer-between .equalizer {
  position: absolute;
  left: 50px; /* 在數字右側 */
  top: 50%;
  transform: translateY(-50%);
}

/* ========== 方案B：在文字右側（內聯） ========== */
.equalizer-right .equalizer {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.equalizer-right .list__item-col {
  padding-right: 35px; /* 為等化器留出空間 */
}

/* ========== 方案C：在文字上方 ========== */
.equalizer-above .equalizer {
  position: absolute;
  left: 0;
  top: -25px;
  transform: none;
}

.equalizer-above .list__item {
  padding-top: 1.5rem; /* 為等化器留出空間 */
}

/* ========== 方案D：替換數字位置 ========== */
.equalizer-replace .equalizer {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.equalizer-replace.is-playing::before {
  opacity: 0; /* 播放時隱藏數字 */
}

/* ========== 方案E：在左側（原方案） ========== */
.equalizer-left .equalizer {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
}

.equalizer-bar {
  width: 3px;
  background: currentColor;
  min-height: 2px;
  border-radius: 2px;
  transition: height 0.1s ease-out;
}

.list__item-col {
  position: relative;
  z-index: 1;
}

/* 手機版本等化器 */
@media screen and (max-width: 768px) {
  .equalizer {
    height: 24px;
    width: 32px;
    gap: 4px;
  }
  
  .equalizer-bar {
    width: 4px;
  }
  
  /* 方案A：在數字和文字之間 */
  .equalizer-between .equalizer {
    left: 60px;
  }
  
  /* 方案B：在文字右側 */
  .equalizer-right .list__item-col {
    padding-right: 40px;
  }
  
  /* 方案C：在文字上方 */
  .equalizer-above .equalizer {
    top: -30px;
  }
  
  .equalizer-above .list__item {
    padding-top: 2rem;
  }
  
  /* 方案D：替換數字位置 */
  .equalizer-replace .equalizer {
    left: 0;
  }
  
  /* 方案E：在左側 */
  .equalizer-left .equalizer {
    left: -45px;
  }
}

/* Logo 連結 - 左上角 */
.logo-link {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-sizing: border-box;
}

.logo-img {
  height: 32px;
  width: auto;
  display: block;
}

/* 桌面版本：logo 在左上角 */
@media screen and (min-width: 769px) {
  .logo-link {
    top: 20px;
    left: 20px;
  }
  
  .logo-img {
    height: 36px;
  }
}

/* 手機版本：logo 在左上角，color-switcher 在右上角（同一行） */
@media screen and (max-width: 768px) {
  .logo-link {
    top: max(20px, env(safe-area-inset-top));
    left: max(20px, env(safe-area-inset-left));
  }
  
  .logo-img {
    height: 28px;
  }
}

/* 顏色切換器 - 手機版本右上角 */
.color-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 20;
  cursor: pointer;
  display: none;
  padding: 8px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 0.2s;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.color-switcher:hover {
  transform: scale(1.1);
}

.color-switcher:active {
  transform: scale(0.95);
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

@media screen and (max-width: 768px) {
  .color-switcher {
    display: flex;
    top: max(20px, env(safe-area-inset-top));
    right: max(20px, env(safe-area-inset-right));
  }
  
  .color-dot {
    width: 16px;
    height: 16px;
  }
}

@media screen and (min-width: 769px) {
  .color-switcher {
    display: none !important;
  }
}

.list__item-col {
  flex: none;
  padding: 3px 3px 0;
  line-height: 0.8;
}

.hover-effect {
  font-kerning: none;
  position: relative;
  white-space: nowrap;
}

.hover-effect .word {
  white-space: nowrap;
}

.hover-effect .char {
  position: relative;
}

.hover-effect--bg-south {
  --anim: 0;
}

.hover-effect--bg-south::after {
  content: '';
  position: absolute;
  z-index: -1;
  left: -8px;
  right: -8px;
  top: -8px;
  bottom: -8px;
  border-radius: 2px;
  height: auto;
  width: auto;
  background-color: rgba(229, 222, 204, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  transform-origin: 50% 100%;
  transform: scaleY(var(--anim));
}

</style>

