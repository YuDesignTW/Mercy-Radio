# 🚀 Buda Music 優化腳本

這些腳本用於優化專案的圖片和音樂文件，大幅減少檔案大小並改善載入速度。

## 📋 腳本說明

### 1. `optimize-all.sh` - 一鍵優化（推薦）
執行所有優化步驟，包括圖片轉換、音樂壓縮和程式碼更新。

```bash
chmod +x scripts/*.sh
bash scripts/optimize-all.sh
```

### 2. `compress-images.sh` - 圖片優化
將所有 JPG 圖片轉換為 WebP 格式，減少 40-50% 檔案大小。

```bash
bash scripts/compress-images.sh
```

### 3. `compress-music.sh` - 音樂優化
將音樂文件比特率降低到 128kbps，減少約 50% 檔案大小。

```bash
bash scripts/compress-music.sh
```

### 4. `update-image-paths.sh` - 更新程式碼
更新程式碼中的圖片路徑（.jpg → .webp）。

```bash
bash scripts/update-image-paths.sh
```

## 🛠️ 前置需求

### macOS
```bash
# 安裝 WebP 工具
brew install webp

# 安裝 FFmpeg
brew install ffmpeg
```

### Ubuntu/Debian
```bash
# 安裝 WebP 工具
sudo apt-get install webp

# 安裝 FFmpeg
sudo apt-get install ffmpeg
```

### Windows
1. 下載 WebP 工具: https://developers.google.com/speed/webp/download
2. 下載 FFmpeg: https://ffmpeg.org/download.html
3. 將工具添加到系統 PATH

## 📊 預期效果

| 項目 | 原始大小 | 優化後 | 節省 |
|------|---------|--------|------|
| Morphing 圖片 | 229 MB | ~115 MB | ~50% |
| 音樂文件 | 103 MB | ~52 MB | ~50% |
| **總計** | **332 MB** | **~167 MB** | **~50%** |

## ⚡ 載入時間改善

| 網速 | 優化前 | 優化後 | 改善 |
|------|--------|--------|------|
| 光纖 (100Mbps) | 30秒 | 15秒 | 50% ⬇️ |
| 4G (10Mbps) | 5分鐘 | 2.5分鐘 | 50% ⬇️ |
| 3G (1Mbps) | 50分鐘 | 25分鐘 | 50% ⬇️ |

## 🔄 執行流程

1. **執行優化**
   ```bash
   bash scripts/optimize-all.sh
   ```

2. **重新構建**
   ```bash
   npm run build
   ```

3. **測試功能**
   ```bash
   npm run preview
   ```

4. **部署到 v0**
   - 上傳 `dist/` 資料夾

## ⚠️ 注意事項

1. **備份**: 腳本會自動備份程式碼文件
2. **時間**: 優化過程需要 10-30 分鐘
3. **空間**: 確保有足夠的磁碟空間（至少 500MB）
4. **還原**: 如需還原，使用備份文件：
   ```bash
   cp src/composables/useImageSequence.ts.backup src/composables/useImageSequence.ts
   ```

## 🐛 常見問題

### Q: 執行腳本時出現 "Permission denied"
```bash
chmod +x scripts/*.sh
```

### Q: 找不到 cwebp 或 ffmpeg
請確認已安裝相關工具，並添加到系統 PATH。

### Q: 優化後圖片無法顯示
檢查瀏覽器是否支援 WebP 格式（現代瀏覽器都支援）。

### Q: 音質是否會下降？
128kbps 對於背景音樂已經足夠，一般用戶無法察覺差異。

## 📝 技術細節

### WebP 轉換參數
- 品質: 80 (高品質)
- 格式: WebP
- 壓縮: 有損壓縮

### 音樂轉換參數
- 比特率: 128kbps
- 格式: MP3
- 保留: ID3 標籤

## 🎯 下一步優化建議

完成基本優化後，可以考慮：

1. **漸進式載入** - 只載入當前需要的圖片
2. **Service Worker** - 實現離線緩存
3. **CDN 加速** - 使用 CDN 分發靜態資源
4. **圖片懶加載** - 延遲載入非關鍵圖片

## 📞 支援

如有問題，請檢查：
1. 工具是否正確安裝
2. 檔案路徑是否正確
3. 磁碟空間是否足夠

