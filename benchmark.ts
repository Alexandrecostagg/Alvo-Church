import { writeBatch, setDoc, doc, getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { performance } from "perf_hooks";

// dummy data (similar to our course/modules/lessons sizes)
const MOCK_COURSES = Array.from({length: 12}).map((_, i) => ({ id: `course_${i}`, name: "Course" }));
const MOCK_COURSE_MODULES = Array.from({length: 22}).map((_, i) => ({ id: `module_${i}`, name: "Module" }));
const MOCK_LESSONS = Array.from({length: 35}).map((_, i) => ({ id: `lesson_${i}`, name: "Lesson" }));

const mockNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 30));

async function runUnoptimized() {
  const start = performance.now();
  await Promise.all([
    ...MOCK_COURSES.map(async (c) => { await mockNetworkDelay(); }),
    ...MOCK_COURSE_MODULES.map(async (m) => { await mockNetworkDelay(); }),
    ...MOCK_LESSONS.map(async (l) => { await mockNetworkDelay(); })
  ]);
  console.log("Unoptimized (O(N) simulated): ", performance.now() - start, "ms");
}

async function runOptimized() {
  const start = performance.now();
  // Batch commit mock delay (O(1))
  await mockNetworkDelay();
  console.log("Optimized (O(1) simulated): ", performance.now() - start, "ms");
}

async function main() {
  await runUnoptimized();
  await runOptimized();
}

main().catch(console.error);
