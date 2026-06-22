const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `cryptobank_backup_${timestamp}.sql`;
const filepath = path.join(backupDir, filename);

try {
  execSync(
    `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe" -u root -pAdmin@2025 --port=3307 cryptobank > "${filepath}"`,
    { stdio: 'inherit' }
  );
  console.log(`Backup created: ${filepath}`);
} catch (err) {
  console.error('Backup failed:', err.message);
}
