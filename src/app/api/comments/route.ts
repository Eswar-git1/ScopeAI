import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List comments for a paragraph
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const paragraphId = searchParams.get("paragraph_id");
        const status = searchParams.get("status");
        const includeReplies = searchParams.get("include_replies") !== "false";

        if (!paragraphId) {
            return NextResponse.json({ error: "paragraph_id is required" }, { status: 400 });
        }

        let query = supabase
            .from("comments")
            .select(`
        id,
        paragraph_id,
        parent_comment_id,
        comment_type,
        content,
        status,
        priority,
        tags,
        mentions,
        attachments,
        created_at,
        updated_at,
        resolved_at,
        resolution_note,
        author:profiles!author_id(
          id,
          full_name,
          email,
          avatar_url,
          role
        ),
        resolved_by_user:profiles!resolved_by(
          id,
          full_name
        )
      `)
            .eq("paragraph_id", paragraphId);

        // Filter by status
        if (status) {
            query = query.eq("status", status);
        }

        // Only get top-level comments if not including replies
        if (!includeReplies) {
            query = query.is("parent_comment_id", null);
        }

        query = query.order("created_at", { ascending: true });

        const { data: comments, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Organize into threads if replies included
        if (includeReplies && comments) {
            const commentMap = new Map();
            const topLevel: any[] = [];

            comments.forEach((comment) => {
                commentMap.set(comment.id, { ...comment, replies: [] });
            });

            comments.forEach((comment) => {
                const enrichedComment = commentMap.get(comment.id);
                if (comment.parent_comment_id) {
                    const parent = commentMap.get(comment.parent_comment_id);
                    if (parent) {
                        parent.replies.push(enrichedComment);
                    }
                } else {
                    topLevel.push(enrichedComment);
                }
            });

            return NextResponse.json({ comments: topLevel });
        }

        return NextResponse.json({ comments: comments || [] });
    } catch (error) {
        console.error("Comments API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Create a new comment
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            paragraph_id,
            parent_comment_id,
            comment_type,
            content,
            priority = "medium",
            tags = [],
            mentions = [],
            attachments = [],
        } = body;

        if (!paragraph_id || !comment_type || !content) {
            return NextResponse.json(
                { error: "paragraph_id, comment_type, and content are required" },
                { status: 400 }
            );
        }

        // Validate comment type
        const validTypes = ["suggestion", "objection", "clarification", "observation", "approval", "question"];
        if (!validTypes.includes(comment_type)) {
            return NextResponse.json(
                { error: `Invalid comment_type. Must be one of: ${validTypes.join(", ")}` },
                { status: 400 }
            );
        }

        const { data: comment, error } = await supabase
            .from("comments")
            .insert({
                paragraph_id,
                parent_comment_id,
                author_id: user.id,
                comment_type,
                content,
                priority,
                tags,
                mentions,
                attachments,
                status: "open",
            })
            .select(`
        *,
        author:profiles!author_id(
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Create notifications for mentioned users
        if (mentions.length > 0) {
            const notifications = mentions.map((mentionedUserId: string) => ({
                user_id: mentionedUserId,
                notification_type: "mention",
                title: "You were mentioned in a comment",
                content: `${comment.author?.full_name || "Someone"} mentioned you in a comment`,
                link: `/paragraphs/${paragraph_id}#comment-${comment.id}`,
            }));

            await supabase.from("notifications").insert(notifications);
        }

        // Create notification for parent comment author (if replying)
        if (parent_comment_id) {
            const { data: parentComment } = await supabase
                .from("comments")
                .select("author_id")
                .eq("id", parent_comment_id)
                .single();

            if (parentComment && parentComment.author_id !== user.id) {
                await supabase.from("notifications").insert({
                    user_id: parentComment.author_id,
                    notification_type: "comment_reply",
                    title: "New reply to your comment",
                    content: `${comment.author?.full_name || "Someone"} replied to your comment`,
                    link: `/paragraphs/${paragraph_id}#comment-${comment.id}`,
                });
            }
        }

        // Log creation
        await supabase.from("change_logs").insert({
            entity_type: "comment",
            entity_id: comment.id,
            action: "created",
            changed_by: user.id,
            after_snapshot: comment,
            change_summary: `New ${comment_type} comment`,
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        console.error("Create comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH: Update a comment or resolve it
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, content, status, priority, resolution_note } = body;

        if (!id) {
            return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
        }

        // Get existing comment
        const { data: existingComment } = await supabase
            .from("comments")
            .select("*, author_id")
            .eq("id", id)
            .single();

        if (!existingComment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Only author can edit content, anyone with reviewer+ can change status
        if (content !== undefined && existingComment.author_id !== user.id) {
            return NextResponse.json({ error: "Only the author can edit comment content" }, { status: 403 });
        }

        const updates: any = { updated_at: new Date().toISOString() };
        if (content !== undefined) updates.content = content;
        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;

        // Handle resolution
        if (status === "resolved") {
            updates.resolved_at = new Date().toISOString();
            updates.resolved_by = user.id;
            if (resolution_note) updates.resolution_note = resolution_note;
        }

        const { data: comment, error } = await supabase
            .from("comments")
            .update(updates)
            .eq("id", id)
            .select(`
        *,
        author:profiles!author_id(
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Notify author if someone else resolved their comment
        if (status === "resolved" && existingComment.author_id !== user.id) {
            await supabase.from("notifications").insert({
                user_id: existingComment.author_id,
                notification_type: "resolution",
                title: "Your comment was resolved",
                content: resolution_note || "Your comment has been marked as resolved",
                link: `/paragraphs/${existingComment.paragraph_id}#comment-${id}`,
            });
        }

        // Log change
        await supabase.from("change_logs").insert({
            entity_type: "comment",
            entity_id: id,
            action: status !== undefined ? "status_changed" : "updated",
            changed_by: user.id,
            before_snapshot: existingComment,
            after_snapshot: comment,
            change_summary: status === "resolved" ? "Comment resolved" : "Comment updated",
        });

        return NextResponse.json({ comment });
    } catch (error) {
        console.error("Update comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a comment
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
            return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
        }

        // Get comment and verify ownership
        const { data: comment } = await supabase
            .from("comments")
            .select("*")
            .eq("id", id)
            .single();

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Only author or admins can delete
        if (comment.author_id !== user.id) {
            // Check if user is admin
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role !== "admin") {
                return NextResponse.json({ error: "Only the author can delete this comment" }, { status: 403 });
            }
        }

        const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log deletion
        await supabase.from("change_logs").insert({
            entity_type: "comment",
            entity_id: id,
            action: "deleted",
            changed_by: user.id,
            before_snapshot: comment,
            change_summary: "Comment deleted",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
