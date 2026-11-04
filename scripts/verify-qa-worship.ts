import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { POST } from "../apps/web/app/api/worship/route";
import {
  signInWithFirebaseMobileEmailPassword,
  signOutFromFirebaseMobile,
  fetchWorshipSongs,
  fetchWorshipSetlistByEventId,
  getFirebaseFirestore,
} from "../packages/firebase/src/index";
import { doc, setDoc, terminate } from "firebase/firestore";
import {
  mobileWorshipSong,
  mobileWorshipProgram,
} from "../apps/mobile/src/features/worship/worship-model";
import {
  parseWorshipChart,
  importWorshipText,
  worshipLyrics,
} from "../packages/domain/src/worship-chart";
async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw Error("Only demo-alvo-qa is allowed.");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    suffix = crypto.randomUUID().slice(0, 8),
    org = `qa_worship_${suffix}`,
    root = `organizations/${org}`,
    admin = `wa_${suffix}`,
    member = `wm_${suffix}`,
    password = "Local-QA-2026!";
  const config = {
    apiKey: "demo-alvo-qa-key",
    authDomain: "demo-alvo-qa.firebaseapp.com",
    projectId: "demo-alvo-qa",
    storageBucket: "demo-alvo-qa.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:localqa",
    useEmulator: true,
  };
  let checks = 0;
  const eq = (a: unknown, b: unknown, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
  };
  let token = "",
    memberToken = "";
  async function api(body: object, access = token) {
    const r = await POST(
      new NextRequest("http://127.0.0.1:3001/api/worship", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ organizationId: org, ...body }),
      }),
    );
    return { status: r.status, data: await r.json() };
  }
  const lyrics =
    "[Intro]\n[C6/9] [G/B]\n\n[Verso]\nUm [C]novo [F]dia\n\n{start_of_chorus: Refrão}\n[G7]Paz e [C]voz\n{end_of_chorus}";
  const draft = {
    action: "save-song",
    id: "song_qa",
    title: "Composição fictícia",
    artist: "Equipe fictícia",
    originalKey: "C",
    preferredKey: "D",
    tempoBpm: 80,
    chordsLyrics: lyrics,
    spotifyUrl: "https://open.spotify.com/track/qa",
    youtubeUrl: "https://youtu.be/qa",
    expectedVersion: 0,
  };
  try {
    await db
      .doc(root)
      .set({ id: org, status: "active", name: "Igreja fictícia de cifras" });
    for (const [uid, roles] of [
      [admin, ["church_admin"]],
      [member, ["member"]],
    ] as const) {
      await auth.createUser({ uid, email: `${uid}@example.test`, password });
      await db
        .doc(`${root}/users/${uid}`)
        .set({ organizationId: org, isActive: true, roles });
    }
    token = await (
      await signInWithFirebaseMobileEmailPassword({
        config,
        email: `${admin}@example.test`,
        password,
      })
    ).user.getIdToken();
    memberToken = await (
      await signInWithFirebaseMobileEmailPassword({
        config,
        email: `${member}@example.test`,
        password,
      })
    ).user.getIdToken();
    eq(
      (await api({ action: "snapshot" }, "invalid")).status,
      401,
      "authentication required",
    );
    eq((await api(draft, memberToken)).status, 403, "member cannot edit");
    eq(
      (await api({ action: "snapshot", organizationId: "foreign_org" })).status,
      403,
      "foreign church denied",
    );
    eq(
      (await api({ action: "snapshot" })).data.songs.length,
      0,
      "no demo songs inserted automatically",
    );
    let saved = await api(draft);
    eq(saved.status, 200, JSON.stringify(saved.data));
    eq(saved.data.song.version, 1, "new revision");
    eq(
      saved.data.song.chordsLyrics,
      lyrics,
      "canonical source preserved exactly",
    );
    eq((await api(draft)).status, 409, "duplicate/stale save cannot overwrite");
    for (const [patch, label] of [
      [{ originalKey: "H" }, "invalid original key"],
      [{ preferredKey: "Dm" }, "major/minor conversion refused"],
      [{ tempoBpm: 999 }, "invalid tempo"],
      [{ youtubeUrl: "javascript:alert(1)" }, "script link"],
      [{ spotifyUrl: "https://evil.test/music" }, "untrusted link"],
      [{ chordsLyrics: "a".repeat(60001) }, "source limit"],
    ])
      eq(
        (await api({ ...draft, ...patch, id: crypto.randomUUID() })).status,
        400,
        label as string,
      );
    const edited = await api({
      ...draft,
      expectedVersion: 1,
      chordsLyrics: lyrics + "\n[C]Fim",
      spotifyUrl: "",
      youtubeUrl: "",
      tempoBpm: null,
    });
    eq(edited.status, 200, "edit existing source");
    eq(edited.data.song.spotifyUrl, "", "optional URL can be cleared");
    eq(edited.data.song.tempoBpm, null, "tempo can be cleared");
    eq(
      (
        await api({
          action: "save-key",
          id: "song_qa",
          expectedVersion: 1,
          preferredKey: "G",
        })
      ).status,
      409,
      "stale team key refused",
    );
    saved = await api({
      action: "save-key",
      id: "song_qa",
      expectedVersion: 2,
      preferredKey: "F",
    });
    eq(saved.status, 200, "save team key");
    eq(saved.data.song.originalKey, "C", "original key preserved");
    eq(
      saved.data.song.chordsLyrics,
      lyrics + "\n[C]Fim",
      "transposition never rewrites canonical source",
    );
    const fresh = await api({ action: "snapshot" }, memberToken);
    eq(
      fresh.data.songs[0].preferredKey,
      "F",
      "saved key survives fresh request",
    );
    eq(fresh.data.canManage, false, "member snapshot is read-only");
    const mobileSongs = (
      await fetchWorshipSongs(config, { organizationId: org })
    ).map(mobileWorshipSong);
    eq(mobileSongs[0].key, "F", "actual mobile repository loads team key");
    eq(
      mobileSongs[0].originalKey,
      "C",
      "actual mobile repository keeps source key",
    );
    eq(
      mobileSongs[0].lyrics.includes("[C]"),
      false,
      "lyrics mode strips chords",
    );
    eq(
      mobileSongs[0].chords,
      lyrics + "\n[C]Fim",
      "mobile has complete saved source",
    );
    let denied = false;
    try {
      await setDoc(
        doc(getFirebaseFirestore(config), `${root}/worshipSongs/unauthorized`),
        draft,
      );
    } catch {
      denied = true;
    }
    eq(denied, true, "Firestore rules prevent member writes");
    await db
      .doc(`${root}/events/event_qa`)
      .set({
        id: "event_qa",
        organizationId: org,
        name: "Ensaio fictício",
        startsAt: "2026-11-07T22:00:00Z",
        status: "published",
      });
    const list = {
      action: "save-setlist",
      eventId: "event_qa",
      expectedUpdatedAt: "",
      songs: [
        { songId: "song_qa", selectedKey: "G" },
        { songId: "song_qa", selectedKey: "D" },
      ],
    };
    let planned = await api(list);
    eq(planned.status, 200, JSON.stringify(planned.data));
    eq(
      planned.data.setlist.songs.map((s: any) => s.sortOrder),
      [0, 1],
      "order assigned server-side",
    );
    eq((await api(list)).status, 409, "stale event edit refused");
    eq(
      (await api({ ...list, eventId: "foreign_event" })).status,
      404,
      "foreign event refused",
    );
    eq(
      (
        await api({
          ...list,
          expectedUpdatedAt: planned.data.setlist.updatedAt,
          songs: [{ songId: "missing", selectedKey: "C" }],
        })
      ).status,
      400,
      "missing song refused",
    );
    const mobileSet = await fetchWorshipSetlistByEventId(
      config,
      { organizationId: org },
      "event_qa",
    );
    eq(
      mobileSet?.songs.map((s) => s.selectedKey),
      ["G", "D"],
      "actual mobile repository sees event keys",
    );
    eq(
      mobileWorshipProgram(mobileSongs, mobileSet!.songs).map(
        (x) => x.song.key,
      ),
      ["G", "D"],
      "tap model opens each song in event key",
    );
    eq(mobileSongs[0].key, "F", "event does not overwrite library key");
    const converted = importWorshipText("C     G/B\nPaz e voz");
    eq(
      worshipLyrics(converted.text),
      "Paz e voz",
      "imported classic chart keeps lyric text",
    );
    eq(
      parseWorshipChart(converted.text, "C", "D")[0].kind,
      "music",
      "imported chart is transposable",
    );
    await db
      .doc(`${root}/settings/features`)
      .set({ modules: { volunteers: { enabled: false } } });
    eq((await api({ action: "snapshot" })).status, 403, "paused module denied");
    console.log(
      JSON.stringify({
        ok: true,
        checks,
        scope:
          "fictional Auth/Firestore emulators; real mobile SDK/repositories; no external music, messages, payments or publication",
      }),
    );
  } finally {
    await signOutFromFirebaseMobile(config).catch(() => {});
    await terminate(getFirebaseFirestore(config)).catch(() => {});
    await db.recursiveDelete(db.doc(root));
    for (const uid of [admin, member])
      await auth.deleteUser(uid).catch(() => {});
    console.log("Own isolated worship fixtures removed.");
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
