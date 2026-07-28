// test-state-machine.mjs
// ES module version for testing with node --experimental-vm-modules or via tsx
import { createAgentStateMachine } from "./electron/main/agent-state-machine.ts";

function test() {
  let passed = 0;
  let failed = 0;
  function assert(condition, msg) {
    if (condition) { passed++; } else { console.error("FAIL:", msg); failed++; }
  }

  // Test basic states
  const sm = createAgentStateMachine();
  sm.updateSession("s1", "thinking", "UserPromptSubmit");
  assert(sm.getCurrentState() === "thinking", "Should be thinking after UserPromptSubmit");
  assert(sm.getSessions().length === 1, "Should have 1 session");

  sm.updateSession("s1", "working", "PreToolUse", { toolName: "Write" });
  assert(sm.getCurrentState() === "working", "Should be working after PreToolUse");
  assert(sm.getSessions()[0].toolName === "Write", "ToolName should persist");

  // Test priority: error > notification > working > thinking > idle
  sm.updateSession("s2", "error", "ApiError");
  assert(sm.getCurrentState() === "error", "Error should dominate");

  sm.updateSession("s3", "notification", "PermissionRequest");
  assert(sm.getCurrentState() === "error", "Error still dominates");

  // Test dismiss
  sm.dismissSession("s2");
  assert(sm.getCurrentState() === "notification", "After dismiss error, notification dominates");

  // Test done timer — need all sessions idle for "done" to show
  sm.dismissSession("s3"); // Remove notification session first
  sm.updateSession("s1", "idle", "Stop");
  assert(sm.getCurrentState() === "done", "Should show done after Stop");

  // Wait a bit and check it goes back to idle
  setTimeout(() => {
    // After done timer fires, should be idle
    assert(sm.getCurrentState() === "idle", "After done timer, idle");

    // Test stale cleanup
    const sm2 = createAgentStateMachine();
    const oldDate = Date.now() - 11 * 60 * 1000;
    sm2.updateSession("stale1", "idle", "SessionStart");
    sm2.getSessions()[0].updatedAt = oldDate;
    sm2.cleanStaleSessions();
    assert(sm2.getSessions().length === 0, "Stale session should be cleaned");

    // Test working timeout
    const sm3 = createAgentStateMachine();
    const oldWorking = Date.now() - 6 * 60 * 1000;
    sm3.updateSession("stuck1", "working", "PreToolUse");
    sm3.getSessions()[0].updatedAt = oldWorking;
    sm3.cleanStaleSessions();
    assert(sm3.getSessions()[0].state === "idle", "Stuck working should be downgraded to idle");

    // Test subscribe
    const sm4 = createAgentStateMachine();
    let notifiedState = "";
    sm4.subscribe((state) => { notifiedState = state; });
    sm4.updateSession("sub1", "thinking", "UserPromptSubmit");
    assert(notifiedState === "thinking", "Listener should be notified");

    // Final subscriber cleanup
    const sm5 = createAgentStateMachine();
    let callCount = 0;
    const unsub = sm5.subscribe(() => { callCount++; });
    unsub();
    sm5.updateSession("unsub1", "thinking", "UserPromptSubmit");
    assert(callCount === 0, "Unsubscribed listener should not be called");

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }, 2500);
}

test();
