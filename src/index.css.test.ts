import { describe, expect, it } from "vitest"
import css from "./index.css?raw"
import main from "./main.tsx?raw"

const tokens: Record<string, string> = {
  "--papel": "#F4F1EA",
  "--superficie": "#FFFDF8",
  "--superficie-2": "#EFEBE3",
  "--linea": "#DDD8CE",
  "--tinta": "#1A1814",
  "--tinta-suave": "#6B6560",
  "--teal": "#0F5C57",
  "--teal-hover": "#0C4A46",
  "--teal-suave": "#E5F2F1",
  "--ok": "#1F6B3A",
  "--ok-suave": "#E7F3EC",
  "--aviso": "#8A5A12",
  "--aviso-suave": "#F8F0E0",
  "--error": "#9F2D2D",
  "--error-suave": "#F8E8E8",
  "--radio-tarjeta": "10px",
  "--radio-control": "8px",
}

describe("variables del diseño", () => {
  it("define los colores, la fuente, el cuerpo a 16 px y los radios", () => {
    for (const [name, value] of Object.entries(tokens)) {
      expect(css).toContain(`${name}: ${value}`)
    }
    expect(css).toContain('font-family: "IBM Plex Sans Variable", "IBM Plex Sans", sans-serif')
    expect(css).toMatch(/font-size:\s*16px/)
  })

  it("importa el paquete de IBM Plex Sans", async () => {
    expect(main).toContain("@fontsource-variable/ibm-plex-sans")
    await import("@fontsource-variable/ibm-plex-sans")
  })
})
