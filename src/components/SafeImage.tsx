import { useState } from "react";
import { ImageOff } from "lucide-react";
import photoSizes from "../data/responsive-photos.json";
type PhotoSize = { width: number; height: number; variants: { url: string; width: number; bytes: number }[] };
const sizesBySource: Record<string, PhotoSize> = photoSizes;
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
  const [failedVariant, setFailedVariant] = useState<string | null>(null);
  const photo = sizesBySource[src];
  const variants = photo ? [...new Map(photo.variants.map(v => [v.width, v])).values()] : [];
  const srcSet = failedVariant !== src ? variants.map(v => `${v.url} ${v.width}w`).join(", ") || undefined : undefined;
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
      srcSet={srcSet}
      sizes="(max-width: 760px) 90vw, (max-width: 1200px) 44vw, 360px"
      width={photo?.width}
      height={photo?.height}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => srcSet ? setFailedVariant(src) : setFailedSrc(src)}
    />
  );
}
