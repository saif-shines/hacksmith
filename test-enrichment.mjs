#!/usr/bin/env node

/**
 * Test script for You.com API enrichment
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: join(__dirname, '.env') });

console.log('🧪 Testing You.com API Enrichment\n');

// Check API key
if (!process.env.YOU_API_KEY) {
	console.error('❌ YOU_API_KEY not found in environment');
	process.exit(1);
}

console.log(`✅ API Key found: ${process.env.YOU_API_KEY.substring(0, 20)}...\n`);

// Import and test the enrichment
const { ContextEnricher } = await import('./packages/hacksmith/dist/services/context-enricher.js');

try {
	console.log('📦 Creating enricher...');
	const enricher = new ContextEnricher(process.env.YOU_API_KEY);

	console.log('\n🔍 Testing Integration Guides Search...');
	const guides = await enricher.enrichIntegrationGuides('Scalekit SSO', ['Express', 'Node.js']);

	console.log(`\n✅ Found ${guides.length} integration guides:`);
	guides.forEach((guide, i) => {
		console.log(`\n${i + 1}. ${guide.title}`);
		console.log(`   URL: ${guide.url}`);
		console.log(`   Description: ${guide.description.substring(0, 100)}...`);
	});

	console.log('\n🔍 Testing Dependency Context Search...');
	const depContext = await enricher.enrichDependencyContext({
		'express': '^5.1.0',
		'dotenv': '^17.2.3'
	});

	console.log(`\n✅ Found dependency context for ${depContext.length} packages:`);
	depContext.forEach((dep) => {
		console.log(`\n📦 ${dep.name} (${dep.version})`);
		dep.resources.forEach((res, i) => {
			console.log(`   ${i + 1}. ${res.title}`);
			console.log(`      ${res.url}`);
		});
	});

	console.log('\n\n✨ All enrichment tests passed!\n');
} catch (error) {
	console.error('\n❌ Enrichment test failed:');
	console.error(error);
	process.exit(1);
}
