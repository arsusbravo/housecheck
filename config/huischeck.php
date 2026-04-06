<?php

return [
    /*
    |--------------------------------------------------------------------------
    | EP-Online API Key
    |--------------------------------------------------------------------------
    | Register at https://www.ep-online.nl/ to get a free API key.
    */
    'ep_online_api_key' => env('EP_ONLINE_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | BAG API Key (optional)
    |--------------------------------------------------------------------------
    | The PDOK BAG WFS is free and keyless. The Kadaster BAG API v2
    | offers more features but requires a key from https://bag.basisregistraties.overheid.nl/
    | Leave empty to use the free PDOK WFS fallback.
    */
    'bag_api_key' => env('BAG_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Cache TTL
    |--------------------------------------------------------------------------
    | How many days to consider cached address reports as "fresh".
    */
    'cache_max_age_days' => env('HUISCHECK_CACHE_DAYS', 90),
];