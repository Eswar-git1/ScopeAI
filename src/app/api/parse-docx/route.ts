import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from DOCX
    const result = await mammoth.extractRawText({ buffer });

    // Format the text with markdown headers
    const formattedText = formatWithMarkdownHeaders(result.value);

    return NextResponse.json({
      text: formattedText,
      success: true
    });
  } catch (error: any) {
    console.error("DOCX parsing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse DOCX" },
      { status: 500 }
    );
  }
}

function formatWithMarkdownHeaders(text: string): string {
  const lines = text.split("\n");
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines at the beginning
    if (!line && formatted.length === 0) continue;

    // Main title (all caps, longer lines)
    if (line.length > 20 && line === line.toUpperCase() && line.match(/^[A-Z\s—\-–]+$/)) {
      formatted.push(`\n# ${line}\n`);
      continue;
    }

    // Part headers (PART I, PART II, etc.)
    if (line.match(/^PART [IVX]+ [—\-–]/)) {
      formatted.push(`\n## ${line}\n`);
      continue;
    }

    // Numbered main sections (1. Objective, 2. Core Problem, etc.)
    if (line.match(/^\d+\.\s+[A-Z]/)) {
      formatted.push(`\n## ${line}\n`);
      continue;
    }

    // Subsections (2.1, 2.2, etc.)
    if (line.match(/^\d+\.\d+\s+[A-Z]/)) {
      formatted.push(`\n### ${line}\n`);
      continue;
    }

    // Sub-subsections (2.1.1, 2.1.2, etc.)
    if (line.match(/^\d+\.\d+\.\d+\s+[A-Z]/)) {
      formatted.push(`\n#### ${line}\n`);
      continue;
    }

    // Regular content
    if (line) {
      formatted.push(line);
    } else {
      formatted.push(""); // Preserve paragraph breaks
    }
  }

  return formatted.join("\n");
}
