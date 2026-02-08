import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List paragraphs for a section or search across document
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sectionId = searchParams.get("section_id");
        const documentVersionId = searchParams.get("version_id");
        const search = searchParams.get("search");
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        let query = supabase
            .from("paragraphs")
            .select(`
        id,
        paragraph_id,
        content,
        order_index,
        status,
        metadata,
        created_at,
        updated_at,
        section:sections!inner (
          id,
          section_id,
          title,
          level,
          document_version_id
        )
      `, { count: "exact" });

        // Filter by section
        if (sectionId) {
            query = query.eq("section_id", sectionId);
        }

        // Filter by document version
        if (documentVersionId) {
            query = query.eq("section.document_version_id", documentVersionId);
        }

        // Filter by status
        if (status) {
            query = query.eq("status", status);
        }

        // Full-text search
        if (search) {
            query = query.textSearch("content", search, {
                type: "websearch",
                config: "english",
            });
        }

        // Pagination and ordering
        query = query
            .order("order_index", { ascending: true })
            .range(offset, offset + limit - 1);

        const { data: paragraphs, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get comment counts for each paragraph
        const paragraphIds = paragraphs?.map((p) => p.id) || [];
        const { data: commentCounts } = await supabase
            .from("comments")
            .select("paragraph_id")
            .in("paragraph_id", paragraphIds);

        const countMap = new Map<string, number>();
        commentCounts?.forEach((c) => {
            countMap.set(c.paragraph_id, (countMap.get(c.paragraph_id) || 0) + 1);
        });

        const enrichedParagraphs = paragraphs?.map((p) => ({
            ...p,
            comments_count: countMap.get(p.id) || 0,
        }));

        return NextResponse.json({
            paragraphs: enrichedParagraphs || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (error) {
        console.error("Paragraphs API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Create a new paragraph
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { section_id, paragraph_id, content, order_index, status = "draft", metadata = {} } = body;

        if (!section_id || !paragraph_id || !content) {
            return NextResponse.json(
                { error: "section_id, paragraph_id, and content are required" },
                { status: 400 }
            );
        }

        // Verify section exists and user has permission
        const { data: section } = await supabase
            .from("sections")
            .select(`
        id,
        document_version:document_versions!inner(
          id,
          document:documents!inner(id)
        )
      `)
            .eq("id", section_id)
            .single();

        if (!section) {
            return NextResponse.json({ error: "Section not found" }, { status: 404 });
        }

        const { data: paragraph, error } = await supabase
            .from("paragraphs")
            .insert({
                section_id,
                paragraph_id,
                content,
                order_index: order_index || 0,
                status,
                metadata,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "Paragraph ID already exists in this section" },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log creation
        await supabase.from("change_logs").insert({
            entity_type: "paragraph",
            entity_id: paragraph.id,
            action: "created",
            changed_by: user.id,
            after_snapshot: paragraph,
            change_summary: `Created paragraph ${paragraph_id}`,
        });

        return NextResponse.json({ paragraph }, { status: 201 });
    } catch (error) {
        console.error("Create paragraph error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH: Update a paragraph
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, content, status, metadata } = body;

        if (!id) {
            return NextResponse.json({ error: "Paragraph ID is required" }, { status: 400 });
        }

        // Get existing paragraph for before snapshot
        const { data: existingParagraph } = await supabase
            .from("paragraphs")
            .select("*")
            .eq("id", id)
            .single();

        if (!existingParagraph) {
            return NextResponse.json({ error: "Paragraph not found" }, { status: 404 });
        }

        const updates: any = { updated_at: new Date().toISOString() };
        if (content !== undefined) updates.content = content;
        if (status !== undefined) updates.status = status;
        if (metadata !== undefined) updates.metadata = metadata;

        const { data: paragraph, error } = await supabase
            .from("paragraphs")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Determine action type
        const action = status !== undefined && status !== existingParagraph.status
            ? "status_changed"
            : "updated";

        // Log change
        await supabase.from("change_logs").insert({
            entity_type: "paragraph",
            entity_id: id,
            action,
            changed_by: user.id,
            before_snapshot: existingParagraph,
            after_snapshot: paragraph,
            change_summary: action === "status_changed"
                ? `Status changed from ${existingParagraph.status} to ${status}`
                : `Updated paragraph ${paragraph.paragraph_id}`,
        });

        return NextResponse.json({ paragraph });
    } catch (error) {
        console.error("Update paragraph error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a paragraph
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Paragraph ID is required" }, { status: 400 });
        }

        // Get paragraph for logging
        const { data: paragraph } = await supabase
            .from("paragraphs")
            .select("*")
            .eq("id", id)
            .single();

        if (!paragraph) {
            return NextResponse.json({ error: "Paragraph not found" }, { status: 404 });
        }

        const { error } = await supabase
            .from("paragraphs")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log deletion
        await supabase.from("change_logs").insert({
            entity_type: "paragraph",
            entity_id: id,
            action: "deleted",
            changed_by: user.id,
            before_snapshot: paragraph,
            change_summary: `Deleted paragraph ${paragraph.paragraph_id}`,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete paragraph error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
