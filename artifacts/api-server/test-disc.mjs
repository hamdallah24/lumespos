import { consultantDiscovery } from "./dist/index.mjs";
const map = consultantDiscovery.build();
console.log("Keywords:", Object.keys(map).length);
const entries = Object.entries(map).slice(0, 15);
for (const [k, v] of entries) {
  console.log(k + ":", v.files.length + " files, domain:", v.domain);
}
// Check inventory
if (map.inventory) {
  console.log("\ninventory files:", map.inventory.files);
  console.log("inventory entities:", map.inventory.entities);
}
consultantDiscovery.save(map);
