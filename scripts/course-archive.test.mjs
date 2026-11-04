import test from "node:test";
import assert from "node:assert/strict";
import { validateBackup, restoreWrites, digest } from "./course-archive.mjs";

const prefix = "projects/alvo-church/databases/(default)/documents/";
function fixture() {
  return { version: 1, project: "alvo-church", roots: ["platformPrograms/course", "organizations/org/courses/course"], documents: [
    { name: prefix + "platformPrograms/course", updateTime: "2026-10-02T10:00:00Z", fields: { isPublished: { booleanValue: true }, createdAt: { timestampValue: "2026-01-01T00:00:00Z" } } },
    { name: prefix + "organizations/org/courses/course", updateTime: "2026-10-02T10:00:00Z", fields: { isActive: { booleanValue: true } } },
    { name: prefix + "organizations/org/courses/course/lessons/lesson", updateTime: "2026-10-02T10:00:00Z", fields: { videoUrl: { stringValue: "https://example.test/video" } } },
  ] };
}
test("restore preserves typed content and always creates drafts without overwriting", () => {
  const backup = fixture();
  const writes = restoreWrites(backup);
  assert.equal(writes[0].update.fields.isPublished.booleanValue, false);
  assert.equal(writes[1].update.fields.isActive.booleanValue, false);
  assert.deepEqual(writes[0].update.fields.createdAt, backup.documents[0].fields.createdAt);
  assert.deepEqual(writes[2].update.fields, backup.documents[2].fields);
  assert.ok(writes.every(w => w.currentDocument.exists === false));
  assert.equal(backup.documents[0].fields.isPublished.booleanValue, true);
});
test("rejects another project in metadata or document names", () => {
  const backup = fixture();
  assert.throws(() => validateBackup({ ...backup, project: "another" }));
  backup.documents[0].name = backup.documents[0].name.replace("alvo-church", "another");
  assert.throws(() => validateBackup(backup));
});
test("rejects member data outside the course hierarchy", () => {
  const backup = fixture();
  assert.throws(() => validateBackup({ ...backup, roots: ["organizations/org/people/member"] }));
  backup.documents[0].name = prefix + "organizations/org/people/member";
  assert.throws(() => validateBackup(backup));
});
test("rejects duplicates and missing root documents", () => {
  const backup = fixture();
  assert.throws(() => validateBackup({ ...backup, documents: [...backup.documents, backup.documents[0]] }));
  assert.throws(() => validateBackup({ ...backup, documents: backup.documents.slice(1) }));
});
test("requires revision preconditions and respects atomic batch limit", () => {
  const backup = fixture();
  assert.throws(() => validateBackup({ ...backup, documents: Array(451).fill(backup.documents[0]) }));
  delete backup.documents[0].updateTime;
  assert.throws(() => validateBackup(backup));
});
test("checksum changes when backup content changes", () => {
  const original = JSON.stringify(fixture());
  assert.notEqual(digest(original), digest(original.replace("video", "changed")));
});
