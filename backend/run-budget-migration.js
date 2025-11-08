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

    const sql = fs.readFileSync('/tmp/add_is_custom_to_budgets.sql', 'utf8');
    console.log('📄 Running budget migration...');

    await connection.query(sql);
    console.log('✅ Budget migration completed successfully!');

    // Verify column was added
    const [columns] = await connection.query("SHOW COLUMNS FROM budgets LIKE 'is_custom'");
    if (columns.length > 0) {
      console.log('✅ is_custom column exists');
    } else {
      console.log('⚠️  is_custom column not found');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
