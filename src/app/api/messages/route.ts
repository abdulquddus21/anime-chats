import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

const filePath = path.join(process.cwd(), "src/app/data/messages.json");

export async function GET() {
  const data = await fs.readFile(filePath, "utf-8");
  return NextResponse.json(JSON.parse(data));
}

export async function POST(request: NextRequest) {
  const { type, data } = await request.json();
  const fileData = JSON.parse(await fs.readFile(filePath, "utf-8"));

  if (type === "message") {
    fileData.messages.push(data);
  } else if (type === "user") {
    const existingUser = fileData.users.find((u: any) => u.id === data.id);
    if (existingUser) {
      existingUser.name = data.name;
      existingUser.image = data.image;
    } else {
      fileData.users.push(data);
    }
  }

  await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
  return NextResponse.json({ success: true });
}