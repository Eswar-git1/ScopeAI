-- ============================================================
-- DISCUSSION ROOMS FEATURE
-- ============================================================
-- This migration adds real-time discussion/chat rooms per document
-- Run this in Supabase SQL Editor
-- ============================================================

-- Discussion Rooms (one per document)
CREATE TABLE IF NOT EXISTS public.discussion_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false
);

CREATE INDEX idx_discussion_rooms_document ON public.discussion_rooms(document_id);
CREATE INDEX idx_discussion_rooms_created_by ON public.discussion_rooms(created_by);

-- Room Members
CREATE TABLE IF NOT EXISTS public.discussion_room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.discussion_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_room_members_room ON public.discussion_room_members(room_id);
CREATE INDEX idx_room_members_user ON public.discussion_room_members(user_id);

-- Room Messages
CREATE TABLE IF NOT EXISTS public.discussion_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.discussion_rooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  parent_message_id UUID REFERENCES public.discussion_messages(id),
  paragraph_reference_id UUID REFERENCES public.paragraphs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_discussion_messages_room ON public.discussion_messages(room_id, created_at DESC);
CREATE INDEX idx_discussion_messages_author ON public.discussion_messages(author_id);
CREATE INDEX idx_discussion_messages_parent ON public.discussion_messages(parent_message_id);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.discussion_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES FOR DISCUSSION ROOMS
-- ============================================================

-- Users can see rooms they're members of
CREATE POLICY "Users see rooms they're members of" ON public.discussion_rooms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discussion_room_members
    WHERE room_id = discussion_rooms.id AND user_id = auth.uid()
  ) OR created_by = auth.uid()
);

-- Admins and owners can create rooms
CREATE POLICY "Admins can create rooms" ON public.discussion_rooms
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  OR created_by = auth.uid()
);

-- Room creators and admins can update rooms
CREATE POLICY "Room creators can update rooms" ON public.discussion_rooms
FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Room creators and admins can delete rooms
CREATE POLICY "Room creators can delete rooms" ON public.discussion_rooms
FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- RLS POLICIES FOR ROOM MEMBERS
-- ============================================================

-- Members can see other members in their rooms
CREATE POLICY "Members see room membership" ON public.discussion_room_members
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.discussion_room_members drm
    WHERE drm.room_id = discussion_room_members.room_id AND drm.user_id = auth.uid()
  )
);

-- Admins and room moderators can add members
CREATE POLICY "Admins can add members" ON public.discussion_room_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.discussion_rooms dr
    WHERE dr.id = room_id AND dr.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.discussion_room_members drm
    WHERE drm.room_id = room_id AND drm.user_id = auth.uid() AND drm.role IN ('admin', 'moderator')
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admins and room moderators can remove members
CREATE POLICY "Admins can remove members" ON public.discussion_room_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.discussion_rooms dr
    WHERE dr.id = room_id AND dr.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.discussion_room_members drm
    WHERE drm.room_id = room_id AND drm.user_id = auth.uid() AND drm.role IN ('admin', 'moderator')
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- RLS POLICIES FOR MESSAGES
-- ============================================================

-- Members can see messages in their rooms
CREATE POLICY "Members see messages in their rooms" ON public.discussion_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.discussion_room_members
    WHERE room_id = discussion_messages.room_id AND user_id = auth.uid()
  )
);

-- Members can send messages
CREATE POLICY "Members can send messages" ON public.discussion_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.discussion_room_members
    WHERE room_id = discussion_messages.room_id AND user_id = auth.uid()
  )
);

-- Authors can update their own messages
CREATE POLICY "Authors can update their messages" ON public.discussion_messages
FOR UPDATE USING (
  author_id = auth.uid()
);

-- Authors and admins can delete messages
CREATE POLICY "Authors can delete messages" ON public.discussion_messages
FOR DELETE USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discussion_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discussion_rooms
  SET updated_at = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on new messages to update room's updated_at
CREATE TRIGGER trigger_update_room_on_message
AFTER INSERT ON public.discussion_messages
FOR EACH ROW
EXECUTE FUNCTION update_discussion_room_updated_at();

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for discussion tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Discussion Rooms feature tables created successfully!';
  RAISE NOTICE 'Tables: discussion_rooms, discussion_room_members, discussion_messages';
  RAISE NOTICE 'RLS policies enabled and configured';
  RAISE NOTICE 'Realtime subscriptions enabled';
END $$;
