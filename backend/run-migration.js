require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('✅ Connected to database');

    const sql = fs.readFileSync('migrations/create_expense_plans.sql', 'utf8');
    console.log('📄 Running migration...');

    await connection.query(sql);
    console.log('✅ Migration completed successfully!');

    // Verify table was created
    const [tables] = await connection.query("SHOW TABLES LIKE 'expense_plans'");
    if (tables.length > 0) {
      console.log('✅ expense_plans table exists');
    } else {
      console.log('⚠️  expense_plans table not found');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
