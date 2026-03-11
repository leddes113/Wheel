import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { readState, getCurrentWave } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const waveParam = searchParams.get("wave");

    const state = await readState();
    const currentWave = getCurrentWave(state);

    if (waveParam) {
      const wave = parseInt(waveParam, 10);
      // For non-current waves, return snapshot from state.json
      if (wave !== currentWave && state.waveEmployees?.[String(wave)]) {
        const snapshot = state.waveEmployees[String(wave)];
        return NextResponse.json({
          totalEmployees: snapshot.totalEmployees,
          employees: snapshot.employees,
          wave,
        });
      }
    }

    // Current wave or no wave specified: read from employees.json
    const employeesPath = path.join(process.cwd(), "data", "employees.json");
    const data = await readFile(employeesPath, "utf-8");
    const employees = JSON.parse(data);
    
    return NextResponse.json({
      totalEmployees: employees.totalEmployees || 0,
      employees: employees.employees || [],
      updatedAt: employees.updatedAt,
      wave: currentWave,
      currentWave,
    });
  } catch (error) {
    console.error("Error reading employees:", error);
    return NextResponse.json({
      totalEmployees: 0,
      employees: [],
      updatedAt: null
    });
  }
}
