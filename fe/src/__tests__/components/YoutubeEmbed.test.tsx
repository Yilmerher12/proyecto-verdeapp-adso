/**
 * Archivo: __tests__/components/YoutubeEmbed.test.tsx
 * Descripción: Tests del reproductor de YouTube con "facade" (miniatura
 *              antes del iframe real) y el link de respaldo a YouTube.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { YoutubeEmbed } from "@/components/ui/YoutubeEmbed";

const URL_VALIDA = "https://www.youtube.com/watch?v=abc12345678";

describe("YoutubeEmbed", () => {
  it("muestra la miniatura y el botón de play antes de reproducir", () => {
    render(<YoutubeEmbed url={URL_VALIDA} titulo="Código de colores" />);

    expect(screen.getByRole("button", { name: /reproducir video/i })).toBeInTheDocument();
    expect(screen.queryByTitle("Código de colores")).not.toBeInTheDocument();
  });

  it("carga el iframe de youtube-nocookie.com al hacer clic en play", async () => {
    const user = userEvent.setup();
    render(<YoutubeEmbed url={URL_VALIDA} titulo="Código de colores" />);

    await user.click(screen.getByRole("button", { name: /reproducir video/i }));

    const iframe = screen.getByTitle("Código de colores");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abc12345678?autoplay=1"
    );
  });

  it("siempre muestra un link para abrir el video directo en YouTube", () => {
    render(<YoutubeEmbed url={URL_VALIDA} titulo="Código de colores" />);

    const link = screen.getByRole("link", { name: /ver en youtube/i });
    expect(link).toHaveAttribute("href", URL_VALIDA);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("si la URL no es de YouTube, muestra un link normal en vez de romper", () => {
    render(<YoutubeEmbed url="https://vimeo.com/12345" titulo="Video externo" />);

    expect(screen.queryByRole("button", { name: /reproducir/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver video/i })).toHaveAttribute(
      "href",
      "https://vimeo.com/12345"
    );
  });
});
