/* global Vibrant, ColorThief */
(() => {
    const THEME_CLASS = 'theme-transition';
    const TRANSITION_MS = 320;

    let albumArtEl = null;
    let dynamicEnabled = true;

    const ThemeEngine = {
        init(options = {}) {
            albumArtEl = options.albumArtEl || document.getElementById('albumArt');
        },
        setMode(mode) {
            document.documentElement.setAttribute('data-mode', mode);
        },
        setThemePreset(name) {
            document.documentElement.setAttribute('data-theme', name);
        },
        setDynamicEnabled(enabled) {
            dynamicEnabled = Boolean(enabled);
        },
        async applyVibrantFromImage(img) {
            if (!dynamicEnabled || !img) return;
            const palette = await getPalette(img);
            if (!palette) return;
            applyPalette(palette);
        },
        async applyVibrantFromUrl(url) {
            if (!dynamicEnabled || !url) return;
            const img = await loadImage(url);
            if (!img) return;
            return this.applyVibrantFromImage(img);
        },
        clearDynamicPalette() {
            const root = document.documentElement.style;
            root.removeProperty('--ui-accent');
            root.removeProperty('--ui-accent-2');
            root.removeProperty('--ui-progress-fill');
            root.removeProperty('--ui-glow');
            root.removeProperty('--ui-bg');
            root.removeProperty('--ui-surface');
            root.removeProperty('--ui-surface-2');
        }
    };

    function withTransition(fn) {
        const root = document.documentElement;
        root.classList.add(THEME_CLASS);
        fn();
        window.setTimeout(() => root.classList.remove(THEME_CLASS), TRANSITION_MS);
    }

    async function getPalette(img) {
        if (window.Vibrant) {
            try {
                const palette = await new Vibrant(img).getPalette();
                return {
                    accent: swatchToRgb(palette.Vibrant || palette.Muted),
                    accent2: swatchToRgb(palette.LightVibrant || palette.LightMuted),
                    bg: swatchToRgb(palette.DarkMuted || palette.DarkVibrant),
                    surface: swatchToRgb(palette.Muted || palette.DarkMuted)
                };
            } catch (err) {
                return null;
            }
        }

        if (window.ColorThief) {
            try {
                const colorThief = new ColorThief();
                const [primary, secondary] = colorThief.getPalette(img, 2);
                return {
                    accent: rgbArrayToCss(primary),
                    accent2: rgbArrayToCss(secondary || primary),
                    bg: rgbArrayToCss(darken(primary, 0.7)),
                    surface: rgbArrayToCss(darken(primary, 0.85))
                };
            } catch (err) {
                return null;
            }
        }

        return null;
    }

    function applyPalette(palette) {
        withTransition(() => {
            const root = document.documentElement.style;
            if (palette.accent) root.setProperty('--ui-accent', palette.accent);
            if (palette.accent2) root.setProperty('--ui-accent-2', palette.accent2);
            if (palette.bg) root.setProperty('--ui-bg', palette.bg);
            if (palette.surface) {
                root.setProperty('--ui-surface', palette.surface);
                root.setProperty('--ui-surface-2', lightenCss(palette.surface, 0.08));
            }
            root.setProperty('--ui-progress-fill', palette.accent || 'var(--ui-accent)');
            root.setProperty('--ui-glow', glowFrom(palette.accent || '#00b3ff'));
        });
    }

    function swatchToRgb(swatch) {
        if (!swatch) return null;
        const rgb = swatch.getRgb();
        return rgbArrayToCss(rgb);
    }

    function rgbArrayToCss(rgb) {
        if (!rgb) return null;
        const [r, g, b] = rgb.map(v => Math.round(v));
        return `rgb(${r} ${g} ${b})`;
    }

    function darken(rgb, amount) {
        return rgb.map(v => Math.max(0, v * amount));
    }

    function lightenCss(css, amount) {
        const match = css.match(/(\d+)\s+(\d+)\s+(\d+)/);
        if (!match) return css;
        const [r, g, b] = match.slice(1).map(Number);
        const nr = Math.min(255, Math.round(r + (255 - r) * amount));
        const ng = Math.min(255, Math.round(g + (255 - g) * amount));
        const nb = Math.min(255, Math.round(b + (255 - b) * amount));
        return `rgb(${nr} ${ng} ${nb})`;
    }

    function glowFrom(css) {
        return css.replace('rgb(', 'rgba(').replace(')', ', 0.35)');
    }

    function loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    window.ThemeEngine = ThemeEngine;
})();
