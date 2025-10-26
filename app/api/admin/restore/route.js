/**
 * Restore API
 * Restores soft-deleted items from the trash bin
 * Admin-only endpoint
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { entityType, entityId } = body; // 'material', 'topic', or 'course'

    // Validate entity type
    if (!entityType || !['material', 'topic', 'course'].includes(entityType)) {
      return NextResponse.json({
        error: 'Invalid entity type. Must be "material", "topic", or "course"'
      }, { status: 400 });
    }

    if (!entityId) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
    }

    const serviceRole = getServiceRoleClient();

    // Determine table name based on entity type
    const tableName = entityType === 'material' ? 'materials'
                    : entityType === 'topic' ? 'topics'
                    : 'courses';

    const titleField = entityType === 'material' ? 'title'
                     : entityType === 'topic' ? 'topic_name'
                     : 'course_name';

    // Check if item exists and is soft-deleted
    const { data: item, error: checkError } = await serviceRole
      .from(tableName)
      .select(`id, ${titleField}, deleted_at, deletion_type`)
      .eq('id', entityId)
      .single();

    if (checkError || !item) {
      return NextResponse.json({ error: `${entityType} not found` }, { status: 404 });
    }

    if (!item.deleted_at) {
      return NextResponse.json({
        error: `${entityType} is not deleted, cannot restore`
      }, { status: 400 });
    }

    if (item.deletion_type === 'hard') {
      return NextResponse.json({
        error: 'Cannot restore hard-deleted items'
      }, { status: 400 });
    }

    // Restore the item by clearing deletion fields
    const { error: restoreError } = await serviceRole
      .from(tableName)
      .update({
        deleted_at: null,
        deletion_type: null,
        deletion_reason: null,
        deleted_by: null,
        download_count_at_deletion: null,
        view_count_at_deletion: null
      })
      .eq('id', entityId);

    if (restoreError) throw restoreError;

    // Update audit log to record restoration
    await serviceRole
      .from('deletion_audit_log')
      .update({
        restored_at: new Date().toISOString(),
        restored_by: user.id
      })
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .is('restored_at', null) // Only update if not already restored
      .order('deleted_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      message: `${entityType} successfully restored from trash`,
      item: {
        id: item.id,
        title: item[titleField],
        type: entityType
      }
    });

  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: `Failed to restore item: ${error.message}` },
      { status: 500 }
    );
  }
}
