import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

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

    // Generate response WITHOUT streaming
    const fullResponse = await generateResponse(message, results, history, doc?.title || "Document");

    // Save assistant message
    await saveMessage(session.id, {
      role: "assistant",
      content: fullResponse,
      sources: results.slice(0, 5),
    });

    // Return complete response
    return NextResponse.json({
      content: fullResponse,
      sources: results.slice(0, 5).map((r: any) => ({
        paragraph_id: r.paragraph_id,
        section_title: r.section_title,
        preview: r.content.substring(0, 150),
      })),
      sessionId: session.id,
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
  console.log('Creating session with:', { documentId, userId });

  const { data: rpcData, error: rpcError } = await supabase.rpc('create_chat_session', {
    p_document_id: documentId,
    p_user_id: userId
  });

  if (!rpcError && rpcData && rpcData.length > 0) {
    const session = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    console.log('Session created via RPC:', session.id);
    return session;
  }

  console.log('Using direct insert fallback...');
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      document_id: documentId,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session via direct insert:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Failed to create session: ${error.message}`);
  }

  if (!data) {
    throw new Error("No session data returned");
  }

  console.log('Session created via direct insert:', data.id);
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
    if (new RegExp(`\\b${acronym}\\b`, "gi").test(query)) {
      expandedQuery += ` ${full}`;
    }
  });

  return { expandedQuery };
}

// NON-STREAMING version
async function generateResponse(query: string, results: any[], history: any[], docTitle: string): Promise<string> {
  const context = `Document: ${docTitle}

Recent conversation:
${history.map((m: any) => `${m.role}: ${m.content}`).join("\n")}

Relevant content:
${results.slice(0, 10).map((r: any, i: number) => `[${i + 1}] ${r.section_title}\n${r.content}`).join("\n\n")}`;

  const systemPrompt = `You are an AI assistant for defense software scope documents. Answer based ONLY on provided content. Cite section numbers. Be professional and precise.`;

  console.log('Calling OpenRouter...');

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.2-3b-instruct:free", // FREE model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${context}\n\nQuestion: ${query}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false, // NO STREAMING
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error:', errorText);
    throw new Error(`OpenRouter API failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenRouter response received');

  return data.choices[0]?.message?.content || "No response generated.";
}
