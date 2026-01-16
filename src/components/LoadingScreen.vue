<template>
  <div v-if="isLoading" class="loading-screen">
    <div class="loading-content">
      <div class="loading-header">
        <a href="https://yu-design.tw/" target="_blank" class="loading-credit">
          Create by YuDesign
        </a>
      </div>
      
      <div class="loading-image-wrapper">
        <img 
          :src="loadingImageSrc" 
          alt="Loading" 
          class="loading-image"
          :style="{ opacity: imageOpacity }"
        />
      </div>
      
      <div class="loading-progress">
        <div class="progress-text">{{ Math.round(progress) }}%</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isLoading: boolean
  progress: number
}

const props = defineProps<Props>()

const loadingImageSrc = '/loading.png'

// 圖片透明度：進度 0-100% 對應透明度 0-1
const imageOpacity = computed(() => {
  return props.progress / 100
})
</script>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.5s ease-out;
}

.loading-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 600px;
  padding: 2rem;
  gap: 3rem;
  height: 100vh;
}

.loading-header {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-credit {
  color: rgba(0, 0, 0, 0.6);
  font-size: clamp(0.875rem, 2vw, 1rem);
  font-family: "JetBrains Mono", monospace;
  text-decoration: none;
  transition: color 0.3s ease;
  letter-spacing: 0.05em;
}

.loading-credit:hover {
  color: rgba(0, 0, 0, 1);
}

.loading-image-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 0;
}

.loading-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.loading-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.progress-text {
  color: rgba(0, 0, 0, 0.9);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-family: "JetBrains Mono", monospace;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.progress-bar {
  width: 100%;
  max-width: 300px;
  height: 2px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 1px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  transition: width 0.3s ease;
  border-radius: 1px;
}

/* 手機版本 */
@media screen and (max-width: 768px) {
  .loading-content {
    gap: 2rem;
    padding: 1.5rem;
  }
  
  .progress-bar {
    max-width: 250px;
  }
}
</style>
