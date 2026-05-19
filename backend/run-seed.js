import { seed } from './src/seed.ts';
seed().then(() => {
  console.log("🚀 Seed finished successfully!");
  process.exit(0);
}).catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
