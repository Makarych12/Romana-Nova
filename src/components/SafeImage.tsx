import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";
export default function SafeImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? (
    <div
      role="img"
      aria-label={`Фото недоступно: ${alt}`}
      className={`${className} image-placeholder`}
    >
      <ImageOff size={30} />
      <span>Фото сейчас недоступно</span>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
