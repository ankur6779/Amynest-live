-- AmyNest commercial launch — subscription health (run on Coolify Postgres)
-- Usage:
--   docker exec -e PGPASSWORD=... tcl9udyxcuq2zu598ebj0pfu \
--     psql -U postgres -d postgres -f - < scripts/commercial-launch/l4-subscription-health.sql

SELECT 'stuck_internal_trials' AS metric, COUNT(*)::int AS n
FROM subscriptions
WHERE status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW() AND provider = 'none'
UNION ALL
SELECT 'active_trialing', COUNT(*)::int
FROM subscriptions
WHERE status = 'trialing' AND (trial_ends_at IS NULL OR trial_ends_at >= NOW())
UNION ALL
SELECT 'status_active', COUNT(*)::int FROM subscriptions WHERE status = 'active'
UNION ALL
SELECT 'provider_revenuecat', COUNT(*)::int FROM subscriptions WHERE provider = 'revenuecat'
UNION ALL
SELECT 'provider_razorpay', COUNT(*)::int FROM subscriptions WHERE provider = 'razorpay'
UNION ALL
SELECT 'dup_user_subs', COUNT(*)::int FROM (
  SELECT user_id FROM subscriptions GROUP BY user_id HAVING COUNT(*) > 1
) d
UNION ALL
SELECT 'rc_webhook_failed', COUNT(*)::int
FROM revenuecat_webhook_events
WHERE processing_status IN ('failed', 'error')
UNION ALL
SELECT 'rc_webhook_stale_pending', COUNT(*)::int
FROM revenuecat_webhook_events
WHERE processing_status = 'pending' AND received_at < NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'none_active_but_free_state', COUNT(*)::int
FROM subscriptions
WHERE provider = 'none' AND status = 'active' AND COALESCE(subscription_state, '') = 'FREE';

SELECT provider, status, subscription_state, COUNT(*)
FROM subscriptions
GROUP BY 1, 2, 3
ORDER BY 4 DESC;

SELECT event_type, processing_status, COUNT(*)
FROM revenuecat_webhook_events
GROUP BY 1, 2
ORDER BY 3 DESC;
