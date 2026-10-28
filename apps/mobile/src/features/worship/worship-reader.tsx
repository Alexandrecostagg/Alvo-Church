import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AppState,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { parseWorshipChart, worshipShapeKey, WORSHIP_KEYS } from "@alvo/domain";
import { secureAuthStorage } from "../session/secure-auth-storage";
export function MobileWorshipReader({
  song,
  primary,
  header,
  storageKey,
}: {
  song: {
    id: string;
    title: string;
    artist: string;
    key: string;
    originalKey: string;
    bpm: number;
    chords: string;
  };
  primary: string;
  header: ReactNode;
  storageKey: string;
}) {
  const [key, setKey] = useState(song.key),
    [font, setFont] = useState(18),
    [capo, setCapo] = useState(0),
    [lyricsOnly, setLyricsOnly] = useState(false),
    [ready, setReady] = useState(""),
    [scroll, setScroll] = useState(false);
  const reader = useRef<ScrollView>(null),
    offset = useRef(0),
    height = useRef(0),
    viewport = useRef(0);
  const preferenceKey = `worship-reading:${storageKey}`;
  useEffect(() => {
    setKey(song.key);
    setScroll(false);
    offset.current = 0;
    reader.current?.scrollTo({ y: 0, animated: false });
  }, [song.id, song.key]);
  useEffect(() => {
    let active = true;
    setReady("");
    void secureAuthStorage
      .getItem(preferenceKey)
      .then((raw) => {
        if (!active) return;
        try {
          const v = JSON.parse(raw || "{}");
          setFont(
            Number.isInteger(v.font) && v.font >= 14 && v.font <= 30
              ? v.font
              : 18,
          );
          setCapo(
            Number.isInteger(v.capo) && v.capo >= 0 && v.capo <= 11
              ? v.capo
              : 0,
          );
          setLyricsOnly(v.lyricsOnly === true);
        } catch {}
        setReady(preferenceKey);
      })
      .catch(() => {
        if (active) setReady(preferenceKey);
      });
    return () => {
      active = false;
    };
  }, [preferenceKey]);
  useEffect(() => {
    if (ready === preferenceKey)
      void secureAuthStorage
        .setItem(preferenceKey, JSON.stringify({ font, capo, lyricsOnly }))
        .catch(() => {});
  }, [preferenceKey, ready, font, capo, lyricsOnly]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") setScroll(false);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!scroll) return;
    const timer = setInterval(() => {
      if (offset.current + viewport.current >= height.current - 1) {
        setScroll(false);
        return;
      }
      offset.current += 2.5;
      reader.current?.scrollTo({ y: offset.current, animated: false });
    }, 100);
    return () => clearInterval(timer);
  }, [scroll]);
  const button = (label: string, action: () => void, selected = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={action}
      style={{
        minHeight: 44,
        minWidth: 44,
        borderRadius: 8,
        padding: 11,
        borderWidth: 1,
        borderColor: selected ? primary : "#cbd5e1",
        backgroundColor: selected ? primary : "#fff",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: selected ? "#fff" : "#17202b",
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1, backgroundColor: "#fffefb" }}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        style={{ maxHeight: 260 }}
      >
        <Text style={{ fontSize: 19, fontWeight: "700", color: "#17202b" }}>
          {song.title}
        </Text>
        <Text style={{ color: "#475569" }}>
          {song.artist}
          {song.bpm ? ` · ${song.bpm} BPM` : ""}
        </Text>
        <Text style={{ color: "#17202b" }}>
          Original {song.originalKey} · Equipe/evento {song.key} · Som {key}
          {capo
            ? ` · Capo ${capo} · Acordes ${worshipShapeKey(key, capo)}`
            : ""}
        </Text>
        <Text style={{ fontSize: 12, color: "#475569" }}>
          Tom alterado é uma prévia pessoal. O tom da equipe é salvo no painel.
        </Text>
        <ScrollView
          horizontal
          contentContainerStyle={{ gap: 7 }}
          accessibilityLabel="Tons de leitura"
        >
          {WORSHIP_KEYS.map((k) =>
            song.originalKey.endsWith("m") ? `${k}m` : k,
          ).map((k) => (
            <View key={k}>{button(k, () => setKey(k), key === k)}</View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {button("A−", () => setFont((n) => Math.max(14, n - 2)))}
          {button("A+", () => setFont((n) => Math.min(30, n + 2)))}
          {button(lyricsOnly ? "Mostrar cifras" : "Somente letra", () =>
            setLyricsOnly((v) => !v),
          )}
          {button(capo ? `Capo ${capo}` : "Sem capo", () =>
            setCapo((n) => (n + 1) % 12),
          )}
          {button(
            scroll ? "Pausar rolagem" : "Rolar cifra",
            () => setScroll((v) => !v),
            scroll,
          )}
        </View>
      </ScrollView>
      <ScrollView
        ref={reader}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
        onScrollBeginDrag={() => setScroll(false)}
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, h) => {
          height.current = h;
        }}
      >
        {!song.chords ? (
          <Text>Cifra ainda não cadastrada.</Text>
        ) : (
          parseWorshipChart(song.chords, song.originalKey, key, capo).map(
            (line, i) =>
              line.kind === "blank" ? (
                <View key={i} style={{ height: font * 0.65 }} />
              ) : line.kind !== "music" ? (
                <Text
                  key={i}
                  style={{
                    fontSize: font * 0.9,
                    color: "#6b3c19",
                    fontWeight: line.kind === "section" ? "700" : "400",
                    marginTop: 14,
                    marginBottom: 8,
                  }}
                >
                  {line.text}
                </Text>
              ) : (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    minHeight: lyricsOnly ? font * 1.6 : font * 2.9,
                  }}
                >
                  {line.words.map((word, j) => (
                    <View
                      key={j}
                      style={{ flexDirection: "row", alignItems: "flex-end" }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "flex-end" }}
                      >
                        {word.parts.map((part, k) => (
                          <View key={k}>
                            <Text
                              style={{
                                fontSize: font * 0.94,
                                lineHeight: font * 1.35,
                                fontWeight: "700",
                                fontFamily:
                                  Platform.OS === "ios" ? "Menlo" : "monospace",
                                color: "#94420e",
                                display: lyricsOnly ? "none" : "flex",
                                paddingRight: part.chord ? 4 : 0,
                              }}
                            >
                              {part.chord || "\u00a0"}
                            </Text>
                            <Text
                              style={{
                                fontSize: font,
                                lineHeight: font * 1.5,
                                fontFamily:
                                  Platform.OS === "ios" ? "Menlo" : "monospace",
                                color: "#17202b",
                              }}
                            >
                              {part.text || (!lyricsOnly ? "\u00a0" : "")}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <Text
                        style={{
                          fontSize: font,
                          lineHeight: font * 1.5,
                          fontFamily:
                            Platform.OS === "ios" ? "Menlo" : "monospace",
                        }}
                      >
                        {word.spaceAfter}
                      </Text>
                    </View>
                  ))}
                </View>
              ),
          )
        )}
      </ScrollView>
    </View>
  );
}
