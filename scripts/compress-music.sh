#!/bin/bash

# 音樂優化腳本 - 降低比特率到 128kbps
# 可減少約 50% 的檔案大小，音質仍然良好

echo "🎵 開始音樂優化..."
echo "================================"

# 檢查是否安裝 ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ 錯誤: 未安裝 ffmpeg"
    echo ""
    echo "請先安裝 FFmpeg："
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt-get install ffmpeg"
    echo "  Windows: 從 https://ffmpeg.org/download.html 下載"
    echo ""
    exit 1
fi

# 設定比特率 (128kbps 對背景音樂已足夠)
BITRATE="128k"

# 計數器
total_files=0
converted_files=0
skipped_files=0
original_size=0
new_size=0

# 創建臨時目錄
TEMP_DIR="public/music_temp"
mkdir -p "$TEMP_DIR"

# 函數：轉換單個音樂文件
convert_music() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local dirname=$(dirname "$input_file")
    local temp_file="$TEMP_DIR/$filename"
    
    # 獲取原始檔案大小
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local file_size=$(stat -f%z "$input_file")
    else
        local file_size=$(stat -c%s "$input_file")
    fi
    original_size=$((original_size + file_size))
    
    # 使用 ffmpeg 轉換
    if ffmpeg -i "$input_file" -b:a $BITRATE -map_metadata 0 -id3v2_version 3 \
        "$temp_file" -y > /dev/null 2>&1; then
        
        # 獲取新檔案大小
        if [[ "$OSTYPE" == "darwin"* ]]; then
            local new_file_size=$(stat -f%z "$temp_file")
        else
            local new_file_size=$(stat -c%s "$temp_file")
        fi
        new_size=$((new_size + new_file_size))
        
        # 計算壓縮率
        local reduction=$(( (file_size - new_file_size) * 100 / file_size ))
        
        # 替換原始文件
        mv "$temp_file" "$input_file"
        
        echo "✅ 轉換成功: $filename (減少 ${reduction}%)"
        ((converted_files++))
    else
        echo "❌ 轉換失敗: $filename"
        rm -f "$temp_file"
    fi
}

# 處理所有音樂文件
echo ""
echo "📁 處理音樂文件..."
echo "--------------------------------"

for dir in public/music/*/; do
    if [ -d "$dir" ]; then
        dir_name=$(basename "$dir")
        echo ""
        echo "處理資料夾: $dir_name"
        
        for music in "$dir"*.mp3; do
            if [ -f "$music" ]; then
                ((total_files++))
                convert_music "$music"
            fi
        done
    fi
done

# 清理臨時目錄
rm -rf "$TEMP_DIR"

# 顯示統計資訊
echo ""
echo "================================"
echo "✨ 音樂優化完成！"
echo "================================"
echo "總檔案數: $total_files"
echo "已轉換: $converted_files"
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
fi

echo ""
echo "🎉 所有音樂文件已優化為 ${BITRATE} 比特率"
echo ""

