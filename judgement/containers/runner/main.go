package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
    SpendTime   int64  `json:"spend_time"` // ms
}

func main() {
    baseDir := "/opt/judge"
    subDir := filepath.Join(baseDir, "submission")

    // 問題設定と実行設定を読み込む
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
    // 作業ディレクトリを submission に移す
    workDir := subDir

    // ビルド or 実行
    if probConfig.IsBuild {
        ctx, cancel := context.WithTimeout(context.Background(), 30000*time.Millisecond)
        defer cancel()

        cmd := exec.CommandContext(ctx, langConfig.BuildCommand[0], langConfig.BuildCommand[1:]...)
        cmd.Dir = workDir
        out, err := cmd.CombinedOutput()

        status := Status{CompileMode: true, SpendTime: time.Since(start).Milliseconds()}
        if err != nil {
            status.IsSuccess = false
            status.Err = string(out)
            if ctx.Err() == context.DeadlineExceeded {
                status.Err = "Time Limit Exceeded"
                status.IsTimeout = true
            }
        } else {
            status.IsSuccess = true
            status.Output = string(out)
        }

        data, _ := json.Marshal(status)
        fmt.Println(string(data))
        return
    }

    inFile, err := os.Open(filepath.Join(subDir, "input.txt"))
    if err != nil {
        panic(err)
    }
    defer inFile.Close()

    ctx, cancel := context.WithTimeout(context.Background(), time.Duration(probConfig.Timeout)*time.Millisecond)
    defer cancel()

    cmd := exec.CommandContext(ctx, langConfig.RunCommand[0], langConfig.RunCommand[1:]...)
    cmd.Dir = workDir
    cmd.Stdin = inFile
    out, err := cmd.CombinedOutput()

    status := Status{CompileMode: false, SpendTime: time.Since(start).Milliseconds()}
    if err != nil {
        status.IsSuccess = false
        status.Err = string(out)
        if ctx.Err() == context.DeadlineExceeded {
            status.Err = "Time Limit Exceeded"
            status.IsTimeout = true
        }
    } else {
        status.IsSuccess = true
        status.Output = string(out)
    }

    data, _ := json.Marshal(status)
    fmt.Println(string(data))
}
