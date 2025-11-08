module.exports = function(app, pool) {
  function toBackendType(t) {
    if (!t) return t;
    const s = String(t).toUpperCase();
    if (s === 'INCOME') return 'INCOME';
    if (s === 'EXPENSE') return 'EXPENSE';
    // allow Korean inputs but normalize to EN types
    if (t === '수입') return 'INCOME';
    if (t === '지출') return 'EXPENSE';
    return s === 'INCOME' ? 'INCOME' : 'EXPENSE';
  }

  app.get('/api/transactions', async function (req, res) {
    try {
      const from = req.query.from;
      const to = req.query.to;
      let sql = "SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date, type, account, category, amount, memo, createdAt, updatedAt FROM transactions";
      const params = [];
      if (from || to) {
        sql += ' WHERE 1=1';
        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }
      }
      sql += ' ORDER BY date DESC, id DESC';
      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.post('/api/transactions', async function (req, res) {
    try {
      const body = req.body || {};
      if (!body.date || !body.type || body.amount == null) {
        return res.status(400).json({ ok: false, error: 'date/type/amount required' });
      }
      const backendType = toBackendType(body.type);
      const [result] = await pool.query(
        'INSERT INTO transactions (date, type, account, category, amount, memo) VALUES (?,?,?,?,?,?)',
        [
          body.date,
          backendType,
          body.account || null,
          body.category || null,
          Number(body.amount),
          body.memo || null,
        ]
      );
      res.json({ ok: true, id: result.insertId });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.put('/api/transactions/:id', async function (req, res) {
    try {
      const id = Number(req.params.id);
      const body = req.body || {};
      if (!id || !body.date || !body.type || body.amount == null) {
        return res.status(400).json({ ok: false, error: 'id/date/type/amount required' });
      }
      const backendType = toBackendType(body.type);
      await pool.query(
        'UPDATE transactions SET date=?, type=?, account=?, category=?, amount=?, memo=? WHERE id=?',
        [
          body.date,
          backendType,
          body.account || null,
          body.category || null,
          Number(body.amount),
          body.memo || null,
          id,
        ]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.delete('/api/transactions/:id', async function (req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ ok: false, error: 'id required' });
      }
      await pool.query('DELETE FROM transactions WHERE id=?', [id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  app.get('/api/summary', async function (req, res) {
    try {
      const from = req.query.from;
      const to = req.query.to;
      const where = [];
      const params = [];
      if (from) { where.push('date >= ?'); params.push(from); }
      if (to) { where.push('date <= ?'); params.push(to); }
      const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

      const [totals] = await pool.query(
        `SELECT 
           SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS totalIncome,
           SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS totalExpense
         FROM transactions${whereSql}`,
        params
      );

      const [byCategory] = await pool.query(
        `SELECT 
           COALESCE(category, 'Other') AS category,
           SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense
         FROM transactions${whereSql}
         GROUP BY COALESCE(category, 'Other')
         ORDER BY expense DESC`,
        params
      );

      const [byAccount] = await pool.query(
        `SELECT 
           COALESCE(account, 'Unassigned') AS account,
           SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense
         FROM transactions${whereSql}
         GROUP BY COALESCE(account, 'Unassigned')
         ORDER BY expense DESC`,
        params
      );

      const ti = Number(totals?.[0]?.totalIncome || 0);
      const te = Number(totals?.[0]?.totalExpense || 0);
      res.json({
        summary: {
          totalIncome: ti,
          totalExpense: te,
          balance: ti - te,
          categories: byCategory,
          accounts: byAccount,
          periodLabel: from && to ? `${from} ~ ${to}` : undefined,
        },
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
};


