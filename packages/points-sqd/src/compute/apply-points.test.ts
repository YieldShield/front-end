import assert from "node:assert/strict";
import test from "node:test";
import { applyPoints } from "./apply-points.js";
import { ADDR_A, ADDR_B, ADDR_C, makeAction } from "../test/fixtures.js";

test("awards a one-time quest only once per user", () => {
  const result = applyPoints([
    makeAction({ logIndex: 0, questId: "saver_first_shield", repeatableActionId: null }),
    makeAction({ logIndex: 1, questId: "saver_first_shield", repeatableActionId: null }),
  ]);
  const user = result.users.get(ADDR_A);

  assert.ok(user);
  assert.equal(user.questCompletions.length, 1);
  assert.equal(user.questPoints, 500n);
  assert.deepEqual([...user.questIds], ["saver_first_shield"]);
  assert.equal(user.totalPoints, 500n);
});

test("applies repeatable daily caps", () => {
  const actions = Array.from({ length: 6 }, (_, index) =>
    makeAction({
      logIndex: index,
      questId: index === 0 ? "saver_first_shield" : null,
      repeatableActionId: "saver_deposit",
    }),
  );
  const result = applyPoints(actions);
  const user = result.users.get(ADDR_A);

  assert.ok(user);
  assert.equal(user.repeatablePoints, 250n);
  assert.equal(user.questPoints, 500n);
  assert.equal(user.totalPoints, 750n);
  assert.equal(user.dailyActionCounts.get("saver_deposit:2026-04-01"), 6);
});

test("tracks separate repeatable caps per action id and UTC day", () => {
  const dayOneActions = Array.from({ length: 4 }, (_, index) =>
    makeAction({
      id: `0xclaim-day-one:${index}:test`,
      transactionHash: "0xclaim-day-one",
      logIndex: index,
      eventName: "RewardsClaimed",
      action: "claim_rewards",
      occurredAt: `2026-04-01T00:0${index}:00.000Z`,
      questId: null,
      repeatableActionId: "claim_rewards",
    }),
  );
  const dayTwoAction = makeAction({
    id: "0xclaim-day-two:0:test",
    transactionHash: "0xclaim-day-two",
    logIndex: 0,
    blockNumber: 101,
    eventName: "RewardsClaimed",
    action: "claim_rewards",
    occurredAt: "2026-04-02T00:00:00.000Z",
    questId: null,
    repeatableActionId: "claim_rewards",
  });
  const result = applyPoints([...dayOneActions, dayTwoAction]);
  const user = result.users.get(ADDR_A);

  assert.ok(user);
  assert.equal(user.repeatablePoints, 100n);
  assert.equal(user.dailyActionCounts.get("claim_rewards:2026-04-01"), 4);
  assert.equal(user.dailyActionCounts.get("claim_rewards:2026-04-02"), 1);
});

test("computes current and longest streaks from UTC activity dates", () => {
  const result = applyPoints([
    makeAction({ logIndex: 0, occurredAt: "2026-04-01T23:59:59.000Z", repeatableActionId: null }),
    makeAction({ logIndex: 1, occurredAt: "2026-04-02T00:00:00.000Z", questId: null }),
    makeAction({ logIndex: 2, occurredAt: "2026-04-04T00:00:00.000Z", questId: null }),
  ]);
  const user = result.users.get(ADDR_A);

  assert.ok(user);
  assert.equal(user.longestStreak, 2);
  assert.equal(user.currentStreak, 1);
  assert.equal(user.lastActiveDate, "2026-04-04");
});

test("sorts actions by block number, log index, then transaction hash before applying quests", () => {
  const result = applyPoints([
    makeAction({
      blockNumber: 102,
      logIndex: 0,
      transactionHash: "0xtx3",
      occurredAt: "2026-04-03T00:00:00.000Z",
      questId: "saver_first_reward_claim",
      repeatableActionId: null,
    }),
    makeAction({
      blockNumber: 100,
      logIndex: 2,
      transactionHash: "0xtx2",
      occurredAt: "2026-04-02T00:00:00.000Z",
      questId: "saver_first_full_withdrawal",
      repeatableActionId: null,
    }),
    makeAction({
      blockNumber: 100,
      logIndex: 1,
      transactionHash: "0xtx1",
      occurredAt: "2026-04-01T00:00:00.000Z",
      questId: "saver_first_partial_withdrawal",
      repeatableActionId: null,
    }),
  ]);
  const user = result.users.get(ADDR_A);

  assert.ok(user);
  assert.deepEqual(
    user.questCompletions.map(completion => completion.questId),
    ["saver_first_partial_withdrawal", "saver_first_full_withdrawal", "saver_first_reward_claim"],
  );
});

test("orders leaderboard by points, then last update, then address", () => {
  const result = applyPoints([
    makeAction({
      userAddress: ADDR_A,
      transactionHash: "0xa",
      questId: "saver_first_shield",
      repeatableActionId: null,
      occurredAt: "2026-04-01T00:00:00.000Z",
    }),
    makeAction({
      userAddress: ADDR_B,
      transactionHash: "0xb",
      questId: "protector_first_protection",
      repeatableActionId: null,
      occurredAt: "2026-04-02T00:00:00.000Z",
    }),
    makeAction({
      userAddress: ADDR_C,
      transactionHash: "0xc",
      questId: null,
      repeatableActionId: "saver_deposit",
      occurredAt: "2026-04-03T00:00:00.000Z",
    }),
  ]);

  assert.deepEqual(
    result.leaderboard.map(user => user.userAddress),
    [ADDR_B, ADDR_A, ADDR_C],
  );

  const addressTie = applyPoints([
    makeAction({ userAddress: ADDR_B, transactionHash: "0xb", questId: "saver_first_shield", repeatableActionId: null }),
    makeAction({ userAddress: ADDR_A, transactionHash: "0xa", questId: "saver_first_shield", repeatableActionId: null }),
  ]);

  assert.deepEqual(
    addressTie.leaderboard.map(user => user.userAddress),
    [ADDR_A, ADDR_B],
  );
});

test("ignores actions without a user address or without point-bearing ids", () => {
  const result = applyPoints([
    makeAction({ userAddress: undefined }),
    makeAction({ questId: null, repeatableActionId: null }),
  ]);

  assert.equal(result.users.size, 0);
  assert.equal(result.leaderboard.length, 0);
  assert.equal(result.totalDistributedPoints, 0n);
});
