# API 仕様

## GET /api/v1/users/

**Parameters**

| Name         | Type     | Req. | Description                                                             |
| ------------ | -------- | ---- | ----------------------------------------------------------------------- |
| q            | string   |      | 検索するユーザー名に含まれる部分文字列を指定します                      |
| country      | string   |      | 検索するユーザーが指定している国を指定します (コンテスト参加した人のみ) |
| minAlgo      | number   |      | 検索するユーザーのアルゴリズムレーティングの最小値を指定します          |
| maxAlgo      | number   |      | 検索するユーザーのアルゴリズムレーティングの最大値を指定します          |
| minHeuristic | number   |      | 検索するユーザーのヒューリスティックレーティングの最小値を指定します    |
| maxHeuristic | number   |      | 検索するユーザーのヒューリスティックレーティングの最大値を指定します    |
| sort         | sortEnum |      | 結果を返す順序を指定します                                              |
| limit        | number   |      | 検索結果を返す上限を指定します (1~200, デフォルト 50)                   |
| cursor       | string   |      | 前回の検索結果の次を検索するときに使用します                            |

**Return**

| Key        | Value     | Description         |
| ---------- | --------- | ------------------- |
| users      | UserObj[] | 検索結果            |
| nextCursor | string    | 次の検索用の cursor |

## 型

### sortEnum

Enum 型

| value            | kind    | description                                       |
| ---------------- | ------- | ------------------------------------------------- |
| name             | default | ユーザー名を昇順で取得                            |
| -name            |         | ユーザー名を降順で取得                            |
| algoRating       |         | アルゴリズムのレーティングを降順 (高 -> 低)       |
| -algoRating      |         | アルゴリズムのレーティングを昇順 (低 -> 高)       |
| heuristicRating  |         | ヒューリスティックのレーティングを降順 (高 -> 低) |
| -heuristicRating |         | ヒューリスティックのレーティングを昇順 (低 -> 高) |

### UserObj

Object 型

| key             | value  | description                              |
| --------------- | ------ | ---------------------------------------- |
| name            | string | ユーザー名                               |
| country         | string | 登録している国 (国 ID or Unknown)        |
| algoRating      | int    | ユーザーのアルゴリズムレーティング       |
| heuristicRating | int    | ユーザーのヒューリスティックレーティング |

### UserDetailObj

Object 型

| key             | value        | description                                   |
| --------------- | ------------ | --------------------------------------------- |
| name            | string       | ユーザー名                                    |
| country         | string       | 登録している国 (国 ID or Unknown)             |
| algoRating      | int          | ユーザーのアルゴリズムレーティング            |
| heuristic       | int          | ユーザーのヒューリスティックレーティング      |
| algoAPerf       | float        | ユーザーの APerf (AtCoder Rating System 参照) |
| heuristicAPerf  | float        | ユーザーの APerf (AtCoder Rating System 参照) |
| lastContestTime | string(Date) | 最後にコンテストに参加した日時                |
