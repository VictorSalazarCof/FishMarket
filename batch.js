const express = require("express");
const router  = express.Router();
const { triggerBatchRecalculate } = require("../data/mockData");

// ── POST /api/v1/batch/recalculate ───────────────────────────
// Body: { targetDate (YYYY-MM-DD), scope (daily|weekly|monthly) }
router.post("/recalculate", (req, res) => {
  const { targetDate, scope } = req.body || {};

  // Validate scope
  const validScopes = ["daily", "weekly", "monthly"];
  if (scope && !validScopes.includes(scope)) {
    return res.status(400).json({
      error:   "Bad Request",
      message: `scope debe ser uno de: ${validScopes.join(", ")}`,
    });
  }

  // Validate date format if provided
  if (targetDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return res.status(400).json({
        error:   "Bad Request",
        message: "targetDate debe tener formato YYYY-MM-DD",
      });
    }
  }

  const result = triggerBatchRecalculate({ targetDate, scope });
  res.status(202).json(result); // 202 Accepted — job is queued, not yet done
});

module.exports = router;
