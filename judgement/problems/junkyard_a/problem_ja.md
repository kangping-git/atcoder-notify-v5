---
title: Greatest Fib Divisor
contest: junkyard
id: junkyard_a
timeout: 2000
memory: 512
---

## 問題文

フィボナッチ数列の $i$ 番目の項を $Fib_i$ とします。例えば

$$
Fib_0 = 1,\quad Fib_1 = 1,\quad Fib_2 = 2
$$

です。また、$\gcd(x,y)$ を $x$ と $y$ の **最大公約数**（greatest common divisor）とします。自然数 $i,k$ が与えられるので、

$$
\gcd\bigl(Fib_i,\,Fib_{i+k}\bigr)
$$

を求めてください。

## 制約

-   $1  \leq i \leq 10^{12}$
-   $1  \leq k \leq 10^6$
-   $i,k$ は整数

## 入力

標準入力から以下の形式で与えられる。

```
i k
```

## 出力

$\gcd(Fib_i,\,Fib_{i+k})$ を整数で出力せよ。
