import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

interface ChatRequest {
  message: string;
  documentId: string;
  sessionId?: string;
  userId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, documentId, sessionId, userId }: ChatRequest = await req.json();
    
    if (!message || !documentId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get or create session
    const session = sessionId
      ? await getSession(sessionId)
      : await createSession(documentId, userId);

    // Get conversation history  
    const history = await getConversationHistory(session.id, 5);

    // Analyze and expand query
    const analyzedQuery = analyzeQuery(message);

    // Hybrid search
    const searchResults = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: analyzedQuery.expandedQuery,
        documentId,
        method: "hybrid",
        limit: 20,
      }),
    }).then((res) => res.json());

    const results = searchResults.results || [];

    // Get document metadata
    const { data: doc } = await supabase
      .from("documents")
      .select("title")
      .eq("id", documentId)
      .single();

    // Save user message
    await saveMessage(session.id, { role: "user", content: message });

    // Stream response
    const stream = generateStreamingResponse(message, results, history, doc?.title || "Document");

    let fullResponse = "";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            sources: results.slice(0, 5).map((r: any) => ({
              paragraph_id: r.paragraph_id,
              section_title: r.section_title,
              preview: r.content.substring(0, 150),
            })),
            sessionId: session.id,
            done: true,
          })}\n\n`));

          controller.close();

          await saveMessage(session.id, {
            role: "assistant",
            content: fullResponse,
            sources: results.slice(0, 5),
          });
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getSession(sessionId: string) {
  const { data, error } = await supabase.from("chat_sessions").select("*").eq("id", sessionId).single();
  if (error) {
    console.error("Error getting session:", error);
    throw new Error("Session not found");
  }
  return data;
}

async function createSession(documentId: string, userId: string) {
  const { data, error } = await supabase.from("chat_sessions").insert({
    document_id: documentId,
    user_id: userId
  }).select().single();

  if (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }

  if (!data) {
    throw new Error("No session data returned");
  }

  return data;
}

async function getConversationHistory(sessionId: string, limit: number) {
  const { data } = await supabase.from("chat_messages").select("role, content").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(limit * 2);
  return (data || []).reverse();
}

async function saveMessage(sessionId: string, message: any) {
  await supabase.from("chat_messages").insert({ session_id: sessionId, ...message });
}

function analyzeQuery(query: string) {
  const expansions: Record<string, string> = {
    "OIS": "Operational Information System",
    "MIS": "Management Information System",
    "SDK": "Software Development Kit",
    "RBAC": "Role-Based Access Control",
  };

  let expandedQuery = query;
  Object.entries(expansions).forEach(([acronym, full]) => {
    if (new RegExp(`\b${acronym}\b`, "gi").test(query)) {
      expandedQuery += ` ${full}`;
    }
  });

  return { expandedQuery };
}

async function* generateStreamingResponse(query: string, results: any[], history: any[], docTitle: string): AsyncGenerator<string> {
  const context = `Document: ${docTitle}

Recent conversation:
${history.map((m: any) => `${m.role}: ${m.content}`).join("\n")}

Relevant content:
${results.slice(0, 10).map((r: any, i: number) => `[${i + 1}] ${r.section_title}\n${r.content}`).join("\n\n")}`;

  const systemPrompt = `You are an AI assistant for defense software scope documents. Answer based ONLY on provided content. Cite section numbers. Be professional and precise.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${context}\n\nQuestion: ${query}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n").filter(l => l.trim());
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {}
      }
    }
  }
}
