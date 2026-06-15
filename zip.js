import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

console.log('Building the app...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Creating ZIP file for cPanel...');
const zipFile = 'deploy_for_cpanel.zip';

try {
  if (os.platform() === 'win32') {
    // Windows 
    execSync(`powershell Compress-Archive -Path dist/* -DestinationPath ${zipFile} -Force`, { stdio: 'inherit' });
  } else {
    // Mac/Linux
    execSync(`cd dist && zip -r ../${zipFile} .`, { stdio: 'inherit' });
  }
  console.log(`\n✅ Success! You can now upload ${zipFile} to your cPanel hosting.`);
} catch (err) {
  console.error('\n❌ Failed to zip automatically. Please manually zip the contents of the "dist" directory.');
}
