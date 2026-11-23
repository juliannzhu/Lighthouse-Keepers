using System;
using UnityEngine;
using UnityEngine.InputSystem;
using LighthouseKeepers.DesignSystem;

namespace LighthouseKeepers.Tutorials
{
    /// <summary>Calm Waters warm-up: no boats, no score, and a gentle beam controlled by attention.</summary>
    public sealed class CalmWatersTutorial : MonoBehaviour
    {
        [SerializeField] private string themeId = LighthousePaletteCatalog.DefaultTheme;
        [SerializeField, Min(0.1f)] private float beamEaseSeconds = 0.85f;
        [SerializeField, Min(1f)] private float pixelsPerUnit = 50f;
        [SerializeField, Min(1f)] private float practiceSecondsToFinish = 12f;

        private const int Width = 240;
        private const int Height = 135;
        private static readonly int[,] BayerMatrix =
        {
            { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 }
        };
        private readonly Color32[] pixels = new Color32[Width * Height];
        private Texture2D sceneTexture;
        private SpriteRenderer sceneRenderer;
        private GameObject sceneVisual;
        private float attention = 0.08f;
        private float practiceSeconds;
        private bool started;
        private bool finished;
        private GUIStyle panelStyle;
        private GUIStyle headingStyle;
        private GUIStyle bodyStyle;
        private GUIStyle buttonStyle;

        private void Start()
        {
            BuildSceneImage();
        }

        private void Update()
        {
            if (!Application.isPlaying) return;
            bool spaceHeld = Keyboard.current != null && Keyboard.current.spaceKey.isPressed;
            float target = spaceHeld ? 0.82f : 0.08f;
            float ease = 1f - Mathf.Exp(-Time.deltaTime / Mathf.Max(0.1f, beamEaseSeconds));
            attention = Mathf.Lerp(attention, target, ease);

            if (started && !finished && spaceHeld)
                practiceSeconds += Time.deltaTime;

            if (sceneTexture != null)
                RenderHarbour();
        }

        private void BuildSceneImage()
        {
            sceneTexture = new Texture2D(Width, Height, TextureFormat.RGBA32, false)
            {
                name = "Calm Waters pixel scene",
                filterMode = FilterMode.Point,
                wrapMode = TextureWrapMode.Clamp
            };

            var image = Sprite.Create(sceneTexture, new Rect(0, 0, Width, Height),
                new Vector2(0.5f, 0.5f), pixelsPerUnit);
            image.name = "Calm Waters harbour";

            sceneVisual = new GameObject("Calm Waters Pixel Art");
            sceneRenderer = sceneVisual.AddComponent<SpriteRenderer>();
            sceneRenderer.sprite = image;
            sceneRenderer.sortingOrder = -10;
            sceneVisual.transform.position = Vector3.zero;
            RenderHarbour();
        }

        private void RenderHarbour()
        {
            Color skyDeep = ColorFor("sky-deep", new Color32(20, 28, 46, 255));
            Color sky = ColorFor("sky", new Color32(36, 50, 79, 255));
            Color sea = ColorFor("sea", new Color32(34, 64, 92, 255));
            Color seaDeep = ColorFor("sea-deep", new Color32(22, 36, 58, 255));
            Color seaLight = ColorFor("sea-light", new Color32(59, 101, 133, 255));
            Color crest = ColorFor("crest", new Color32(127, 163, 186, 255));
            Color fog = ColorFor("fog", new Color32(108, 125, 148, 255));
            Color fogThick = ColorFor("fog-thick", new Color32(163, 177, 196, 255));
            Color beam = ColorFor("beam", new Color32(242, 212, 138, 255));
            Color beamCore = ColorFor("beam-core", new Color32(255, 246, 220, 255));
            Color lamp = ColorFor("lamp", new Color32(224, 168, 90, 255));
            Color outline = ColorFor("outline", new Color32(12, 18, 32, 255));
            Color tower = ColorFor("tower", new Color32(232, 228, 218, 255));
            Color stripe = ColorFor("stripe", new Color32(181, 88, 74, 255));
            Color roof = ColorFor("roof", new Color32(43, 50, 71, 255));
            Color land = ColorFor("land", new Color32(44, 56, 56, 255));
            Color grass = ColorFor("grass", new Color32(79, 106, 87, 255));
            Color hull = ColorFor("hull", new Color32(138, 90, 60, 255));
            Color hullDark = ColorFor("hull-dark", new Color32(94, 61, 43, 255));
            Color star = ColorFor("star", new Color32(201, 212, 230, 255));

            for (int y = 0; y < Height; y++)
            for (int x = 0; x < Width; x++)
            {
                Color color;
                if (y < 49)
                    color = Dither(skyDeep, sky, x, y, y / 49f);
                else
                {
                    float waterDepth = Mathf.InverseLerp(49, Height, y);
                    color = Dither(sea, seaDeep, x, y, waterDepth * 0.78f);
                    if ((y % 6 == 2) && ((x + y * 3) % 9 < 3) && Hash(x, y) > 0.36f)
                        color = y < 64 ? crest : seaLight;
                }

                if (y < 43 && Hash(x, y + 41) > 0.987f)
                    color = star;

                // Calm, horizontal fog banks; the moving beam clears them with ordered dithering.
                if (y >= 41 && y < 91)
                {
                    float band = Mathf.Clamp01(0.32f + 0.34f * Mathf.Sin((y + 3f * Mathf.Sin(x / 24f)) * 0.28f));
                    if (Hash(x / 3, y / 2) < band * 0.50f)
                        color = Hash(x / 2, y / 3 + 17) > 0.78f ? fogThick : fog;
                }

                color = ApplyBeam(color, x, y, beam, beamCore, lamp);
                pixels[(Height - 1 - y) * Width + x] = color;
            }

            // Low island, dock and classic striped tower, all drawn on the 240 × 135 art grid.
            FillPixels(pixels, 0, 76, 88, 18, outline);
            FillPixels(pixels, 2, 75, 82, 15, land);
            FillPixels(pixels, 5, 73, 75, 4, grass);
            FillPixels(pixels, 61, 83, 28, 3, hullDark);
            FillPixels(pixels, 64, 81, 23, 2, hull);
            FillPixels(pixels, 65, 84, 2, 6, hullDark);
            FillPixels(pixels, 83, 84, 2, 6, hullDark);

            FillPixels(pixels, 31, 34, 19, 37, outline);
            FillPixels(pixels, 33, 36, 15, 34, tower);
            for (int y = 39; y < 69; y += 6)
                FillPixels(pixels, 33, y, 15, 2, stripe);
            FillPixels(pixels, 30, 33, 21, 3, roof);
            FillPixels(pixels, 34, 28, 13, 6, outline);
            FillPixels(pixels, 36, 29, 9, 4, roof);
            FillPixels(pixels, 36, 37, 9, 8, outline);
            FillPixels(pixels, 37, 38, 7, 6, lamp);
            FillPixels(pixels, 39, 39, 3, 4, beamCore);

            sceneTexture.SetPixels32(pixels);
            sceneTexture.Apply(false, false);
        }

        private Color ApplyBeam(Color water, int x, int y, Color beam, Color core, Color lamp)
        {
            float dx = x - 40f;
            float dy = y - 41f;
            float distance = Mathf.Sqrt(dx * dx + dy * dy);
            float angle = Mathf.Atan2(dy, dx) - 0.28f;
            float halfAngle = 0.035f + 0.30f * attention;
            float length = Width * (0.32f + 0.78f * attention);
            float cone = (distance > 0.1f && distance < length && Mathf.Abs(angle) < halfAngle)
                ? Mathf.Clamp01((1f - Mathf.Abs(angle) / halfAngle) * (1f - distance / length) + 0.20f)
                : 0f;
            float glow = Mathf.Clamp01(1f - distance / (4f + 10f * attention));
            float strength = Mathf.Max(cone * Mathf.Clamp01((attention - 0.08f) / 0.17f), glow);
            if (strength > 0.76f && attention > 0.5f && Bayer(x, y) > 0.18f) return core;
            if (strength > 0.35f && Bayer(x, y) < 0.70f) return beam;
            if (strength > 0.06f && Bayer(x, y) < 0.38f) return Color.Lerp(water, beam, 0.38f);
            if (distance < 3f && Bayer(x, y) < 0.52f) return lamp;
            return water;
        }

        private Color ColorFor(string role, Color fallback)
        {
            Color result;
            return LighthousePaletteCatalog.TryGetColor(themeId, role, out result) ? result : fallback;
        }

        private static Color Dither(Color a, Color b, int x, int y, float amount)
        {
            return Bayer(x, y) < amount ? b : a;
        }

        private static float Bayer(int x, int y)
        {
            return (BayerMatrix[y & 3, x & 3] + 0.5f) / 16f;
        }

        private static float Hash(int x, int y)
        {
            unchecked
            {
                int value = x * 374761393 + y * 668265263;
                value = (value ^ (value >> 13)) * 1274126177;
                value ^= value >> 16;
                return (value & 0x7fffffff) / (float)int.MaxValue;
            }
        }

        private static void FillPixels(Color32[] target, int x, int y, int width, int height, Color color)
        {
            Color32 pixel = color;
            for (int py = Mathf.Max(0, y); py < Mathf.Min(Height, y + height); py++)
            for (int px = Mathf.Max(0, x); px < Mathf.Min(Width, x + width); px++)
                target[(Height - 1 - py) * Width + px] = pixel;
        }

        private void EnsureStyles()
        {
            if (panelStyle != null) return;
            panelStyle = new GUIStyle(GUI.skin.box)
            {
                alignment = TextAnchor.MiddleLeft,
                fontSize = Mathf.Max(16, Screen.height / 38),
                wordWrap = true,
                padding = new RectOffset(18, 18, 12, 12)
            };
            panelStyle.normal.textColor = ColorFor("ink", Color.white);
            headingStyle = new GUIStyle(panelStyle) { fontSize = Mathf.Max(22, Screen.height / 27), fontStyle = FontStyle.Bold };
            bodyStyle = new GUIStyle(panelStyle) { fontSize = Mathf.Max(16, Screen.height / 42) };
            buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = Mathf.Max(18, Screen.height / 36),
                fontStyle = FontStyle.Bold,
                padding = new RectOffset(22, 22, 12, 12)
            };
            buttonStyle.normal.textColor = ColorFor("on-accent", Color.black);
        }

        private void OnGUI()
        {
            if (!Application.isPlaying) return;
            EnsureStyles();
            Color raised = ColorFor("surface-raised", new Color32(31, 43, 69, 255));
            Color accent = ColorFor("accent", new Color32(242, 212, 138, 255));
            Color ink = ColorFor("ink", Color.white);
            float scale = Mathf.Max(1f, Screen.height / 540f);
            float margin = 16f * scale;

            GUI.color = raised;
            GUI.Box(new Rect(margin, margin, 210f * scale, 54f * scale), GUIContent.none);
            GUI.color = ink;
            GUI.Label(new Rect(margin + 12f * scale, margin + 5f * scale, 190f * scale, 44f * scale),
                "Calm Waters", headingStyle);

            if (!started)
            {
                DrawWelcome(raised, accent, ink, scale);
                return;
            }

            string lampState = attention > 0.48f ? "The light is widening gently." : "The lamp keeps a soft glow.";
            DrawGuide(raised, ink, lampState, scale);

            if (!finished && practiceSeconds >= practiceSecondsToFinish)
                DrawContinue(raised, accent, ink, scale);
            else if (!finished)
                DrawSpaceHint(raised, ink, scale);
            else
                DrawFinished(raised, ink, scale);
        }

        private void DrawWelcome(Color raised, Color accent, Color ink, float scale)
        {
            float width = Mathf.Min(560f * scale, Screen.width - 32f * scale);
            Rect panel = new Rect((Screen.width - width) * 0.5f, Screen.height * 0.31f, width, 220f * scale);
            GUI.color = raised;
            GUI.Box(panel, GUIContent.none);
            GUI.color = ink;
            GUI.Label(new Rect(panel.x + 22f * scale, panel.y + 18f * scale, width - 44f * scale, 46f * scale),
                "A quiet start to the night", headingStyle);
            GUI.Label(new Rect(panel.x + 22f * scale, panel.y + 72f * scale, width - 44f * scale, 60f * scale),
                "Sit tall and keep your eyes on the light. The harbour is calm; there are no boats yet.", bodyStyle);
            GUI.color = accent;
            if (GUI.Button(new Rect(panel.x + 22f * scale, panel.y + 145f * scale, width - 44f * scale, 54f * scale),
                "Begin Calm Waters", buttonStyle))
                started = true;
            GUI.color = Color.white;
        }

        private void DrawGuide(Color raised, Color ink, string message, float scale)
        {
            float width = Mathf.Min(340f * scale, Screen.width - 32f * scale);
            Rect box = new Rect(Screen.width - width - 16f * scale, Screen.height - 88f * scale,
                width, 68f * scale);
            GUI.color = raised;
            GUI.Box(box, GUIContent.none);
            GUI.color = ink;
            GUI.Label(new Rect(box.x + 10f * scale, box.y + 4f * scale, width - 20f * scale, box.height - 8f * scale),
                message, bodyStyle);
            GUI.color = Color.white;
        }

        private void DrawSpaceHint(Color raised, Color ink, float scale)
        {
            Rect box = new Rect(16f * scale, Screen.height - 72f * scale, 350f * scale, 52f * scale);
            GUI.color = raised;
            GUI.Box(box, GUIContent.none);
            GUI.color = ink;
            GUI.Label(new Rect(box.x + 10f * scale, box.y + 3f * scale, box.width - 20f * scale, box.height - 6f * scale),
                "Hold Space to brighten the beam. Release to rest.", bodyStyle);
            GUI.color = Color.white;
        }

        private void DrawContinue(Color raised, Color accent, Color ink, float scale)
        {
            float width = Mathf.Min(450f * scale, Screen.width - 32f * scale);
            Rect panel = new Rect((Screen.width - width) * 0.5f, Screen.height - 104f * scale,
                width, 82f * scale);
            GUI.color = raised;
            GUI.Box(panel, GUIContent.none);
            GUI.color = ink;
            GUI.Label(new Rect(panel.x + 12f * scale, panel.y + 4f * scale, width * 0.48f, 70f * scale),
                "The harbour is ready.", bodyStyle);
            GUI.color = accent;
            if (GUI.Button(new Rect(panel.x + width * 0.52f, panel.y + 12f * scale, width * 0.44f, 56f * scale),
                "Finish Calm Waters", buttonStyle))
                finished = true;
            GUI.color = Color.white;
        }

        private void DrawFinished(Color raised, Color ink, float scale)
        {
            Rect box = new Rect(16f * scale, Screen.height - 72f * scale, 360f * scale, 52f * scale);
            GUI.color = raised;
            GUI.Box(box, GUIContent.none);
            GUI.color = ink;
            GUI.Label(new Rect(box.x + 10f * scale, box.y + 3f * scale, box.width - 20f * scale, box.height - 6f * scale),
                "Together, you are ready for the first tide.", bodyStyle);
            GUI.color = Color.white;
        }

        private void OnDestroy()
        {
            if (sceneRenderer != null && sceneRenderer.sprite != null)
                Destroy(sceneRenderer.sprite);
            if (sceneTexture != null)
                Destroy(sceneTexture);
            if (sceneVisual != null)
                Destroy(sceneVisual);
        }
    }
}
