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

  // ¿Qué? Issue #400 (CN-065): antes una URL que no era de YouTube caía en un
  //       link con la URL cruda; ahora no se pinta nada.
  it.each([
    "https://vimeo.com/12345",
    "javascript:alert(1)",
    "http://www.youtube.com/watch?v=abc12345678",
    "https://sitio-malo.com/?x=youtu.be/abc12345678",
  ])("si la URL no es de YouTube (%s), no pinta nada", (url) => {
    const { container } = render(<YoutubeEmbed url={url} titulo="Video externo" />);

    expect(container).toBeEmptyDOMElement();
  });

  // ¿Qué? Issue #414: el backend ya aceptaba youtube-nocookie.com.
  it("reconoce un video de youtube-nocookie.com", () => {
    render(<YoutubeEmbed url="https://www.youtube-nocookie.com/embed/abc12345678" titulo="Código de colores" />);

    expect(screen.getByRole("button", { name: /reproducir video/i })).toBeInTheDocument();
  });

  it("arma el link a YouTube con el ID del video, no con la URL que escribió el usuario", () => {
    render(<YoutubeEmbed url="https://youtu.be/abc12345678?si=rastreo" titulo="Código de colores" />);

    expect(screen.getByRole("link", { name: /ver en youtube/i })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=abc12345678"
    );
  });
});
