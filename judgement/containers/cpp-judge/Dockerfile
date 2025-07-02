# Stage 1: Go ランナーをビルド
FROM golang:1.24 AS builder
WORKDIR /app

# Go Modules をキャッシュ
COPY runner/go.mod ./
RUN go mod download

# ランナー本体をビルド
COPY runner/*.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o judge-runner main.go

# Stage 2: 最終イメージ
FROM ubuntu:22.04

# 提出コードのビルド・実行に必要なツール群
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      g++ \
      diffutils \
 && rm -rf /var/lib/apt/lists/*

# ジャッジ用ディレクトリを用意
WORKDIR /opt/judge

# 設定ファイルを埋め込む
COPY cpp-judge/language_config.json ./language_config.json

# ビルド済みランナーを配置
COPY --from=builder /app/judge-runner /usr/local/bin/judge-runner

# ランタイム用ワークディレクトリをあらかじめ作成
RUN mkdir -p /opt/judge/runtime && chmod 777 /opt/judge/runtime

# submission ディレクトリは実行時にマウント
VOLUME ["/opt/judge/submission"]

# コンテナ起動後は常駐させ、exec 用イメージに
CMD ["tail", "-f", "/dev/null"]
