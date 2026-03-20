/**
 * Simple test to verify Fingard functionality
 */

const { ProviderRouter } = require('./dist/lib/carbon/provider-router');

async function testProviderRouter() {
  console.log('🚀 Testing ProviderRouter with Fingard integration...\n');
  
  const providerRouter = new ProviderRouter();
  const testRegions = ['us-east-1', 'us-west-2', 'eu-west-1'];
  
  for (const region of testRegions) {
    try {
      console.log(`🔍 Testing ${region}...`);
      
      const routingSignal = await providerRouter.getRoutingSignal(region, new Date());
      
      console.log(`  Source: ${routingSignal.provenance.sourceUsed}`);
      console.log(`  Carbon: ${routingSignal.carbonIntensity} gCO2/kWh`);
      console.log(`  Confidence: ${(routingSignal.confidence * 100).toFixed(1)}%`);
      console.log(`  Fallback: ${routingSignal.provenance.fallbackUsed ? 'YES' : 'NO'}`);
      console.log(`  Notes: ${routingSignal.provenance.validationNotes || 'None'}`);
      
      if (routingSignal.provenance.sourceUsed.includes('_FINGARD')) {
        console.log(`  ✅ Fingard is working!`);
      } else {
        console.log(`  ⚠️  Using legacy provider logic`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}\n`);
    }
  }
}

testProviderRouter().catch(console.error);
