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

# 提出コードのビルド・実行に必要なツール
RUN apt update -y 
RUN apt upgrade -y 
RUN apt install -y software-properties-common 
RUN add-apt-repository -y ppa:deadsnakes/ppa  
RUN apt update -y 
RUN DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Tokyo \
    apt-get install -y tzdata
RUN apt-get install -y --no-install-recommends \
    python3.12 python3.12-dev curl
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.12
RUN python3.12 -m pip install --upgrade setuptools wheel
RUN rm -rf /var/lib/apt/lists/*

RUN python3.12 -m pip install numpy \
    pandas \
    scipy

# ジャッジ用ディレクトリを用意
WORKDIR /opt/judge

# 設定ファイルを埋め込む
COPY python-judge/language_config.json ./language_config.json

# ビルド済みランナーを配置
COPY --from=builder /app/judge-runner /usr/local/bin/judge-runner

# ランタイム用ワークディレクトリをあらかじめ作成
RUN mkdir -p /opt/judge/runtime && chmod 777 /opt/judge/runtime

# submission ディレクトリは実行時にマウント
VOLUME ["/opt/judge/submission"]

# コンテナ起動後は常駐させ、exec 用イメージに
CMD ["tail", "-f", "/dev/null"]
