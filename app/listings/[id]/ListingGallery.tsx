"use client";

import Image from "next/image";
import { useState } from "react";

type ListingGalleryProps = {
  title: string;
  images: string[];
};

export default function ListingGallery({ title, images }: ListingGalleryProps) {
  const [activeImage, setActiveImage] = useState(images[0] || "");

  if (images.length === 0) {
    return (
      <div className="mt-8 flex h-72 items-center justify-center rounded-lg bg-[#D8EFEC] text-sm font-semibold text-[#0B3C5D]/70">
        Photos coming soon
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]">
        <div className="relative min-h-[320px] overflow-hidden rounded-lg bg-[#D8EFEC] sm:min-h-[460px]">
          <Image
            src={activeImage}
            alt={title}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            unoptimized
            className="object-cover"
          />
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {images.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                aria-label={`Show ${title} photo ${index + 1}`}
                onClick={() => setActiveImage(imageUrl)}
                className={`relative h-24 overflow-hidden rounded-lg bg-[#D8EFEC] ring-offset-2 transition hover:-translate-y-0.5 lg:h-[106px] ${
                  activeImage === imageUrl
                    ? "ring-4 ring-[#00A8A8]"
                    : "ring-1 ring-gray-200"
                }`}
              >
                <Image
                  src={imageUrl}
                  alt={`${title} photo ${index + 1}`}
                  fill
                  sizes="160px"
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
