(function () {
  'use strict';

  const SUPABASE_URL = 'https://bwwgrbbovlkihtyhhapt.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_usKC88fBSVnNvb4LTEUXJQ_8lPKVvub';

  window.loadModoRumboPrograms = async function () {
    const query = new URLSearchParams({
      select: '*,departures(*),itinerary_days(*)',
      status: 'eq.published',
      order: 'sort_order.asc,updated_at.desc'
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/programs?${query}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    if (!response.ok) throw new Error(`No se pudieron cargar los programas (${response.status})`);
    return response.json();
  };
})();
