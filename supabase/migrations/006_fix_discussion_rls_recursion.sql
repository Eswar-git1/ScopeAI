-- ============================================================
-- FIX RLS RECURSION IN DISCUSSION ROOMS
-- ============================================================

-- 1. Create secure functions to check room membership (bypasses RLS)
-- These functions are SECURITY DEFINER, meaning they run with the privileges 
-- of the creator (postgres/admin), effectively bypassing RLS checks on the tables they query.
-- This breaks the infinite loop of Policy -> Table -> Policy -> Table.

CREATE OR REPLACE FUNCTION public.is_room_participant(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.discussion_room_members
    WHERE room_id = check_room_id 
    AND user_id = check_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_room_role(check_room_id uuid, check_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.discussion_room_members
    WHERE room_id = check_room_id 
    AND user_id = check_user_id
    AND role = required_role
  );
END;
$$;

-- 2. Drop existing problematic policies

DROP POLICY IF EXISTS "Users see rooms they're members of" ON public.discussion_rooms;
DROP POLICY IF EXISTS "Admins can create rooms" ON public.discussion_rooms;
DROP POLICY IF EXISTS "Room creators can update rooms" ON public.discussion_rooms;
DROP POLICY IF EXISTS "Room creators can delete rooms" ON public.discussion_rooms;

DROP POLICY IF EXISTS "Members see room membership" ON public.discussion_room_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.discussion_room_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.discussion_room_members;

DROP POLICY IF EXISTS "Members see messages in their rooms" ON public.discussion_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.discussion_messages;

-- 3. Re-create policies using secure functions

-- DISCUSSION ROOMS
CREATE POLICY "Users can view rooms" ON public.discussion_rooms
FOR SELECT USING (
  created_by = auth.uid() OR
  public.is_room_participant(id, auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins/Owners can create rooms" ON public.discussion_rooms
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')) OR
  created_by = auth.uid()
);

CREATE POLICY "Creators/Admins can update rooms" ON public.discussion_rooms
FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Creators/Admins can delete rooms" ON public.discussion_rooms
FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DISCUSSION ROOM MEMBERS
CREATE POLICY "Users can view room members" ON public.discussion_room_members
FOR SELECT USING (
  -- User can see their own membership
  user_id = auth.uid() OR
  -- User can see members of rooms they are in
  public.is_room_participant(room_id, auth.uid()) OR
  -- Admins can see all
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authorized users can manage members" ON public.discussion_room_members
FOR INSERT WITH CHECK (
  -- Room creator can add members (including themselves)
  EXISTS (SELECT 1 FROM public.discussion_rooms WHERE id = room_id AND created_by = auth.uid()) OR
  -- Room admins/moderators can add members
  public.has_room_role(room_id, auth.uid(), 'admin') OR
  public.has_room_role(room_id, auth.uid(), 'moderator') OR
  -- Platform admin
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authorized users can remove members" ON public.discussion_room_members
FOR DELETE USING (
  -- Room creator
  EXISTS (SELECT 1 FROM public.discussion_rooms WHERE id = room_id AND created_by = auth.uid()) OR
  -- Room admins/moderators
  public.has_room_role(room_id, auth.uid(), 'admin') OR
  public.has_room_role(room_id, auth.uid(), 'moderator') OR
  -- Platform admin
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authorized users can update members" ON public.discussion_room_members
FOR UPDATE USING (
  -- Room creator
  EXISTS (SELECT 1 FROM public.discussion_rooms WHERE id = room_id AND created_by = auth.uid()) OR
  -- Room admins
  public.has_room_role(room_id, auth.uid(), 'admin') OR
  -- Platform admin
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DISCUSSION MESSAGES
CREATE POLICY "Users can view messages" ON public.discussion_messages
FOR SELECT USING (
  public.is_room_participant(room_id, auth.uid()) OR
  EXISTS (SELECT 1 FROM public.discussion_rooms WHERE id = room_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Members can send messages" ON public.discussion_messages
FOR INSERT WITH CHECK (
  public.is_room_participant(room_id, auth.uid())
);
