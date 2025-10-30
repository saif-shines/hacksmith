#!/usr/bin/env node

/**
 * Temporary script to test you.com APIs
 * Usage: node test-you-api.js [contents|search|all]
 */

import "dotenv/config";

const API_KEY = process.env.YOU_API_KEY;

if (!API_KEY) {
  console.error("❌ Error: YOU_API_KEY not found in .env file");
  process.exit(1);
}

/**
 * Test the Contents API
 */
async function testContentsAPI() {
  console.log("\n🔍 Testing Contents API...\n");

  const url = "https://api.ydc-index.io/v1/contents";
  const options = {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls: ["https://www.you.com"],
      format: "html",
    }),
  };

  try {
    console.log(`📤 POST ${url}`);
    console.log(`📋 Fetching content for: https://www.you.com\n`);

    const response = await fetch(url, options);

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Check for error in response body
    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    console.log("\n✅ Contents API Response:");
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error("\n❌ Contents API Error:");
    console.error(error.message);
    throw error;
  }
}

/**
 * Test the Search API
 */
async function testSearchAPI(query = "hacksmith cli tool") {
  console.log("\n🔍 Testing Search API...\n");

  const url = `https://api.ydc-index.io/v1/search?query=${encodeURIComponent(query)}`;
  const options = {
    method: "GET",
    headers: {
      "X-API-Key": API_KEY,
    },
  };

  try {
    console.log(`📤 GET ${url}`);
    console.log(`🔎 Query: "${query}"\n`);

    const response = await fetch(url, options);

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Check for error in response body
    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    console.log("\n✅ Search API Response:");
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error("\n❌ Search API Error:");
    console.error(error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || "all";
  const searchQuery = process.argv[3];

  console.log("🚀 You.com API Test Script");
  console.log("═══════════════════════════");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);

  try {
    switch (command) {
      case "contents":
        await testContentsAPI();
        break;

      case "search":
        await testSearchAPI(searchQuery);
        break;

      case "all":
      default:
        await testContentsAPI();
        await testSearchAPI(searchQuery);
        break;
    }

    console.log("\n\n✨ All tests completed successfully!\n");
  } catch (error) {
    console.error("\n\n💥 Tests failed\n");
    console.error(error.message);
    process.exit(1);
  }
}

main();

/*
 * ============================================================================
 * API TEST RESULTS - Captured on 2025-10-30
 * ============================================================================
 */

/*
 * CONTENTS API RESPONSE
 *
 * Endpoint: POST https://api.ydc-index.io/v1/contents
 * Status: 200 OK
 * Request Body: {"urls":["https://www.you.com"],"format":"html"}
 *
 * Response Structure:
 * [
 *   {
 *     "url": "https://www.you.com",
 *     "title": "Enterprise AI, Built Your Way | You.com",
 *     "html": "<!DOCTYPE html>... [Full HTML content of the page] ..."
 *   }
 * ]
 *
 * Key Features:
 * - Returns complete HTML content of the specified URL(s)
 * - Includes page title and URL
 * - Format can be "html" or other supported formats
 * - Useful for web scraping and content extraction
 */

/*
 * SEARCH API RESPONSE
 *
 * Endpoint: GET https://api.ydc-index.io/v1/search?query=hacksmith%20cli%20tool
 * Status: 200 OK
 * Query: "hacksmith cli tool"
 *
 * Response Structure:
 * {
 *   "results": {
 *     "web": [
 *       {
 *         "url": "https://thehacksmith.dev/",
 *         "title": "hacksmith | hacksmith",
 *         "description": "Toggle between research and work modes in minutes",
 *         "snippets": [
 *           "hacksmith · Search CtrlK · Cancel · Toggle between research and work modes · Get Started View CLI Usage"
 *         ],
 *         "favicon_url": "https://you.com/favicon?domain=thehacksmith.dev&size=128"
 *       },
 *       {
 *         "url": "https://hacksmith.store/en-us/collections/tools",
 *         "title": "Tools",
 *         "description": "Useful gadgets to help you build your next project!",
 *         "snippets": [
 *           "Close · Start earning points today and get exclusive offers to channel your inner Hacksmith..."
 *         ],
 *         "thumbnail_url": "http://hacksmith.store/cdn/shop/collections/MINISABER-2_png...",
 *         "favicon_url": "https://you.com/favicon?domain=hacksmith.store&size=128"
 *       },
 *       ... (additional results)
 *     ]
 *   },
 *   "metadata": {
 *     "query": "hacksmith cli tool",
 *     "search_uuid": "d64cec80-cec1-426c-b70b-ee90c146ccd2",
 *     "latency": 0.6418836116790771
 *   }
 * }
 *
 * Key Features:
 * - Returns web search results with URLs, titles, and descriptions
 * - Includes content snippets from each page
 * - Provides thumbnail and favicon URLs
 * - Includes page_age for some results
 * - Metadata includes search UUID and latency
 * - Fast response time (~640ms in this test)
 *
 * Search Results Returned: 9 results
 * Results include:
 * 1. https://thehacksmith.dev/ - Main hacksmith website
 * 2. https://hacksmith.store/en-us/collections/tools - Tools collection
 * 3. https://hacksmith.store/en-us/collections/vendors?q=Hacksmith+Tools
 * 4. https://hiconsumption.com/gear/hacksmith-the-smith-blade-21-in-1-multi-tool/
 * 5. https://www.ifixit.com/Shop/Hacksmith - iFixit tools
 * 6. https://www.kickstarter.com/projects/hacksmith/the-smith-blade-21-in-1-titanium-multi-tool/creator
 * 7. https://www.reddit.com/r/EDC/comments/1ml7xgf/my_take_on_the_hacksmith_smithblade/
 * 8. https://www.homecrux.com/hacksmith-smith-blade-titanium-multi-tool/332305/
 * 9. https://www.reddit.com/r/EDC/comments/1mj9p3k/youtuber_the_hacksmith_is_crowdfunding_a/
 */
