/**
 * Migration script: introduces the "wave" system.
 * 
 * - Tags all existing users with wave: 1
 * - Tags all existing submissions with wave: 1
 * - Converts usedTopics from flat { easy, hard } to per-wave { "1": { easy, hard } }
 * - Snapshots employees.json into state.json under waveEmployees["1"]
 * - Sets currentWave = 1
 * 
 * Safe to run multiple times (idempotent).
 */

const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "..", "data", "state.json");
const EMPLOYEES_PATH = path.join(__dirname, "..", "data", "employees.json");

function main() {
  console.log("=== Wave Migration ===\n");

  if (!fs.existsSync(STATE_PATH)) {
    console.error("state.json not found at", STATE_PATH);
    process.exit(1);
  }

  const stateRaw = fs.readFileSync(STATE_PATH, "utf-8");
  const state = JSON.parse(stateRaw);

  // Backup
  const backupPath = STATE_PATH + `.backup-migrate-${Date.now()}`;
  fs.writeFileSync(backupPath, stateRaw);
  console.log("Backup saved to", backupPath);

  let changed = false;

  // 1. Set currentWave
  if (!state.currentWave) {
    state.currentWave = 1;
    changed = true;
    console.log("Set currentWave = 1");
  } else {
    console.log(`currentWave already set to ${state.currentWave}`);
  }

  // 2. Tag users with wave: 1
  const users = state.users || {};
  let usersTagged = 0;
  for (const key of Object.keys(users)) {
    if (!users[key].wave) {
      users[key].wave = 1;
      usersTagged++;
    }
  }
  if (usersTagged > 0) {
    changed = true;
    console.log(`Tagged ${usersTagged} users with wave: 1`);
  } else {
    console.log("All users already have wave field");
  }

  // 3. Tag submissions with wave: 1
  const submissions = state.submissions || {};
  let subsTagged = 0;
  for (const key of Object.keys(submissions)) {
    if (!submissions[key].wave) {
      submissions[key].wave = 1;
      subsTagged++;
    }
  }
  if (subsTagged > 0) {
    changed = true;
    console.log(`Tagged ${subsTagged} submissions with wave: 1`);
  } else {
    console.log("All submissions already have wave field");
  }

  // 4. Convert usedTopics to per-wave format
  if (state.usedTopics) {
    if (state.usedTopics.easy !== undefined || state.usedTopics.hard !== undefined) {
      const legacy = state.usedTopics;
      state.usedTopics = {
        "1": {
          easy: legacy.easy || [],
          hard: legacy.hard || [],
        },
      };
      changed = true;
      console.log("Converted usedTopics to per-wave format");
    } else if (state.usedTopics["1"]) {
      console.log("usedTopics already in per-wave format");
    }
  } else {
    state.usedTopics = { "1": { easy: [], hard: [] } };
    changed = true;
    console.log("Initialized usedTopics");
  }

  // 5. Snapshot employees.json into waveEmployees["1"]
  if (!state.waveEmployees) state.waveEmployees = {};
  
  if (!state.waveEmployees["1"]) {
    if (fs.existsSync(EMPLOYEES_PATH)) {
      const empData = JSON.parse(fs.readFileSync(EMPLOYEES_PATH, "utf-8"));
      state.waveEmployees["1"] = {
        employees: empData.employees || [],
        totalEmployees: empData.totalEmployees || 0,
      };
      changed = true;
      console.log(`Snapshotted ${empData.totalEmployees} employees into waveEmployees["1"]`);
    } else {
      console.warn("employees.json not found, skipping snapshot");
    }
  } else {
    console.log("waveEmployees[\"1\"] already exists");
  }

  if (changed) {
    const tmpPath = STATE_PATH + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmpPath, STATE_PATH);
    console.log("\nState saved successfully!");
  } else {
    console.log("\nNo changes needed.");
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`currentWave: ${state.currentWave}`);
  console.log(`Users: ${Object.keys(users).length}`);
  console.log(`Submissions: ${Object.keys(submissions).length}`);
  console.log(`UsedTopics waves: ${Object.keys(state.usedTopics).join(", ")}`);
  console.log(`WaveEmployees waves: ${Object.keys(state.waveEmployees).join(", ")}`);
}

main();
