// Bloom Calendar - Supabase Configuration
const SUPABASE_URL = 'https://ndlcfgkhxjoancdvmgmr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EzlLIeKJDqtMs0mKD0gfgA_C86iHZal';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Location ID for Bloom Chiangmai - set after first fetch
let LOCATION_ID = null;
let ACADEMIC_YEAR_ID = null;

async function getLocation() {
  const { data, error } = await supabase
    .from('bloom_locations')
    .select('*')
    .eq('name', 'Bloom Chiangmai')
    .single();
  if (error) { console.error('Location error:', error); return null; }
  LOCATION_ID = data.id;
  return data;
}

async function getActiveYear() {
  const { data, error } = await supabase
    .from('bloom_academic_years')
    .select('*')
    .eq('location_id', LOCATION_ID)
    .eq('is_active', true)
    .single();
  if (error) return null;
  ACADEMIC_YEAR_ID = data?.id;
  return data;
}

async function loadCalendarEvents() {
  if (!LOCATION_ID) return {};
  const { data, error } = await supabase
    .from('bloom_calendar_events')
    .select('*')
    .eq('location_id', LOCATION_ID);
  if (error) { console.error('Events error:', error); return {}; }
  const result = {};
  data.forEach(ev => { result[ev.date] = { type: ev.day_type, label: ev.label || '', id: ev.id }; });
  return result;
}

async function saveCalendarEvent(date, dayType, label = '') {
  if (!LOCATION_ID || !ACADEMIC_YEAR_ID) return false;
  const existing = await supabase
    .from('bloom_calendar_events')
    .select('id')
    .eq('location_id', LOCATION_ID)
    .eq('date', date)
    .single();

  if (existing.data) {
    const { error } = await supabase
      .from('bloom_calendar_events')
      .update({ day_type: dayType, label, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id);
    return !error;
  } else {
    const { error } = await supabase
      .from('bloom_calendar_events')
      .insert({ location_id: LOCATION_ID, academic_year_id: ACADEMIC_YEAR_ID, date, day_type: dayType, label });
    return !error;
  }
}

async function deleteCalendarEvent(date) {
  if (!LOCATION_ID) return false;
  const { error } = await supabase
    .from('bloom_calendar_events')
    .delete()
    .eq('location_id', LOCATION_ID)
    .eq('date', date);
  return !error;
}

async function saveAcademicYear(yearData) {
  if (!LOCATION_ID) return null;
  const { data, error } = await supabase
    .from('bloom_academic_years')
    .insert({
      location_id: LOCATION_ID,
      label: yearData.label || '2026-2027',
      t1_start: yearData.t1Start,
      t1_end: yearData.t1End,
      t2_start: yearData.t2Start,
      t2_end: yearData.t2End,
      is_active: true
    })
    .select()
    .single();
  if (error) { console.error('Year save error:', error); return null; }
  ACADEMIC_YEAR_ID = data.id;
  return data;
}

async function archiveYear() {
  if (!ACADEMIC_YEAR_ID) return false;
  const { error } = await supabase
    .from('bloom_academic_years')
    .update({ is_active: false })
    .eq('id', ACADEMIC_YEAR_ID);
  return !error;
}

async function saveBulkEvents(events) {
  // events = [{date, day_type, label}]
  if (!LOCATION_ID || !ACADEMIC_YEAR_ID) return false;
  const rows = events.map(e => ({
    location_id: LOCATION_ID,
    academic_year_id: ACADEMIC_YEAR_ID,
    date: e.date,
    day_type: e.day_type,
    label: e.label || ''
  }));
  // Upsert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('bloom_calendar_events')
      .upsert(batch, { onConflict: 'location_id,date' });
    if (error) { console.error('Bulk save error:', error); return false; }
  }
  return true;
}
