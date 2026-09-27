async function test() {
  const url = 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=51.389&latitude=35.6892&format=JSON';
  const r = await fetch(url);
  const j = await r.json();
  console.log(j.properties.parameter.ALLSKY_SFC_SW_DWN);
}
test();
