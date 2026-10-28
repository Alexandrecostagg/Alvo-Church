import type { WorshipSong, WorshipSetlist } from "@alvo/types";
import { worshipLyrics, validWorshipKey } from "@alvo/domain";
export type MobileWorshipSong = {
  id: string;
  title: string;
  artist: string;
  key: string;
  originalKey: string;
  bpm: number;
  chords: string;
  lyrics: string;
};
export function mobileWorshipSong(song: WorshipSong): MobileWorshipSong {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    key: validWorshipKey(song.preferredKey)
      ? song.preferredKey
      : song.originalKey,
    originalKey: song.originalKey,
    bpm: song.tempoBpm || 0,
    chords: song.chordsLyrics || "",
    lyrics: worshipLyrics(song.chordsLyrics || ""),
  };
}
export function mobileWorshipProgram(
  songs: MobileWorshipSong[],
  items: WorshipSetlist["songs"],
) {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((item) => {
      const song = byId.get(item.songId);
      if (!song) return [];
      const key = validWorshipKey(item.selectedKey)
        ? item.selectedKey
        : song.key;
      return [
        {
          type: "Louvor",
          description: `${song.title} — ${key}`,
          song: { ...song, key },
        },
      ];
    })
    .map((item, i) => ({ ...item, order: i + 1 }));
}
