package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

type ProblemConfig struct {
    Timeout     int  `json:"timeout"`      // ミリ秒
    MemoryLimit int  `json:"memory_limit"` // MB
    IsBuild     bool `json:"is_build"`
}

type LanguageConfig struct {
    RunCommand    []string `json:"run_command"`
    Filename      string   `json:"filename"`
    IsInterpreter bool     `json:"is_interpreter"`
    BuildCommand  []string `json:"build_command"`
}

type Status struct {
    CompileMode bool   `json:"compile_mode"`
    IsSuccess   bool   `json:"is_success"`
    Output      string `json:"output"`
    Err         string `json:"err"`
    IsTimeout   bool   `json:"is_timeout"`
    SpendTime   int64  `json:"spend_time"`
}

type countWriter struct {
    W        io.Writer
    total    int64
    max      int64
    exceeded *bool
}

func (cw *countWriter) Write(p []byte) (int, error) {
    n, err := cw.W.Write(p)
    cw.total += int64(n)
    if cw.total > cw.max {
        *cw.exceeded = true
    }
    return n, err
}

func main() {
    const maxOutput = 16 * 1024 * 1024 // 16MiB

    // --- ディレクトリ準備 ---
    baseDir := "/opt/judge"
    subDir := filepath.Join(baseDir, "submission")
    runtimeDir := filepath.Join(baseDir, "runtime")

    os.RemoveAll(runtimeDir)
    if err := os.MkdirAll(runtimeDir, 0755); err != nil {
        panic(err)
    }

    // --- 設定ファイル読み込み ---
    probBytes, err := os.ReadFile(filepath.Join(subDir, "problem_config.json"))
    if err != nil {
        panic(err)
    }
    var probConfig ProblemConfig
    if err := json.Unmarshal(probBytes, &probConfig); err != nil {
        panic(err)
    }

    langBytes, err := os.ReadFile(filepath.Join(baseDir, "language_config.json"))
    if err != nil {
        panic(err)
    }
    var langConfig LanguageConfig
    if err := json.Unmarshal(langBytes, &langConfig); err != nil {
        panic(err)
    }

    start := time.Now()

    // --- ビルドフェーズ ---
    if probConfig.IsBuild {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        cmd := exec.CommandContext(ctx, langConfig.BuildCommand[0], langConfig.BuildCommand[1:]...)
        cmd.Dir = runtimeDir
        output, err := cmd.CombinedOutput()

        status := Status{
            CompileMode: true,
            SpendTime:   time.Since(start).Milliseconds(),
        }
        if err != nil {
            status.IsSuccess = false
            status.Err = string(output)
            if ctx.Err() == context.DeadlineExceeded {
                status.Err = "Time Limit Exceeded"
                status.IsTimeout = true
            }
        } else {
            status.IsSuccess = true
            status.Output = string(output)
        }

        data, _ := json.Marshal(status)
        fmt.Println(string(data))
        return
    }

    // --- 実行フェーズ前準備 ---
    // input.txt を runtimeDir にコピー
    inSrc := filepath.Join(subDir, "input.txt")
    inDst := filepath.Join(runtimeDir, "input.txt")
    inputData, err := os.ReadFile(inSrc)
    if err != nil {
        panic(err)
    }
    if err := os.WriteFile(inDst, inputData, 0644); err != nil {
        panic(err)
    }

    inFile, err := os.Open(inDst)
    if err != nil {
        panic(err)
    }
    // defer inFile.Close() は後で明示的に閉じる

    ctx, cancel := context.WithTimeout(context.Background(), time.Duration(probConfig.Timeout)*time.Millisecond)
    defer cancel()

    cmd := exec.CommandContext(ctx, langConfig.RunCommand[0], langConfig.RunCommand[1:]...)
    cmd.Dir = runtimeDir
    cmd.Stdin = inFile

    outPipe, err := cmd.StdoutPipe()
    if err != nil {
        panic(err)
    }
    errPipe, err := cmd.StderrPipe()
    if err != nil {
        panic(err)
    }

    outFile, err := os.Create(filepath.Join(subDir, "out.txt"))
    if err != nil {
        panic(err)
    }
    defer outFile.Close()

    errFile, err := os.Create(filepath.Join(subDir, "err.txt"))
    if err != nil {
        panic(err)
    }
    defer errFile.Close()

    // カウントライター
    var outExceeded, errExceeded bool
    cwOut := &countWriter{W: outFile, max: maxOutput, exceeded: &outExceeded}
    cwErr := &countWriter{W: errFile, max: maxOutput, exceeded: &errExceeded}

    // --- プロセス起動＆EOF通知 ---
    if err := cmd.Start(); err != nil {
        panic(err)
    }
    // stdin を閉じて EOF を子プロセスに伝える
    if err := inFile.Close(); err != nil {
        panic(err)
    }

    // --- 並行でパイプ読み取り ---
    var wg sync.WaitGroup
    wg.Add(2)
    go func() {
        defer wg.Done()
        io.Copy(cwOut, outPipe)
    }()
    go func() {
        defer wg.Done()
        io.Copy(cwErr, errPipe)
    }()
    wg.Wait()

    if err := cmd.Wait(); err != nil {
    }

    status := Status{
        CompileMode: false,
        SpendTime:   time.Since(start).Milliseconds(),
    }
    switch {
    case ctx.Err() == context.DeadlineExceeded:
        status.IsSuccess = false
        status.Err = "Time Limit Exceeded"
        status.IsTimeout = true
    case outExceeded || errExceeded:
        status.IsSuccess = false
        status.Err = "Output Limit Exceeded"
    case cmd.ProcessState != nil && !cmd.ProcessState.Success():
        status.IsSuccess = false
    default:
        status.IsSuccess = true
    }

    data, _ := json.Marshal(status)
    fmt.Println(string(data))
}
