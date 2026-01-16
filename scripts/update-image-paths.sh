#!/bin/bash

# 更新程式碼中的圖片路徑 - 從 .jpg 改為 .webp

echo "🔄 更新圖片路徑..."
echo "================================"

# 備份原始文件
echo "📦 備份原始文件..."
cp src/composables/useImageSequence.ts src/composables/useImageSequence.ts.backup

# 使用 sed 替換 .jpg 為 .webp
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS 版本
    sed -i '' 's/\.jpg/.webp/g' src/composables/useImageSequence.ts
else
    # Linux 版本
    sed -i 's/\.jpg/.webp/g' src/composables/useImageSequence.ts
fi

echo "✅ 已更新 src/composables/useImageSequence.ts"
echo ""
echo "變更內容："
echo "  - 節點圖片: /0.jpg → /0.webp"
echo "  - 節點圖片: /01.jpg → /01.webp"
echo "  - 節點圖片: /02.jpg → /02.webp"
echo "  - 節點圖片: /03.jpg → /03.webp"
echo "  - Morphing 序列: .jpg → .webp"
echo ""
echo "💡 備份文件已保存至: src/composables/useImageSequence.ts.backup"
echo ""

