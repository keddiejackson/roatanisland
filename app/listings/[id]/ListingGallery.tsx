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
      <div className="mt-8 flex h-72 items-center justify-center rounded-2xl bg-[#D8EFEC] text-sm font-semibold text-[#0B3C5D]/70">
        Photos coming soon
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="relative h-[420px] overflow-hidden rounded-2xl bg-[#D8EFEC]">
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
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => setActiveImage(imageUrl)}
              className={`relative h-24 overflow-hidden rounded-xl bg-[#D8EFEC] ring-offset-2 ${
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
  );
}
