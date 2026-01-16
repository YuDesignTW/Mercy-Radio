import { ref, onUnmounted } from 'vue'

export interface AudioPlayerState {
  isPlaying: boolean
  currentSong: string | null
  audioContext: AudioContext | null
  analyser: AnalyserNode | null
  audioElement: HTMLAudioElement | null
  source: MediaElementAudioSourceNode | null
  dataArray: Uint8Array | null
}

export function useAudioPlayer() {
  const state = ref<AudioPlayerState>({
    isPlaying: false,
    currentSong: null,
    audioContext: null,
    analyser: null,
    audioElement: null,
    source: null,
    dataArray: null
  })

  // 初始化音頻上下文和分析器
  const initAudioContext = async () => {
    if (!state.value.audioContext) {
      state.value.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // 如果音頻上下文被暫停（需要用戶交互），恢復它
      if (state.value.audioContext.state === 'suspended') {
        await state.value.audioContext.resume()
      }
      
      state.value.analyser = state.value.audioContext.createAnalyser()
      state.value.analyser.fftSize = 256
      const bufferLength = state.value.analyser.frequencyBinCount
      state.value.dataArray = new Uint8Array(bufferLength)
    } else if (state.value.audioContext.state === 'suspended') {
      // 如果已經存在但被暫停，恢復它
      await state.value.audioContext.resume()
    }
  }

  // 播放音樂
  const playSong = async (songPath: string, songName: string) => {
    console.log('playSong called:', songPath, songName)
    
    // 如果正在播放同一首歌，則暫停
    if (state.value.currentSong === songName && state.value.isPlaying) {
      console.log('Pausing current song')
      pauseSong()
      return
    }

    // 如果正在播放其他歌曲，先停止
    if (state.value.audioElement && state.value.currentSong !== songName) {
      console.log('Stopping previous song')
      stopSong()
    }

    try {
      await initAudioContext()
      console.log('AudioContext initialized, state:', state.value.audioContext?.state)

      // 創建音頻元素
      const audio = new Audio(songPath)
      audio.loop = false // 不循環單首歌曲，播完後播下一首
      audio.preload = 'auto'

      // 等待音頻可以播放
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`音頻載入超時: ${songPath}`))
        }, 5000)

        audio.oncanplaythrough = () => {
          clearTimeout(timeout)
          console.log('Audio can play through:', songPath)
          resolve()
        }
        
        audio.onerror = (e) => {
          clearTimeout(timeout)
          console.error('Audio loading error:', e, songPath, audio.error)
          reject(new Error(`無法載入音頻文件: ${songPath} - ${audio.error?.message || 'Unknown error'}`))
        }
        
        // 如果已經可以播放，立即 resolve
        if (audio.readyState >= 3) {
          clearTimeout(timeout)
          console.log('Audio already ready:', songPath)
          resolve()
        }
      })

      // 連接到分析器
      if (state.value.audioContext && state.value.analyser) {
        try {
          const source = state.value.audioContext.createMediaElementSource(audio)
          source.connect(state.value.analyser)
          state.value.analyser.connect(state.value.audioContext.destination)
          state.value.source = source
          console.log('Audio source connected to analyser')
        } catch (err: any) {
          // 如果已經連接過，可能會報錯，但可以繼續播放
          if (!err.message?.includes('already been connected')) {
            console.warn('Audio source connection warning:', err)
          }
        }
      }

      // 播放
      console.log('Attempting to play audio:', songPath)
      await audio.play()
      console.log('Audio playing successfully:', songPath)

      state.value.audioElement = audio
      state.value.currentSong = songName
      state.value.isPlaying = true

      // 處理播放結束 - 觸發事件讓外部處理下一首
      audio.onended = () => {
        console.log('Audio ended:', songPath)
        state.value.isPlaying = false
        // 觸發自定義事件，讓 App.vue 處理下一首
        window.dispatchEvent(new CustomEvent('song-ended', { 
          detail: { songName, songPath } 
        }))
      }
    } catch (error: any) {
      console.error('Error playing audio:', error, songPath)
      state.value.isPlaying = false
      throw error // 重新拋出錯誤，讓調用者知道失敗了
    }
  }

  // 暫停音樂
  const pauseSong = () => {
    if (state.value.audioElement && state.value.isPlaying) {
      state.value.audioElement.pause()
      state.value.isPlaying = false
    }
  }

  // 恢復播放
  const resumeSong = () => {
    if (state.value.audioElement && !state.value.isPlaying) {
      state.value.audioElement.play()
      state.value.isPlaying = true
    }
  }

  // 停止音樂
  const stopSong = () => {
    if (state.value.audioElement) {
      state.value.audioElement.pause()
      state.value.audioElement.currentTime = 0
      state.value.audioElement = null
    }
    if (state.value.source) {
      state.value.source.disconnect()
      state.value.source = null
    }
    state.value.isPlaying = false
    state.value.currentSong = null
  }

  // 獲取頻率數據（用於等化器）
  const getFrequencyData = (): Uint8Array | null => {
    if (state.value.analyser && state.value.dataArray) {
      state.value.analyser.getByteFrequencyData(state.value.dataArray)
      return state.value.dataArray
    }
    return null
  }

  // 檢查是否正在播放指定歌曲
  const isPlayingSong = (songName: string): boolean => {
    return state.value.isPlaying && state.value.currentSong === songName
  }

  // 清理
  onUnmounted(() => {
    stopSong()
    if (state.value.audioContext) {
      state.value.audioContext.close()
    }
  })

  return {
    state,
    playSong,
    pauseSong,
    resumeSong,
    stopSong,
    getFrequencyData,
    isPlayingSong
  }
}
