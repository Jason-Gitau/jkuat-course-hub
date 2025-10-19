/**
 * Sync Manager - Handles syncing data between Supabase and IndexedDB
 * Provides offline-first data access with background sync
 */

import { createClient } from '@/lib/supabase/client';
import {
  STORES,
  putInStore,
  putManyInStore,
  getAllFromStore,
  getByIndex,
  updateLastSyncTime,
  getLastSyncTime,
} from './indexedDB';

/**
 * Sync all courses from Supabase to IndexedDB
 * Returns { success: boolean, data: courses[], error: string }
 */
export async function syncCourses() {
  try {
    const supabase = createClient();

    // Fetch all courses with material counts
    const [{ data: courses, error: coursesError }, { data: materials, error: materialsError }] =
      await Promise.all([
        supabase
          .from('courses')
          .select('id, course_name, description, department')
          .order('course_name'),
        supabase.from('materials').select('course_id').eq('status', 'approved'),
      ]);

    if (coursesError) throw coursesError;
    if (materialsError) throw materialsError;

    // Count materials per course in memory
    const materialCounts = {};
    materials?.forEach((m) => {
      materialCounts[m.course_id] = (materialCounts[m.course_id] || 0) + 1;
    });

    const coursesWithCounts =
      courses?.map((course) => ({
        ...course,
        materialsCount: materialCounts[course.id] || 0,
        _syncedAt: Date.now(),
      })) || [];

    // Store in IndexedDB
    await putManyInStore(STORES.COURSES, coursesWithCounts);
    await updateLastSyncTime(STORES.COURSES);

    return { success: true, data: coursesWithCounts, error: null };
  } catch (error) {
    console.error('Error syncing courses:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Sync materials for a specific course
 */
export async function syncMaterialsForCourse(courseId) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('materials')
      .select('id, title, description, type, file_url, topic_id, uploaded_by, created_at, material_category, category_metadata, week_number, course_id')
      .eq('course_id', courseId)
      .eq('status', 'approved')
      .order('week_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const materialsWithSync = data?.map((material) => ({
      ...material,
      _syncedAt: Date.now(),
    })) || [];

    // Store in IndexedDB
    await putManyInStore(STORES.MATERIALS, materialsWithSync);
    await updateLastSyncTime(`${STORES.MATERIALS}_${courseId}`);

    return { success: true, data: materialsWithSync, error: null };
  } catch (error) {
    console.error(`Error syncing materials for course ${courseId}:`, error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Sync user profile from Supabase to IndexedDB
 */
export async function syncUserProfile(userId) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        courses:course_id (
          id,
          course_name,
          department,
          description
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      // Profile doesn't exist yet (new user)
      if (error.code === 'PGRST116') {
        return { success: true, data: null, error: null };
      }
      throw error;
    }

    const profileWithSync = {
      ...data,
      _syncedAt: Date.now(),
    };

    // Store in IndexedDB
    await putInStore(STORES.USER_PROFILE, profileWithSync);
    await updateLastSyncTime(STORES.USER_PROFILE);

    return { success: true, data: profileWithSync, error: null };
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Get courses from IndexedDB (offline access)
 */
export async function getOfflineCourses() {
  try {
    const courses = await getAllFromStore(STORES.COURSES);
    const lastSync = await getLastSyncTime(STORES.COURSES);

    return {
      success: true,
      data: courses,
      lastSync,
      isStale: lastSync ? Date.now() - lastSync > 30 * 60 * 1000 : true, // 30 mins
    };
  } catch (error) {
    console.error('Error getting offline courses:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Get materials for a course from IndexedDB (offline access)
 */
export async function getOfflineMaterialsForCourse(courseId) {
  try {
    const materials = await getByIndex(STORES.MATERIALS, 'course_id', courseId);
    const lastSync = await getLastSyncTime(`${STORES.MATERIALS}_${courseId}`);

    return {
      success: true,
      data: materials,
      lastSync,
      isStale: lastSync ? Date.now() - lastSync > 30 * 60 * 1000 : true, // 30 mins
    };
  } catch (error) {
    console.error(`Error getting offline materials for course ${courseId}:`, error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Get user profile from IndexedDB (offline access)
 */
export async function getOfflineUserProfile(userId) {
  try {
    const profile = await getFromStore(STORES.USER_PROFILE, userId);
    const lastSync = await getLastSyncTime(STORES.USER_PROFILE);

    return {
      success: true,
      data: profile || null,
      lastSync,
      isStale: lastSync ? Date.now() - lastSync > 30 * 60 * 1000 : true, // 30 mins
    };
  } catch (error) {
    console.error('Error getting offline user profile:', error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * Background sync - sync all data when online
 */
export async function syncAll(userId) {
  const results = {
    courses: await syncCourses(),
    profile: userId ? await syncUserProfile(userId) : { success: true, data: null },
  };

  return {
    success: results.courses.success && results.profile.success,
    results,
  };
}
