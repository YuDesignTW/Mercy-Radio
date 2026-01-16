# SEO 與社群分享設定指南

## 📋 需要準備的圖片檔案

請將以下圖片檔案放置在 `public/` 目錄中：

### 1. Favicon（頁籤縮圖）

需要準備以下尺寸的 favicon：

- **favicon-16x16.png** - 16x16 像素
- **favicon-32x32.png** - 32x32 像素
- **apple-touch-icon.png** - 180x180 像素（iOS 裝置用）

**建議：**
- 可以使用你的 logo.png 作為基礎
- 確保圖示在 small size 時仍然清晰可辨
- 背景建議使用透明或單色背景

### 2. Open Graph / 社群分享圖片

- **og-image.png** - 1200x630 像素（Facebook、LinkedIn 等使用）

**建議：**
- 尺寸必須是 1200x630 像素
- 包含網站名稱或主要視覺元素
- 文字要夠大，在縮圖時也能清楚閱讀
- 可以使用你的 logo 或專案的主要視覺

### 3. Site Manifest（選填）

- **site.webmanifest** - JSON 格式的設定檔（用於 PWA）

## 🛠️ 如何創建這些圖片

### 方法一：使用線上工具

1. **Favicon Generator**
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/
   - 上傳你的 logo.png，工具會自動生成所有尺寸

2. **OG Image Generator**
   - https://www.canva.com/（搜尋 "Facebook Post" 模板，尺寸 1200x630）
   - https://www.figma.com/（設計工具）
   - 或使用現有的設計工具

### 方法二：使用現有圖片轉換

如果你有 logo.png，可以使用以下方式：

1. **使用 ImageMagick（命令列）**
   ```bash
   # 安裝 ImageMagick（如果還沒安裝）
   brew install imagemagick
   
   # 生成 favicon
   convert public/logo.png -resize 32x32 public/favicon-32x32.png
   convert public/logo.png -resize 16x16 public/favicon-16x16.png
   convert public/logo.png -resize 180x180 public/apple-touch-icon.png
   
   # 生成 OG 圖片（需要先創建 1200x630 的畫布）
   convert -size 1200x630 xc:white public/logo.png -gravity center -composite public/og-image.png
   ```

2. **使用線上圖片編輯器**
   - https://www.iloveimg.com/resize-image
   - https://www.remove.bg/（如果需要去背）

## 📝 Site Manifest 範例

創建 `public/site.webmanifest` 檔案：

```json
{
  "name": "Buda Music",
  "short_name": "Buda Music",
  "description": "沉浸式音樂體驗",
  "icons": [
    {
      "src": "/favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ],
  "theme_color": "#D3D5D4",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/"
}
```

## 🔍 重要提醒

1. **更新網址**
   - 請將 `index.html` 中的 `https://mercy-radio.vercel.app/` 替換為你的實際網址
   - 如果還沒部署，可以先使用預設值，部署後再更新

2. **測試工具**
   - Facebook Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator
   - Google Rich Results Test: https://search.google.com/test/rich-results

3. **圖片格式**
   - Favicon: PNG 格式（支援透明背景）
   - OG Image: PNG 或 JPG（建議 PNG 以保持品質）

## ✅ 檢查清單

- [ ] 準備 favicon-16x16.png
- [ ] 準備 favicon-32x32.png
- [ ] 準備 apple-touch-icon.png
- [ ] 準備 og-image.png (1200x630)
- [ ] 創建 site.webmanifest（選填）
- [ ] 更新 index.html 中的實際網址
- [ ] 使用測試工具驗證設定

## 📚 參考資源

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
