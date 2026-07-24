const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`Processing: ${appPath}`);

  try {
    // 1. Ad-hoc 签名（本地签名，不需要开发者账号）
    console.log('Applying ad-hoc code signing...');
    execSync(`codesign --deep --force --sign - "${appPath}"`);
    console.log('Ad-hoc signing completed.');
  } catch (err) {
    console.warn('Ad-hoc signing failed:', err.message);
  }

  try {
    // 2. 移除隔离属性
    console.log('Removing quarantine attribute...');
    execSync(`xattr -cr "${appPath}"`);
    console.log('Quarantine attribute removed.');
  } catch (err) {
    console.warn('Failed to remove quarantine attribute:', err.message);
  }
};
