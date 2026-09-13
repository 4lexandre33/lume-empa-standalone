/** Browser download that survives iframe + delayed revoke. Returns false if it cannot run. */

export function triggerBrowserDownload(bytes: Uint8Array, filename: string, mime = "application/octet-stream"): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_self";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    window.setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 8000);
    return true;
  } catch {
    URL.revokeObjectURL(url);
    return false;
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
