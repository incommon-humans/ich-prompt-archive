/* ────────────────────────────────────────────────────────────────
   The Prompt Archive — configuration

   Both environments live here. The page picks one automatically:
   localhost or a file:// preview uses DEV, anything else uses PROD.
   Force it by adding ?env=dev or ?env=prod to the URL.
──────────────────────────────────────────────────────────────── */
window.ICH_ENV = {

  dev: {
    SUPABASE_URL: 'https://rnbvgmqseuwmkmhjnenf.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuYnZnbXFzZXV3bWttaGpuZW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzcxMTksImV4cCI6MjA4NTk1MzExOX0.JnxOZcT-lqnaSnoykF3TjbSGHjJtSn9o1xnnZxQRhnE'    // ICH Dev, London
  },

  prod: {
    SUPABASE_URL: 'https://niplwyivatcqradztkel.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcGx3eWl2YXRjcXJhZHp0a2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTkyODUsImV4cCI6MjA4ODM5NTI4NX0.Wdh0ndJVsmZ228qDYzTUU474gL11EkPtYrwUXvAW0gs'    // ICH Prod, Ireland
  }

};

/* Copy counters. Leave false until the number is one you would
   happily show a stranger. False hides the stat rows entirely
   rather than showing zeros. */
window.ICH_SHOW_COUNTERS = false;


/* ── environment selection, no need to edit below ─────────────── */
(function () {
  var q = new URLSearchParams(location.search).get('env');
  var isLocal = location.hostname === 'localhost'
             || location.hostname === '127.0.0.1'
             || location.protocol === 'file:';
  var env = (q === 'dev' || q === 'prod') ? q : (isLocal ? 'dev' : 'prod');

  window.ICH_CONFIG = Object.assign({}, window.ICH_ENV[env], {
    ENV: env,
    SHOW_COUNTERS: window.ICH_SHOW_COUNTERS
  });

  console.info('[archive] environment:', env, window.ICH_CONFIG.SUPABASE_URL);
})();
