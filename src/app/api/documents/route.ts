import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List documents or get a specific document
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get("id");

        if (documentId) {
            // Get specific document with its versions
            const { data: document, error } = await supabase
                .from("documents")
                .select(`
          *,
          created_by_user:profiles!created_by(id, full_name, email, avatar_url),
          current_version:document_versions!current_version_id(
            id,
            version_number,
            change_summary,
            is_major_version,
            created_at
          ),
          versions:document_versions(
            id,
            version_number,
            change_summary,
            is_major_version,
            created_at
          )
        `)
                .eq("id", documentId)
                .is("deleted_at", null)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    return NextResponse.json({ error: "Document not found" }, { status: 404 });
                }
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ document });
        } else {
            // List all accessible documents
            const { data: documents, error } = await supabase
                .from("documents")
                .select(`
          id,
          title,
          description,
          status,
          created_at,
          updated_at,
          created_by_user:profiles!created_by(id, full_name, email, avatar_url),
          current_version:document_versions!current_version_id(
            id,
            version_number,
            is_major_version
          )
        `)
                .is("deleted_at", null)
                .order("updated_at", { ascending: false });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ documents: documents || [] });
        }
    } catch (error) {
        console.error("Documents API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Create a new document
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Create the document
        const { data: document, error } = await supabase
            .from("documents")
            .insert({
                title,
                description,
                status: "draft",
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Create initial version
        const { data: version, error: versionError } = await supabase
            .from("document_versions")
            .insert({
                document_id: document.id,
                version_number: "1.0.0",
                content_hash: "initial",
                change_summary: "Initial version",
                is_major_version: true,
                created_by: user.id,
            })
            .select()
            .single();

        if (versionError) {
            console.error("Version creation error:", versionError);
        } else {
            // Update document with current version
            await supabase
                .from("documents")
                .update({ current_version_id: version.id })
                .eq("id", document.id);
        }

        // Grant owner permission
        await supabase
            .from("document_permissions")
            .insert({
                document_id: document.id,
                user_id: user.id,
                role: "owner",
                granted_by: user.id,
            });

        return NextResponse.json({ document, version }, { status: 201 });
    } catch (error) {
        console.error("Create document error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH: Update a document
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, title, description, status } = body;

        if (!id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        // Check permission (editor or owner)
        const { data: permission } = await supabase
            .from("document_permissions")
            .select("role")
            .eq("document_id", id)
            .eq("user_id", user.id)
            .single();

        if (!permission || !["editor", "owner"].includes(permission.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const updates: any = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;

        const { data: document, error } = await supabase
            .from("documents")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log change
        await supabase.from("change_logs").insert({
            entity_type: "document",
            entity_id: id,
            action: "updated",
            changed_by: user.id,
            after_snapshot: document,
            change_summary: `Updated document: ${title || ""}`,
        });

        return NextResponse.json({ document });
    } catch (error) {
        console.error("Update document error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE: Soft delete a document
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
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        // Check permission (owner only)
        const { data: permission } = await supabase
            .from("document_permissions")
            .select("role")
            .eq("document_id", id)
            .eq("user_id", user.id)
            .single();

        if (!permission || permission.role !== "owner") {
            return NextResponse.json({ error: "Only owners can delete documents" }, { status: 403 });
        }

        // Soft delete
        const { error } = await supabase
            .from("documents")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log deletion
        await supabase.from("change_logs").insert({
            entity_type: "document",
            entity_id: id,
            action: "deleted",
            changed_by: user.id,
            change_summary: "Document deleted",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete document error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
