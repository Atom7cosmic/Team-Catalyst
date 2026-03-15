#!/bin/bash

# Whisper.cpp Setup Script for OrgOS
# This script downloads and compiles whisper.cpp for local transcription

set -e

echo "Setting up Whisper.cpp for OrgOS..."

# Create directories
mkdir -p models/whisper
cd models/whisper

# Clone whisper.cpp if not exists
if [ ! -d "whisper.cpp" ]; then
    echo "Cloning whisper.cpp repository..."
    git clone https://github.com/ggerganov/whisper.cpp.git
fi

cd whisper.cpp

# Checkout latest stable version
git checkout master
git pull origin master

# Compile
echo "Compiling whisper.cpp..."
make clean || true
make

# Download models
echo "Downloading Whisper models..."

# Base model (fast, less accurate)
if [ ! -f "ggml-base.bin" ]; then
    echo "Downloading base model..."
    bash models/download-ggml-model.sh base
fi

# Small model (balanced)
if [ ! -f "ggml-small.bin" ]; then
    echo "Downloading small model..."
    bash models/download-ggml-model.sh small
fi

# Medium model (slower, more accurate)
if [ ! -f "ggml-medium.bin" ]; then
    echo "Downloading medium model..."
    bash models/download-ggml-model.sh medium
fi

# Copy main binary to models directory
cp main ../

# Copy models to models directory
cp ggml-base.bin ../ 2>/dev/null || true
cp ggml-small.bin ../ 2>/dev/null || true
cp ggml-medium.bin ../ 2>/dev/null || true

cd ../../..

echo ""
echo "✅ Whisper.cpp setup complete!"
echo ""
echo "Models available:"
echo "  - models/whisper/ggml-base.bin (fast, 75 MB)"
echo "  - models/whisper/ggml-small.bin (balanced, 244 MB)"
echo "  - models/whisper/ggml-medium.bin (accurate, 766 MB)"
echo ""
echo "Set WHISPER_MODEL_PATH in your .env file:"
echo "  WHISPER_MODEL_PATH=./models/whisper/ggml-base.bin"
echo ""
