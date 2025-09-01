#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that .env variables are properly loaded for E2E tests
 * 
 * Run from project root: node validate-env.js
 */

const dotenv = require('dotenv');
const path = require('path');

console.log('🔍 Validating E2E Environment Configuration...\n');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
  process.exit(1);
}

console.log('📂 Loading .env from:', envPath);
console.log('✅ .env file loaded successfully\n');

// Validate required variables
const requiredVars = ['BASE_URL', 'USER_EMAIL', 'USER_PASS'];
const missingVars = [];
const setVars = [];

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    setVars.push(varName);
    // Mask sensitive information
    const value = varName.includes('PASS') ? '******' : 
                  varName.includes('EMAIL') ? '***@***.com' : 
                  process.env[varName];
    console.log(`✅ ${varName}: ${value}`);
  } else {
    missingVars.push(varName);
    console.log(`❌ ${varName}: Not set`);
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Variables set: ${setVars.length}/${requiredVars.length}`);

if (missingVars.length > 0) {
  console.log(`❌ Missing variables: ${missingVars.join(', ')}`);
  console.log('\n💡 Please update your .env file with the missing variables.');
  process.exit(1);
} else {
  console.log('🎉 All required environment variables are configured!');
  console.log('\n🚀 You can now run your E2E tests:');
  console.log('   npm run test:e2e');
}