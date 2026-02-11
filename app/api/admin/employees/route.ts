import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const employeesPath = path.join(process.cwd(), "data", "employees.json");
    const data = await readFile(employeesPath, "utf-8");
    const employees = JSON.parse(data);
    
    return NextResponse.json({
      totalEmployees: employees.totalEmployees || 0,
      employees: employees.employees || [],
      updatedAt: employees.updatedAt
    });
  } catch (error) {
    console.error("Error reading employees:", error);
    // Если файла нет, возвращаем пустой список
    return NextResponse.json({
      totalEmployees: 0,
      employees: [],
      updatedAt: null
    });
  }
}
