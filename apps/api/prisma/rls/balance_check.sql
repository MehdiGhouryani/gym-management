-- بررسی انحراف بدهی: باید هیچ ردیفی برنگرداند. با نقش مالک اجرا شود.
SELECT m.id, m."gymId", m.balance AS stored,
       COALESCE(s.price_sum, 0) - COALESCE(p.paid_sum, 0) AS actual
FROM members m
LEFT JOIN (SELECT "memberId", SUM(price) AS price_sum FROM subscriptions GROUP BY "memberId") s ON s."memberId" = m.id
LEFT JOIN (SELECT sub."memberId", SUM(pay.amount) AS paid_sum
           FROM payments pay JOIN subscriptions sub ON sub.id = pay."subscriptionId"
           GROUP BY sub."memberId") p ON p."memberId" = m.id
WHERE m.balance <> COALESCE(s.price_sum, 0) - COALESCE(p.paid_sum, 0);
