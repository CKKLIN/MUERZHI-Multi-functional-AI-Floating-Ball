// electron/main/permission-match.ts
// 权限审批「外部完成自动关闭」的纯匹配逻辑（不 import Electron / electron-log，可在纯 Node 单测——
// 与 hw-encoder / conversion-registry 同一测试范式，见 test-permission-match.mjs）。
//
// 协作对象是 agent-server.ts：当收到 PostToolUse / PostToolUseFailure / PermissionDenied 完成事件时，
// 在会话内的待审权限卡里找出「用户已在 Claude Code 原生界面处理」的那张（返回其队列下标），
// 由 agent-server 负责 reject(回 cancel)、移出队列、广播 UI。
//
// 为什么匹配而非简单整清：同一会话可按 FIFO 排队多张权限卡，按 session 整清会误关用户还没处理的另一张。
// 真实 PermissionRequest 是 HTTP hook，body 不带 tool_use_id（见 claude-code-permissionrequest-spec），
// 所以 tool_use_id 通常为 null，需退而用「同 session + 同工具名 + 同入参内容签名」判定为同一工具调用。

/** 待审卡片的最小结构视角：PermissionCard 与 QuestionCard 都能满足（多出的字段不影响） */
export interface PendingCardLike {
  kind: string
  sessionId: string
  toolName?: string
  toolInput?: any
  toolUseId?: string | null
}

/** 完成事件的最小结构视角：兼容 /state body 的 snake_case 与 camelCase */
export interface CompletionEventLike {
  tool_use_id?: string | null
  toolUseId?: string | null
  tool_name?: string | null
  toolName?: string | null
  tool_input?: any
  toolInput?: any
}

/** 递归稳定序列化入参：对象键按字典序排序，使同一入参的不同键序也能匹配；数组保序。 */
export function permissionContentSignature(v: any): string {
  if (v === null || v === undefined) return "null"
  if (typeof v !== "object") return JSON.stringify(v)
  if (Array.isArray(v)) return "[" + v.map(permissionContentSignature).join(",") + "]"
  const keys = Object.keys(v).sort()
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + permissionContentSignature(v[k])).join(",") + "}"
}

/** 在待审卡里找应被「外部完成」关闭的那张，返回队列下标；无匹配返回 -1。
 *  匹配优先级：
 *    1) tool_use_id 精确（仅当卡片与完成事件都带 ID 时，如合成注入/未来桥接）；
 *    2) 内容签名——同 session + 同工具名 + 同入参签名判定为同一工具调用
 *       （toolName 与内容签名分开判等，不做字符串拼接，避免分隔符歧义/转义问题）；
 *    3) 惰性对账兜底——签名对不上时，若该 session 恰好只有一张同名权限卡，按名收起
 *       （完成事件本身已证明该 tool 的 gate settle，见函数体注释）。
 *  cards 按队列入列顺序，取最先匹配者：工具串行执行，先到的完成事件对应先入队的卡，
 *  避免同一会话重复相同调用时误关后面的卡。 */
export function findPermissionToResolve(cards: PendingCardLike[], sessionId: string, evt: CompletionEventLike): number {
  const toolUseId = evt?.tool_use_id || evt?.toolUseId || null
  const name = evt?.tool_name || evt?.toolName || null
  const inputSig = (name != null && name !== "")
    ? permissionContentSignature(evt?.tool_input ?? evt?.toolInput ?? null)
    : null
  // 惰性对账：内容签名对不上（tool_input 在请求与执行间漂移/字段丢失）时，
  // 记录「同 session + 同 tool_name」的候选，最后判断是否可安全按名收起。
  let nameOnlyIdx = -1
  let nameOnlyCount = 0
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.kind !== "permission") continue
    if (c.sessionId !== sessionId) continue
    if (toolUseId && c.toolUseId && c.toolUseId === toolUseId) return i
    if (name != null && c.toolName === name) {
      if (inputSig != null && permissionContentSignature(c.toolInput ?? null) === inputSig) return i
      if (nameOnlyIdx === -1) nameOnlyIdx = i
      nameOnlyCount++
    }
  }
  // 唯一同名卡 → 视为外部已完成审批的那张（Claude 工具串行执行，完成事件到达说明
  // 该 tool 的 gate 已 settle；此时收起唯一的同名卡是安全的，不存在"用户还在犹豫却被关卡"）。
  // 多于一张同名卡则无法去重，宁可不关（交给 120s 队首次超时兜底）。
  if (nameOnlyCount === 1) return nameOnlyIdx
  return -1
}
