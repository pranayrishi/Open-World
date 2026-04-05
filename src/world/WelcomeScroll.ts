export class WelcomeScroll {
  show(): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.innerHTML = `
        <div id="scroll-backdrop" style="
          position: fixed; inset: 0; z-index: 8000;
          background: rgba(0, 0, 0, 0.7);
          display: flex; align-items: center; justify-content: center;
          animation: scrollFadeIn 0.6s ease;
          cursor: pointer;
        ">
          <div id="scroll-parchment" style="
            background: linear-gradient(135deg, #f4e4c1 0%, #e8d5a3 30%, #f0e0b8 70%, #e5d09a 100%);
            border-radius: 8px;
            padding: 40px 48px;
            max-width: 520px;
            width: 90vw;
            box-shadow:
              0 8px 40px rgba(0, 0, 0, 0.5),
              inset 0 0 60px rgba(139, 109, 56, 0.15),
              0 0 0 1px rgba(139, 109, 56, 0.3);
            position: relative;
            animation: scrollSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            text-align: center;
          ">
            <div style="
              font-size: 1.4rem; color: #8b6d38; margin-bottom: 8px;
              letter-spacing: 0.5em; opacity: 0.5;
            ">~ * ~</div>

            <h1 style="
              font-family: Georgia, 'Palatino Linotype', serif;
              font-size: 1.8rem;
              color: #3d2b1f;
              margin: 0 0 16px 0;
              font-weight: normal;
              letter-spacing: 0.08em;
            ">Welcome, Traveler</h1>

            <div style="
              width: 60px; height: 1px; margin: 0 auto 20px;
              background: linear-gradient(90deg, transparent, #8b6d38, transparent);
            "></div>

            <p style="
              font-family: Georgia, 'Palatino Linotype', serif;
              font-size: 1.05rem;
              line-height: 1.7;
              color: #4a3728;
              margin: 0 0 24px 0;
            ">
              You've entered a world built entirely from code — every mountain,
              river, and blade of grass was conjured from nothing but math and
              imagination. Wander freely, discover three distinct lands, and
              meet the characters who call this place home.
            </p>

            <div style="
              width: 40px; height: 1px; margin: 0 auto 16px;
              background: linear-gradient(90deg, transparent, #8b6d38, transparent);
            "></div>

            <p style="
              font-family: Georgia, 'Palatino Linotype', serif;
              font-size: 0.85rem;
              color: #7a6548;
              margin: 0 0 6px 0;
              font-style: italic;
            ">A creation by</p>
            <p style="
              font-family: Georgia, 'Palatino Linotype', serif;
              font-size: 1.1rem;
              color: #3d2b1f;
              margin: 0 0 24px 0;
              font-weight: bold;
              letter-spacing: 0.05em;
            ">Pranay Rishi Nalem</p>

            <p style="
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 0.75rem;
              color: #a08c6c;
              margin: 0;
              letter-spacing: 0.1em;
              text-transform: uppercase;
            ">Press any key or click to begin</p>

            <div style="
              font-size: 1.4rem; color: #8b6d38; margin-top: 8px;
              letter-spacing: 0.5em; opacity: 0.5;
            ">~ * ~</div>
          </div>
        </div>

        <style>
          @keyframes scrollFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scrollSlideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes scrollFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes scrollSlideDown {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(20px) scale(0.97); }
          }
        </style>
      `;

      document.body.appendChild(overlay);

      const dismiss = () => {
        const backdrop = document.getElementById("scroll-backdrop");
        const parchment = document.getElementById("scroll-parchment");
        if (backdrop)
          backdrop.style.animation = "scrollFadeOut 0.4s ease forwards";
        if (parchment)
          parchment.style.animation = "scrollSlideDown 0.4s ease forwards";

        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 400);

        document.removeEventListener("keydown", dismiss);
        document.removeEventListener("click", dismiss);
      };

      setTimeout(() => {
        document.addEventListener("keydown", dismiss, { once: true });
        document.addEventListener("click", dismiss, { once: true });
      }, 800);
    });
  }
}
