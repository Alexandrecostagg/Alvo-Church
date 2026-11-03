"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
export function CampaignQrScanner({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let stopped = false,
      stream: MediaStream | undefined,
      frame = 0;
    dialog.current?.showModal();
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw Error(
            "Câmera indisponível neste navegador. Use o código da pulseira.",
          );
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const canvas = document.createElement("canvas"),
          ctx = canvas.getContext("2d", { willReadFrequently: true });
        function read() {
          const v = video.current;
          if (stopped || !v || !ctx) return;
          if (v.readyState >= 2 && v.videoWidth) {
            canvas.width = Math.min(v.videoWidth, 640);
            canvas.height = Math.round(
              (v.videoHeight * canvas.width) / v.videoWidth,
            );
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
              qr = jsQR(pixels.data, canvas.width, canvas.height, {
                inversionAttempts: "dontInvert",
              });
            if (qr) {
              if (/^INV-[a-f0-9]{48}$/.test(qr.data)) {
                onCode(qr.data);
                return;
              }
              setError(
                "Este QR não é uma pulseira de campanha. Use o código INV do convite.",
              );
            }
          }
          frame = requestAnimationFrame(read);
        }
        frame = requestAnimationFrame(read);
      } catch {
        if (!stopped)
          setError(
            "Não foi possível abrir a câmera. Autorize o acesso no navegador ou use o código da pulseira.",
          );
      }
    }
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);
  return (
    <dialog
      ref={dialog}
      className="campaign-dialog"
      aria-label="Ler pulseira"
      onCancel={onClose}
    >
      <h2>Ler pulseira</h2>
      <p>
        Aponte a câmera para o QR do convidado. Você poderá conferir o código
        antes de registrar a presença.
      </p>
      <video
        ref={video}
        muted
        playsInline
        style={{
          width: "100%",
          maxHeight: 420,
          borderRadius: 12,
          background: "#173c30",
        }}
      />
      {error && (
        <p role="alert" className="campaign-notice campaign-error">
          {error}
        </p>
      )}
      <button autoFocus onClick={onClose}>
        Fechar câmera
      </button>
    </dialog>
  );
}
