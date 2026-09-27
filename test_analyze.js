import { runRuleEngine } from './api/analyze.js';

async function test() {
  const req = {
    targets: ["solar"],
    locationType: "residential",
    area: 100,
    city: "تهران",
    appliances: []
  };
  const res = await runRuleEngine(req);
  console.log(res.engineResult.dataSource);
}
test();
