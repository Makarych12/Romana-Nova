import { useState } from "react";
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return failedSrc === src ? (
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
      key={src}
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
}
