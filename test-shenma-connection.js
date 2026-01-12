// Comprehensive test script for Shenma API endpoints
import fetch from 'node-fetch';

// Shenma API base URL
const BASE_URL = 'https://api.whatai.cc';

// Test API key (placeholder - user will provide their own in production)
const API_KEY = '';

// Headers for all API requests
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

// Test chat completion endpoint
async function testChatCompletion() {
  console.log(`\n=== Testing Chat Completion API ===`);
  const endpoint = `${BASE_URL}/v1/chat/completions`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello, please respond with a short test message.' }],
        temperature: 0.7,
        max_tokens: 50
      })
    });
    
    console.log(`Chat API - HTTP Status: ${response.status}`);
    
    try {
      const data = await response.json();
      console.log(`Chat API - Response Body:`, data);
      return response.status === 200;
    } catch (e) {
      const text = await response.text();
      console.log(`Chat API - Response Text:`, text);
      return false;
    }
    
  } catch (error) {
    console.error(`Chat API - Connection Error:`, error);
    return false;
  }
}

// Test image generation endpoint
async function testImageGeneration() {
  console.log(`\n=== Testing Image Generation API ===`);
  const endpoint = `${BASE_URL}/v1/images/generations`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'nano-banana',
        prompt: 'A beautiful sunset over the ocean',
        n: 1,
        size: '1024x1024'
      })
    });
    
    console.log(`Image API - HTTP Status: ${response.status}`);
    
    try {
      const data = await response.json();
      console.log(`Image API - Response Body:`, data);
      return response.status === 200;
    } catch (e) {
      const text = await response.text();
      console.log(`Image API - Response Text:`, text);
      return false;
    }
    
  } catch (error) {
    console.error(`Image API - Connection Error:`, error);
    return false;
  }
}

// Test video generation endpoint
async function testVideoGeneration() {
  console.log(`\n=== Testing Video Generation API ===`);
  const endpoint = `${BASE_URL}/v2/videos/generations`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'sora_video2',
        prompt: 'A cat playing with a ball of yarn',
        aspect_ratio: '16:9'
      })
    });
    
    console.log(`Video API - HTTP Status: ${response.status}`);
    
    try {
      const data = await response.json();
      console.log(`Video API - Response Body:`, data);
      return response.status === 200;
    } catch (e) {
      const text = await response.text();
      console.log(`Video API - Response Text:`, text);
      return false;
    }
    
  } catch (error) {
    console.error(`Video API - Connection Error:`, error);
    return false;
  }
}

// Test domain reachability
async function testDomainReachability() {
  console.log(`\n=== Testing Domain Reachability ===`);
  
  try {
    const response = await fetch(BASE_URL, { method: 'HEAD' });
    console.log(`Domain Reachability - HTTP Status: ${response.status}`);
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    console.error(`Domain Reachability - Error:`, error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log(`Starting comprehensive Shenma API tests...`);
  console.log(`Using API Key: ${API_KEY}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(50));
  
  // Test domain reachability first
  const domainReachable = await testDomainReachability();
  
  if (!domainReachable) {
    console.log(`\n❌ Domain is not reachable. API tests will be skipped.`);
    return;
  }
  
  // Run all API tests
  const chatResult = await testChatCompletion();
  const imageResult = await testImageGeneration();
  const videoResult = await testVideoGeneration();
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`=== Test Summary ===`);
  console.log(`Chat Completion: ${chatResult ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Image Generation: ${imageResult ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Video Generation: ${videoResult ? '✅ Passed' : '❌ Failed'}`);
  
  const allPassed = chatResult && imageResult && videoResult;
  console.log(`Overall Result: ${allPassed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}`);
  console.log('='.repeat(50));
}

runAllTests();