import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { query, documentId, method = "hybrid", limit = 20 } = await req.json();

    if (!query || !documentId) {
      return NextResponse.json({ error: "Query and documentId required" }, { status: 400 });
    }

    const queryEmbedding = await generateEmbedding(query);
    let results: any[] = [];

    if (method === "vector" || method === "hybrid") {
      const vectorResults = await vectorSearch(documentId, queryEmbedding, limit);
      results = vectorResults;
    }

    if (method === "keyword" || method === "hybrid") {
      const keywordResults = await keywordSearch(documentId, query, limit);
      if (method === "hybrid") {
        results = fuseResults(results, keywordResults);
      } else {
        results = keywordResults;
      }
    }

    // Section-aware boost
    const sectionMatches = query.match(/section\s+(\d+)/gi) || query.match(/(\d+)\./g);
    if (sectionMatches) {
      const sectionResults = await sectionSearch(documentId, sectionMatches);
      results = boostSectionResults(results, sectionResults);
    }

    const uniqueResults = deduplicateResults(results).slice(0, limit);

    return NextResponse.json({ results: uniqueResults, metadata: { method, query } });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENROUTER_API_KEY}` },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}

async function vectorSearch(documentId: string, embedding: number[], limit: number) {
  const { data } = await supabase
    .rpc("match_paragraphs", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
      p_document_id: documentId,
    });
  return data || [];
}

async function keywordSearch(documentId: string, query: string, limit: number) {
  const { data } = await supabase
    .from("paragraphs")
    .select("paragraph_id, content, section_id, order_index, sections!inner(title)")
    .eq("document_id", documentId)
    .textSearch("content", query, { type: "websearch" })
    .limit(limit);

  return (data || []).map((p: any) => ({
    paragraph_id: p.paragraph_id,
    content: p.content,
    section_id: p.section_id,
    section_title: p.sections.title,
    similarity: 0.8,
    order_index: p.order_index,
  }));
}

async function sectionSearch(documentId: string, sectionMatches: string[]) {
  const sectionNumbers = sectionMatches.map((m) => m.replace(/[^\d]/g, "")).filter(Boolean);
  if (!sectionNumbers.length) return [];

  const { data: sections } = await supabase
    .from("sections")
    .select("section_id, title")
    .eq("document_id", documentId);

  const matchingSections = sections?.filter((s: any) =>
    sectionNumbers.some((n) => s.title.startsWith(n + "."))
  );

  if (!matchingSections?.length) return [];

  const { data: paragraphs } = await supabase
    .from("paragraphs")
    .select("*")
    .in("section_id", matchingSections.map((s) => s.section_id));

  return (paragraphs || []).map((p: any) => ({
    paragraph_id: p.paragraph_id,
    content: p.content,
    section_id: p.section_id,
    section_title: matchingSections.find((s: any) => s.section_id === p.section_id)?.title || "",
    similarity: 1.0,
    order_index: p.order_index,
  }));
}

function fuseResults(vectorResults: any[], keywordResults: any[]) {
  const scores = new Map();
  const k = 60;

  vectorResults.forEach((r, rank) => {
    scores.set(r.paragraph_id, { result: r, score: 1 / (rank + k) });
  });

  keywordResults.forEach((r, rank) => {
    const existing = scores.get(r.paragraph_id);
    if (existing) {
      existing.score += 1 / (rank + k);
    } else {
      scores.set(r.paragraph_id, { result: r, score: 1 / (rank + k) });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => ({ ...item.result, similarity: item.score }));
}

function boostSectionResults(mainResults: any[], sectionResults: any[]) {
  const sectionIds = new Set(sectionResults.map((r) => r.section_id));
  return mainResults.map((r) => ({
    ...r,
    similarity: sectionIds.has(r.section_id) ? r.similarity * 1.5 : r.similarity,
  }));
}

function deduplicateResults(results: any[]) {
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.paragraph_id)) return false;
    seen.add(r.paragraph_id);
    return true;
  });
}
