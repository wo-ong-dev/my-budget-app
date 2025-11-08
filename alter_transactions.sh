#!/usr/bin/env bash
set -euo pipefail

export MYSQL_PWD="030256dnd!"
HOST="bugetdb.cluw4caycgj9.ap-northeast-2.rds.amazonaws.com"
USER="wo_ong_app"
DB="budgetdb"

has_column() {
  local column="$1"
  mysql -N -h "$HOST" -u "$USER" -D "$DB" \
    -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB}' AND TABLE_NAME='transactions' AND COLUMN_NAME='${column}';"
}

ACC_COUNT="$(has_column account || echo 0)"
if [ "${ACC_COUNT}" = "0" ]; then
  mysql -h "$HOST" -u "$USER" -D "$DB" \
    -e "ALTER TABLE transactions ADD COLUMN account VARCHAR(100) NULL;"
fi

CAT_COUNT="$(has_column category || echo 0)"
if [ "${CAT_COUNT}" = "0" ]; then
  mysql -h "$HOST" -u "$USER" -D "$DB" \
    -e "ALTER TABLE transactions ADD COLUMN category VARCHAR(100) NULL;"
fi

CREATED_COUNT="$(has_column createdAt || echo 0)"
if [ "${CREATED_COUNT}" = "0" ]; then
  mysql -h "$HOST" -u "$USER" -D "$DB" \
    -e "ALTER TABLE transactions ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"
fi

UPDATED_COUNT="$(has_column updatedAt || echo 0)"
if [ "${UPDATED_COUNT}" = "0" ]; then
  mysql -h "$HOST" -u "$USER" -D "$DB" \
    -e "ALTER TABLE transactions ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
fi

echo "Columns ensured."

