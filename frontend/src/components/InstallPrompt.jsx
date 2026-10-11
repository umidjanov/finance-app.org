import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isInAppBrowser =
    /Instagram|FB|Twitter|Telegram|FBAN|FBAV/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Android") &&
      !navigator.userAgent.includes("Chrome"));

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    });

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && !isInStandaloneMode && isSafari) {
      setShowIOS(true);
    }

    window.addEventListener("appinstalled", () => {
      setShowAndroid(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowAndroid(false);
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  // Telegram yoki in-app browser
  if (isInAppBrowser) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          right: "16px",
          background: "#1a2a4a",
          border: "2px solid #FCA311",
          borderRadius: "16px",
          padding: "16px",
          zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <span style={{ fontSize: "32px" }}>💰</span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                color: "#FCA311",
                fontWeight: "bold",
                margin: "0 0 8px 0",
                fontSize: "14px",
              }}
            >
              📲 Ilovani o'rnatish uchun:
            </p>
            <p
              style={{
                color: "#E5E5E5",
                fontSize: "13px",
                margin: "0 0 12px 0",
                opacity: 0.8,
              }}
            >
              Chrome da oching → Menyu (⋮) → "Add to Home Screen"
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() =>
                  window.open("https://finance-app-nj6h.vercel.app", "_blank")
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#FCA311",
                  color: "#14213D",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                🌐 Chrome da ochish
              </button>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  padding: "10px 14px",
                  background: "transparent",
                  color: "#E5E5E5",
                  border: "1px solid #ffffff30",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/iOS install prompt
  if (!showAndroid && !showIOS) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        background: "#1a2a4a",
        border: "2px solid #FCA311",
        borderRadius: "16px",
        padding: "16px",
        zIndex: 9999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <span style={{ fontSize: "32px" }}>💰</span>
        <div style={{ flex: 1 }}>
          <p
            style={{
              color: "#FCA311",
              fontWeight: "bold",
              margin: "0 0 4px 0",
              fontSize: "14px",
            }}
          >
            Finance App ni o'rnating!
          </p>

          {showAndroid && (
            <>
              <p
                style={{
                  color: "#E5E5E5",
                  fontSize: "12px",
                  margin: "0 0 12px 0",
                  opacity: 0.8,
                }}
              >
                Telefoningizga o'rnatib, tezroq ishlating!
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleAndroidInstall}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#FCA311",
                    color: "#14213D",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  📲 O'rnatish
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  style={{
                    padding: "10px 14px",
                    background: "transparent",
                    color: "#E5E5E5",
                    border: "1px solid #ffffff30",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  ✕
                </button>
              </div>
            </>
          )}

          {showIOS && (
            <>
              <p
                style={{
                  color: "#E5E5E5",
                  fontSize: "12px",
                  margin: "0 0 8px 0",
                  opacity: 0.8,
                }}
              >
                Safari da o'rnatish uchun:
              </p>
              <p
                style={{
                  color: "#FCA311",
                  fontSize: "13px",
                  margin: "0 0 12px 0",
                }}
              >
                1. Pastdagi <b>↑ Share</b> tugmasini bosing
                <br />
                2. <b>"Add to Home Screen"</b> tanlang
              </p>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#FCA311",
                  color: "#14213D",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Tushunarli ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
