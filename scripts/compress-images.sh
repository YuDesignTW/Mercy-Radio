#!/bin/bash

# 圖片優化腳本 - 將 JPG 轉換為 WebP 格式
# 可減少 40-50% 的檔案大小

echo "🖼️  開始圖片優化..."
echo "================================"

# 檢查是否安裝 cwebp (WebP 轉換工具)
if ! command -v cwebp &> /dev/null; then
    echo "❌ 錯誤: 未安裝 cwebp"
    echo ""
    echo "請先安裝 WebP 工具："
    echo "  macOS:   brew install webp"
    echo "  Ubuntu:  sudo apt-get install webp"
    echo "  Windows: 從 https://developers.google.com/speed/webp/download 下載"
    echo ""
    exit 1
fi

# 設定品質參數 (80 是高品質，檔案大小適中)
QUALITY=80

# 計數器
total_files=0
converted_files=0
skipped_files=0
original_size=0
new_size=0

# 函數：轉換單個圖片
convert_image() {
    local input_file="$1"
    local output_file="${input_file%.jpg}.webp"
    
    # 如果 WebP 已存在且比 JPG 新，跳過
    if [ -f "$output_file" ] && [ "$output_file" -nt "$input_file" ]; then
        echo "⏭️  跳過 (已存在): $input_file"
        ((skipped_files++))
        return
    fi
    
    # 獲取原始檔案大小
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local file_size=$(stat -f%z "$input_file")
    else
        local file_size=$(stat -c%s "$input_file")
    fi
    original_size=$((original_size + file_size))
    
    # 轉換為 WebP
    if cwebp -q $QUALITY "$input_file" -o "$output_file" > /dev/null 2>&1; then
        # 獲取新檔案大小
        if [[ "$OSTYPE" == "darwin"* ]]; then
            local new_file_size=$(stat -f%z "$output_file")
        else
            local new_file_size=$(stat -c%s "$output_file")
        fi
        new_size=$((new_size + new_file_size))
        
        # 計算壓縮率
        local reduction=$(( (file_size - new_file_size) * 100 / file_size ))
        
        echo "✅ 轉換成功: $input_file → $output_file (減少 ${reduction}%)"
        ((converted_files++))
    else
        echo "❌ 轉換失敗: $input_file"
    fi
}

# 轉換節點圖片 (0.jpg, 01.jpg, 02.jpg, 03.jpg)
echo ""
echo "📁 處理節點圖片..."
echo "--------------------------------"
for img in public/*.jpg; do
    if [ -f "$img" ]; then
        ((total_files++))
        convert_image "$img"
    fi
done

# 轉換 morphing 序列圖片
echo ""
echo "📁 處理 Morphing 序列圖片..."
echo "--------------------------------"

for dir in public/morphing/*/; do
    if [ -d "$dir" ]; then
        dir_name=$(basename "$dir")
        echo ""
        echo "處理資料夾: $dir_name"
        
        for img in "$dir"*.jpg; do
            if [ -f "$img" ]; then
                ((total_files++))
                convert_image "$img"
            fi
        done
    fi
done

# 顯示統計資訊
echo ""
echo "================================"
echo "✨ 圖片優化完成！"
echo "================================"
echo "總檔案數: $total_files"
echo "已轉換: $converted_files"
echo "已跳過: $skipped_files"
echo ""

if [ $converted_files -gt 0 ]; then
    # 計算總壓縮率
    total_reduction=$(( (original_size - new_size) * 100 / original_size ))
    original_mb=$(echo "scale=2; $original_size / 1024 / 1024" | bc)
    new_mb=$(echo "scale=2; $new_size / 1024 / 1024" | bc)
    saved_mb=$(echo "scale=2; ($original_size - $new_size) / 1024 / 1024" | bc)
    
    echo "原始大小: ${original_mb} MB"
    echo "新大小: ${new_mb} MB"
    echo "節省空間: ${saved_mb} MB (${total_reduction}%)"
    echo ""
    echo "💡 下一步: 執行 ./scripts/update-image-paths.sh 更新程式碼中的圖片路徑"
fi

echo ""

