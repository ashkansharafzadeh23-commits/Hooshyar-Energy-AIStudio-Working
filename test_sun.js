import { getSunHoursForCity } from './api/lib/solarIrradiance.js';
async function test() {
  const data = await getSunHoursForCity('تهران');
  console.log(data);
}
test();
